import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Stránky, ktoré nevyžadujú autentifikáciu
const publicRoutes = [
  '/login',
  '/auth/register',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/api/health',
  '/api/dashboard/activity'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Ak je to verejná stránka, nechaj prejsť
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Vytvor Supabase klienta pre middleware
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Skontroluj autentifikáciu
  const { data: { user } } = await supabase.auth.getUser()

  // Ak nie je prihlásený, presmeruj na login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Pre admin stránky skontroluj rolu
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Ak je prihlásený, nechaj prejsť
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.).*)',
  ],
}
