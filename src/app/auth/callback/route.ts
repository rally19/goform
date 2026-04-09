import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  // OAuth / PKCE code flow (sign-in, sign-up, identity linking, password reset)
  const code        = searchParams.get('code')
  // Email change uses token_hash + type instead of code
  const tokenHash   = searchParams.get('token_hash')
  const type        = searchParams.get('type')
  // Supabase error passthrough
  const errorParam  = searchParams.get('error')
  const errorDesc   = searchParams.get('error_description')
  // Where to send the user after success (for OAuth flows)
  const next        = searchParams.get('next') ?? '/dashboard'

  // ── Error passthrough from Supabase ────────────────────────────────────────
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDesc || errorParam)}`
    )
  }

  const supabase = await createClient()

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv    = process.env.NODE_ENV === 'development'

  const buildRedirect = (path: string) => {
    if (isLocalEnv) return `${origin}${path}`
    if (forwardedHost) return `https://${forwardedHost}${path}`
    return `${origin}${path}`
  }

  // ── Email Change (token_hash flow) ─────────────────────────────────────────
  // Supabase sends token_hash + type=email_change for secure email change links.
  // Both old-email and new-email links come through here.
  if (tokenHash && type === 'email_change') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'email_change',
    })

    if (error) {
      return NextResponse.redirect(
        buildRedirect(`/login?error=${encodeURIComponent(error.message)}`)
      )
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(buildRedirect('/login?error=Could+not+authenticate'))
    }

    // user.new_email is present while only ONE side has been confirmed.
    // It clears to null once BOTH sides confirm, meaning the change is final.
    const pendingNewEmail = (user as Record<string, unknown>).new_email as string | undefined

    if (pendingNewEmail) {
      // First link clicked — other email still pending
      return NextResponse.redirect(buildRedirect('/email-confirm-pending'))
    }

    // ── Both confirmed: finalize the change ───────────────────────────────────

    // 1. Unlink ALL social identities — user must re-link to the new address
    const { data: identityData } = await supabase.auth.getUserIdentities()
    if (identityData?.identities) {
      for (const identity of identityData.identities) {
        if (identity.provider !== 'email') {
          await supabase.auth.unlinkIdentity(identity)
        }
      }
    }

    // 2. Sync the confirmed new email into our Drizzle users table
    await db.update(users)
      .set({ email: user.email! })
      .where(eq(users.id, user.id))

    // 3. Invalidate ALL sessions globally — forces re-login with new email
    await supabase.auth.signOut({ scope: 'global' })

    // 4. Send to login with a success banner
    return NextResponse.redirect(buildRedirect('/login?message=email_changed'))
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── PKCE code flow (OAuth sign-in, identity linking, password reset) ───────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Upsert user row for OAuth sign-ins / account linking callbacks
        await db.insert(users).values({
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
          avatarUrl: user.user_metadata?.avatar_url ?? null,
        }).onConflictDoNothing()
      }

      return NextResponse.redirect(buildRedirect(next))
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  return NextResponse.redirect(buildRedirect('/login?error=Could+not+authenticate'))
}
