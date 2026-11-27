import { NextResponse, type NextRequest } from 'next/server';
import { getDatabaseUrl } from './env';
import { SESSION_COOKIE_NAME, verifySessionToken } from './auth-session';
import { canAccessRoute, ROLE_HOME_PATH } from './client';
import type { Role } from './role';

const VALID_ROLES: Role[] = [
  'super_admin',
  'school_admin',
  'coordinator',
  'teacher',
  'student',
  'guardian',
  'treasury',
];

function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')
  );
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // If DATABASE_URL is missing, send user to /login to inspect env diagnostics
  if (!getDatabaseUrl()) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }

  // Server-side RBAC route enforcement using signed session role
  if (VALID_ROLES.includes(session.role) && !canAccessRoute(session.role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME_PATH[session.role] ?? '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
