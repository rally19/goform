'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import type { UserIdentity } from '@supabase/supabase-js'

export async function updateProfileAction(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Update Supabase Auth Email (will send confirmation depending on settings)
  let authError;
  if (user.email !== email) {
    const { error } = await supabase.auth.updateUser({ email })
    authError = error
  }

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
  return { success: true }
}

export async function uploadAvatarAction(formData: FormData) {
  const file = formData.get('file') as File
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!file) return { error: 'No file provided' }

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
  
  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    current_password: currentPassword || undefined
  })

  if (error) return { error: error.message }

  // Requires re-login
  await supabase.auth.signOut()
  redirect('/login')
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
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/oauth/consent?next=/settings`,
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

  // Delete from drizzle
  await db.delete(users).where(eq(users.id, user.id))

  // Delete from Supabase Auth
  const { error } = await adminClient.auth.admin.deleteUser(user.id)

  if (error) return { error: error.message }

  await supabase.auth.signOut()
  redirect('/login')
}
