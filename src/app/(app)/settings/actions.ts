'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { db } from '@/db'
import { users, organizationMembers, organizations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import type { UserIdentity } from '@supabase/supabase-js'
import { getSiteUrl } from '@/lib/utils'

export async function updateProfileAction(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Update Supabase Auth (Email and Name Metadata)
  let authError;
  const updateParams: any = { data: { full_name: name, name: name } }
  if (user.email !== email) {
    updateParams.email = email
  }

  const { error } = await supabase.auth.updateUser(updateParams)
  authError = error

  // Update Drizzle Profile
  try {
    await db.update(users).set({
      name,
      email,
    }).where(eq(users.id, user.id))
  } catch (err: any) {
    return { error: 'Failed to update profile data' }
  }

  if (authError) return { error: authError.message }

  revalidatePath('/settings')
  
  if (user.email !== email) {
    return { success: true, emailChangePending: true, newEmail: email }
  }
  
  return { success: true }
}

export async function verifyEmailChangeAction(formData: FormData) {
  const oldEmail = formData.get('oldEmail') as string
  const newEmail = formData.get('newEmail') as string
  const oldOtp = formData.get('oldOtp') as string
  const newOtp = formData.get('newOtp') as string

  const supabase = await createClient()

  // Verify old email OTP
  const { error: error1 } = await supabase.auth.verifyOtp({
    email: oldEmail,
    token: oldOtp,
    type: 'email_change'
  })

  if (error1) return { error: 'Failed to verify current email code: ' + error1.message }

  // Verify new email OTP
  const { error: error2 } = await supabase.auth.verifyOtp({
    email: newEmail,
    token: newOtp,
    type: 'email_change'
  })

  if (error2) return { error: 'Failed to verify new email code: ' + error2.message }

  // Update drizzle DB assuming success
  await db.update(users).set({
    email: newEmail,
  }).where(eq(users.email, oldEmail))

  revalidatePath('/settings')
  return { success: true }
}

export async function resendEmailChangeOtpAction(newEmail: string) {
  const supabase = await createClient()
  
  // Resending an email change OTP uses the 'email_change' type and the requested new email
  const { error } = await supabase.auth.resend({
    type: 'email_change',
    email: newEmail,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function uploadAvatarAction(formData: FormData) {
  const file = formData.get('file') as File
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!file) return { error: 'No file provided' }
  
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'File size must be less than 2MB.' }
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-${Math.random()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('embersatu')
    .upload(`avatars/${fileName}`, file, { upsert: true })

  if (error) return { error: error.message }

  const { data: publicUrlData } = supabase.storage
    .from('embersatu')
    .getPublicUrl(`avatars/${fileName}`)

  await db.update(users)
    .set({ avatarUrl: publicUrlData.publicUrl })
    .where(eq(users.id, user.id))

  revalidatePath('/settings')
  return { success: true, avatarUrl: publicUrlData.publicUrl }
}

export async function removeAvatarAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await db.update(users).set({ avatarUrl: null }).where(eq(users.id, user.id))

  revalidatePath('/settings')
  return { success: true }
}

export async function updatePasswordAction(formData: FormData) {
  const currentPassword = formData.get('current') as string
  const newPassword = formData.get('new') as string
  const confirmPassword = formData.get('confirm') as string
  const token = formData.get('token') as string
  
  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // If a token is provided, verify it first (inline OTP flow)
  if (token) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: user.email!,
      token,
      type: 'recovery'
    })
    if (verifyError) return { error: 'Invalid or expired code: ' + verifyError.message }
    
    // Once verified, we can update the password without current_password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (updateError) return { error: updateError.message }
  } else {
    // Regular flow requires current_password if present
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword || undefined
    })
    if (updateError) return { error: updateError.message }
  }

  // Store global sign out for security, especially for recovery flows
  await supabase.auth.signOut({ scope: 'global' })
  return { success: true }
}

export async function signOutOthersAction() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut({ scope: 'others' })

  if (error) return { error: error.message }
  
  revalidatePath('/settings')
  return { success: true }
}

export async function resetPasswordFromSettingsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: 'Not authenticated or no email found' }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${getSiteUrl()}/oauth/consent?next=/settings`,
  })

  if (error) return { error: error.message }
  return { success: true }
}



export async function deleteAccountAction() {
  // Using Admin API to delete the user.
  // Warning: Requires service role key to be passed or executed in Edge function.
  // We'll use service_role client specifically for this.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return { error: 'Admin service role key is not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.' }
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Not authenticated' }
  
  // ─── OWNERSHIP SUCCESSION LOGIC ───
  // Find all organizations where this user is the owner
  const ownedOrgs = await db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.userId, user.id),
      eq(organizationMembers.role, "owner")
    )
  });

  for (const membership of ownedOrgs) {
    const orgId = membership.organizationId;
    
    // Check for managers in this organization
    const managers = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.role, "manager")
      )
    });

    if (managers.length > 0) {
      // Pick a random manager and promote them to owner
      const randomManager = managers[Math.floor(Math.random() * managers.length)];
      await db.update(organizationMembers)
        .set({ role: "owner" })
        .where(eq(organizationMembers.id, randomManager.id));
    } else {
      // No manager found, mark the organization for deletion by cron
      await db.update(organizations)
        .set({ ownerDeletedAt: new Date() })
        .where(eq(organizations.id, orgId));
    }
  }

  // Delete from drizzle
  await db.delete(users).where(eq(users.id, user.id))

  // Delete from Supabase Auth
  const { error } = await adminClient.auth.admin.deleteUser(user.id)

  if (error) return { error: error.message }

  await supabase.auth.signOut()
  redirect('/login')
}
