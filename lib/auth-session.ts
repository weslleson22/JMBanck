import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { Role } from './role';

export const SESSION_COOKIE_NAME = 'jmbank_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  exp: number;
}

function getSigningSecret(): string {
  const explicit = process.env.AUTH_SECRET?.trim();
  if (explicit && explicit.length >= 16) return explicit;
  const dbUrl = process.env.DATABASE_URL?.trim() || 'jmbank-fallback-dev-secret';
  return crypto.createHash('sha256').update(`jmbank-session::${dbUrl}`).digest('hex');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function signSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(body)
      .digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!decoded?.sub || !decoded?.role || !decoded?.exp) return null;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(raw);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

