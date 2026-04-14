import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const protectedPaths = ['/home', '/order', '/orders', '/profile', '/support', '/track', '/wallet'];
const publicPaths = ['/login', '/register', '/terms', '/privacy'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check for auth token in cookie or zustand-persisted localStorage
  // Since Zustand persists to localStorage (client-side), we check for
  // the auth cookie that we'll set on login. For now, check if the
  // loadnbehold-auth cookie exists as a lightweight server-side guard.
  const authStore = request.cookies.get('loadnbehold-auth');

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !authStore) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
