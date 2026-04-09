import { createBrowserClient } from '@supabase/ssr'

const globalForSupabase = globalThis as unknown as {
  __supabase_browser_client__: ReturnType<typeof createBrowserClient> | undefined
}

export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }

  if (!globalForSupabase.__supabase_browser_client__) {
    globalForSupabase.__supabase_browser_client__ = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        }
      }
    )
  }

  return globalForSupabase.__supabase_browser_client__
}
