import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/update-password', '/book'];
const AUTH_ROUTES = ['/login', '/forgot-password'];
const ADMIN_ROUTES_PREFIX = '/admin';
const CLIENT_ROUTES_PREFIX = '/client';
const EMPLOYEE_ROUTES_PREFIX = '/employee';
const SALESMAN_ROUTES_PREFIX = '/salesman';

function getDashboardForRole(role: string): string {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin/dashboard';
    case 'employee':
      return '/employee/dashboard';
    case 'salesman':
      return '/salesman/dashboard';
    default:
      return '/client/dashboard';
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If the refresh token is invalid/expired, clear stale auth cookies and redirect to login
  if (authError?.code === 'refresh_token_not_found' || authError?.code === 'session_not_found') {
    const { pathname } = request.nextUrl;
    // Don't redirect if already on a public/auth route
    if (
      !PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) &&
      !pathname.startsWith('/auth/')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      const response = NextResponse.redirect(url);
      // Clear all Supabase auth cookies to stop the error loop
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-')) {
          response.cookies.delete(name);
        }
      });
      return response;
    }
    // On public routes, just clear the cookies without redirecting
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-')) {
        supabaseResponse.cookies.delete(name);
      }
    });
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;

  // Allow auth callback routes to pass through
  if (pathname.startsWith('/auth/')) {
    return supabaseResponse;
  }

  // If user is NOT authenticated
  if (!user) {
    // Allow public/auth routes
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
      return supabaseResponse;
    }
    // Allow the home page
    if (pathname === '/') {
      return supabaseResponse;
    }
    // Redirect to login for all other routes
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // User IS authenticated — get their role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'client';
  const isAdmin = role === 'super_admin' || role === 'admin';
  const dashboard = getDashboardForRole(role);

  // Redirect users who haven't completed onboarding (invited but no password/name set)
  if (profile && !profile.display_name && pathname !== '/onboarding') {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = dashboard;
    return NextResponse.redirect(url);
  }

  // Redirect root to appropriate dashboard
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = dashboard;
    return NextResponse.redirect(url);
  }

  // Protect admin routes — only admin/super_admin
  if (pathname.startsWith(ADMIN_ROUTES_PREFIX) && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = dashboard;
    return NextResponse.redirect(url);
  }

  // Protect client routes — only clients (admins can also access for testing)
  if (pathname.startsWith(CLIENT_ROUTES_PREFIX) && role !== 'client' && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = dashboard;
    return NextResponse.redirect(url);
  }

  // Protect employee routes — only employees (admins can also access)
  if (pathname.startsWith(EMPLOYEE_ROUTES_PREFIX) && role !== 'employee' && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = dashboard;
    return NextResponse.redirect(url);
  }

  // Protect salesman routes — only salesmen (admins can also access)
  if (pathname.startsWith(SALESMAN_ROUTES_PREFIX) && role !== 'salesman' && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = dashboard;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
