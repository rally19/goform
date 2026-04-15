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
  
  const supabase = await createClient()

  // Sign up the user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo: getSiteUrl(),
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      redirect(`/verify?email=${encodeURIComponent(email)}&type=signup${next ? `&next=${encodeURIComponent(next)}` : ''}`)
    }
    return { error: error.message }
  }

  // If user object is created, we can store their profile
  if (data.user) {
    await db.insert(users).values({
      id: data.user.id,
      email: data.user.email!,
      name: name,
    }).onConflictDoNothing() 

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
    redirect(`/verify?email=${encodeURIComponent(email)}&type=signup${next ? `&next=${encodeURIComponent(next)}` : ''}`)
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
