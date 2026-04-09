'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { db } from '@/db'
import { users } from '@/db/schema'

export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function resetPasswordAction(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    return { error: error.message }
  }

  redirect(`/verify?email=${encodeURIComponent(email)}&type=recovery`)
}

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  
  const supabase = await createClient()

  // Sign up the user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      redirect(`/verify?email=${encodeURIComponent(email)}&type=signup`)
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
  }

  if (!data.session) {
    // If Supabase confirms email is needed, session will be null
    redirect(`/verify?email=${encodeURIComponent(email)}&type=signup`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function verifyOtpAction(formData: FormData) {
  const email = formData.get('email') as string
  const token = formData.get('token') as string
  const type = formData.get('type') as any

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  
  if (type === 'recovery') {
    redirect('/settings')
  } else {
    redirect('/dashboard')
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

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/login')
}
