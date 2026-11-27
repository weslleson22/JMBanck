import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const expired = {
    path: '/',
    maxAge: 0,
    sameSite: 'lax' as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };
  res.cookies.set(SESSION_COOKIE_NAME, '', expired);
  res.cookies.set('jmbank_role', '', { path: '/', maxAge: 0 });
  res.cookies.set('jmbank_email', '', { path: '/', maxAge: 0 });
  res.cookies.set('jmbank_user_id', '', { path: '/', maxAge: 0 });
  return res;
}
