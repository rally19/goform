import { createBrowserClient } from '@supabase/ssr'

const globalForSupabase = globalThis as unknown as {
  __supabase_browser_client__: ReturnType<typeof createBrowserClient> | undefined
}

export function createClient() {
  // Always return a fresh client on the server
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }

  // Reuse the existing client on the browser
  if (!globalForSupabase.__supabase_browser_client__) {
    globalForSupabase.__supabase_browser_client__ = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          // We can optionally disable navigator.locks if the "stolen lock" error persists,
          // but better to fix the concurrency at the call site (UserAccountWidget).
        }
      }
    )
  }

  return globalForSupabase.__supabase_browser_client__
}
