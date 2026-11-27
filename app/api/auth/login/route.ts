import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkDatabaseHealth } from '@/lib/db-health';
import { formatDbError } from '@/lib/prisma-errors';
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
} from '@/lib/auth-session';
import {
  SERVER_ROLE_HOME_PATH,
  SERVER_ROLE_LABELS,
  VALID_ROLES,
  type Role,
} from '@/lib/role';

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});

export async function POST(req: Request) {
  try {
    // 1. Validate env vars and real PostgreSQL (Prisma) connectivity BEFORE login
    const health = await checkDatabaseHealth();
    if (!health.ok) {
      return NextResponse.json(
        {
          code: 'DB_CONNECTION_ERROR',
          message:
            health.errorMessage ??
            'Não foi possível conectar ao banco de dados. Login bloqueado.',
          hint: health.hint,
          health,
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Credenciais inválidas' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    // 2. Authenticate strictly against Prisma `users` table
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        {
          code: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha incorretos no banco de dados.',
        },
        { status: 401 }
      );
    }

    if (user.status === 'blocked' || user.status === 'inactive') {
      return NextResponse.json(
        {
          code: 'USER_BLOCKED',
          message: 'Acesso bloqueado pelo administrador. Procure a secretaria escolar.',
        },
        { status: 403 }
      );
    }

    const role: Role = VALID_ROLES.includes(user.role as Role) ? (user.role as Role) : 'student';

    // 3. Record last_login_at in PostgreSQL
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      roleLabel: SERVER_ROLE_LABELS[role] ?? role,
      dashboardPath: SERVER_ROLE_HOME_PATH[role] ?? '/dashboard',
    };

    const token = signSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role,
    });

    const res = NextResponse.json({ user: sessionUser });
    res.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return res;
  } catch (e: any) {
    const formatted = formatDbError(e, 'login');
    return NextResponse.json(
      {
        code: formatted.code,
        message: formatted.message,
        hint: formatted.hint,
      },
      { status: formatted.httpStatus }
    );
  }
}
