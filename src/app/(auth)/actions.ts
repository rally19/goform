'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { db } from '@/db'
import { users, organizationInvites, organizationMembers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { getSiteUrl } from '@/lib/utils'

async function getRedirectUrl(next: string | null, userId?: string) {
  if (!next || !next.startsWith('/')) return '/dashboard';

  // If the next URL is an invitation acceptance link, check if we should skip it
  if (next.includes('/api/accept-invite') && userId) {
    const url = new URL(next, getSiteUrl());
    const token = url.searchParams.get('token');
    
    if (token) {
      // Find the invite to see which org it belongs to
      const invite = await db.query.organizationInvites.findFirst({
        where: eq(organizationInvites.token, token)
      });

      if (invite) {
        // Check if user is already a member
        const member = await db.query.organizationMembers.findFirst({
          where: (items, { and, eq }) => and(
            eq(items.organizationId, invite.organizationId),
            eq(items.userId, userId)
          )
        });

        if (member) {
          return `/organizations/${invite.organizationId}`;
        }
      } else {
        // If invite is gone, maybe they were JUST auto-joined?
        // Let's check if they are a member of ANY org instead of showing an error
        const member = await db.query.organizationMembers.findFirst({
          where: eq(organizationMembers.userId, userId)
        });
        if (member) return `/organizations/${member.organizationId}`;
      }
    }
  }

  return next;
}

export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = formData.get('next') as string | null
  const turnstileToken = formData.get('cf-turnstile-response') as string | null

  // Verify Turnstile
  if (turnstileToken) {
    const secret = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(turnstileToken)}`,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
    const turnstileData = await res.json();
    if (!turnstileData.success) {
      return { error: "Security check failed. Please refresh and try again." };
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  const { data: { user } } = await supabase.auth.getUser();

  // Sync email verified status if confirmed in Supabase
  if (user?.email_confirmed_at) {
    await db.update(users)
      .set({ emailVerifiedAt: new Date(user.email_confirmed_at) })
      .where(eq(users.id, user.id))
  }

  redirect(await getRedirectUrl(next, user?.id))
}

export async function resetPasswordAction(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()
  const siteUrl = getSiteUrl();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { emailVerifiedAt: true }
  });

  if (!dbUser?.emailVerifiedAt) {
    return { error: 'Your email address must be verified before you can reset your password.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/verify?email=${encodeURIComponent(email)}&type=recovery`
  })

  if (error) {
    return { error: error.message }
  }

  redirect(`/verify?email=${encodeURIComponent(email)}&type=recovery`)
}

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const next = formData.get('next') as string | null
  const turnstileToken = formData.get('cf-turnstile-response') as string | null

  // Verify Turnstile
  if (turnstileToken) {
    const secret = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(turnstileToken)}`,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
    const turnstileData = await res.json();
    if (!turnstileData.success) {
      return { error: "Security check failed. Please refresh and try again." };
    }
  }
  
  const supabase = await createClient()

  // Sign up the user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        full_name: name,
      },
      emailRedirectTo: getSiteUrl(),
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      redirect(`/verify?email=${encodeURIComponent(email)}&type=signup&reset=true${next ? `&next=${encodeURIComponent(next)}` : ''}`)
    }
    return { error: error.message }
  }

  // If user object is created, we can store their profile
  if (data.user) {
    // ─── UNVERIFIED OVERWRITE LOGIC ──────────────────────────────────────────
    // Supabase Auth prevents public signUp from updating existing unverified accounts.
    // We use the admin client to force the update if the local DB shows it's unverified.
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, data.user.id),
      columns: { emailVerifiedAt: true }
    });

    if (existingUser && !existingUser.emailVerifiedAt) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        
        // Force update password and metadata
        await adminClient.auth.admin.updateUserById(data.user.id, {
          password,
          user_metadata: { name, full_name: name }
        })

        // Explicitly resend the confirmation to ensure a fresh, valid OTP
        // is generated AFTER the password/metadata updates are finalized.
        await supabase.auth.resend({ type: 'signup', email })
      }
    }

    await db.insert(users).values({
      id: data.user.id,
      email: data.user.email!,
      name: name,
    }).onConflictDoUpdate({
      target: users.id,
      set: { name }
    })

    // Auto-join organizations if there's a pending invite
    const invites = await db.query.organizationInvites.findMany({
      where: eq(organizationInvites.email, email)
    });

    for (const invite of invites) {
      await db.insert(organizationMembers).values({
        organizationId: invite.organizationId,
        userId: data.user.id,
        role: invite.role,
      }).onConflictDoNothing();

      await db.delete(organizationInvites).where(eq(organizationInvites.id, invite.id));
    }
  }

  if (!data.session) {
    // If Supabase confirms email is needed, session will be null
    redirect(`/verify?email=${encodeURIComponent(email)}&type=signup&reset=true${next ? `&next=${encodeURIComponent(next)}` : ''}`)
  }

  revalidatePath('/', 'layout')
  redirect(await getRedirectUrl(next, data.user?.id))
}

export async function verifyOtpAction(formData: FormData) {
  const email = formData.get('email') as string
  const token = formData.get('token') as string
  const type = formData.get('type') as any
  const next = formData.get('next') as string | null

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  
  if (type === 'recovery') {
    return { success: true, redirect: '/reset-password' }
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Sync email verified status upon verification success
    if (user && type === 'signup') {
      await db.update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, user.id))
    }

    return { success: true, redirect: await getRedirectUrl(next, user?.id) }
  }
}

export async function resendOtpAction(email: string, type: 'signup' | 'recovery' | 'magiclink') {
  const supabase = await createClient()

  if (type === 'recovery') {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return { error: error.message }
  } else if (type === 'magiclink') {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.auth.resend({
      type: 'signup', // Explicitly cast to valid type
      email,
    })
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function updatePasswordWithSessionAction(formData: FormData) {
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Optional: Global sign out after password reset for security
  await supabase.auth.signOut({ scope: 'global' })

  return { success: true }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })
  
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getOtpStatusAction(email: string, type: 'signup' | 'recovery' | 'email_change' | 'magiclink' | 'reauthentication') {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return { error: 'Service role key not configured' };

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Resolve UID from our DB first to avoid listUsers pagination limits
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true }
  });

  if (!dbUser) return { error: 'User not found in record' };

  // 2. Fetch specific auth user by ID
  const { data: { user }, error } = await adminClient.auth.admin.getUserById(dbUser.id);
  
  if (error || !user) return { error: error?.message || 'Auth user not found' };

  let sentAt: string | null = null;
  switch (type) {
    case 'signup': 
      sentAt = user.confirmation_sent_at || null; 
      break;
    case 'recovery': 
      sentAt = user.recovery_sent_at || null; 
      break;
    case 'email_change': 
      sentAt = user.email_change_sent_at || null; 
      break;
    case 'magiclink': 
      sentAt = user.confirmation_sent_at || user.last_sign_in_at || null;
      break;
    case 'reauthentication':
      sentAt = (user as any).reauthentication_sent_at || null;
      break;
  }

  return { success: true, sentAt };
}
