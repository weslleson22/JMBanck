import { NextResponse } from 'next/server';
import { getServerDbContext } from '@/lib/supabase-data';

export async function POST() {
  try {
    const { authClient } = await getServerDbContext();
    await authClient.auth.signOut();
  } catch {
    // Always clear cookies even if DB is offline
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('jmbank_role', '', { path: '/', maxAge: 0 });
  res.cookies.set('jmbank_email', '', { path: '/', maxAge: 0 });
  res.cookies.set('jmbank_user_id', '', { path: '/', maxAge: 0 });
  return res;
}
