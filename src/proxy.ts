import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Define public routes that don't require auth or verification
  const isPublicRoute = 
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/verify') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/oauth') ||
    pathname.startsWith('/f/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico')

  if (!isPublicRoute) {
    // 1. If no user, redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      // Keep next param for redirect back after login
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }

    // 2. If user exists but email is not confirmed, redirect to verify
    if (!user.email_confirmed_at) {
      const url = request.nextUrl.clone()
      url.pathname = '/verify'
      url.searchParams.set('email', user.email!)
      url.searchParams.set('type', 'signup')
      return NextResponse.redirect(url)
    }
  }

  // 3. If user is on /verify but is already confirmed, redirect to dashboard
  if (pathname.startsWith('/verify') && user?.email_confirmed_at) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect away from auth routes if already authenticated and verified
  if ((pathname.startsWith('/login') || pathname.startsWith('/register')) && user?.email_confirmed_at) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
