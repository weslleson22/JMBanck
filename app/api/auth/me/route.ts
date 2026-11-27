import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateDatabaseEnv } from '@/lib/env';
import { formatDbError } from '@/lib/prisma-errors';
import { getSessionFromCookies, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import {
  SERVER_ROLE_HOME_PATH,
  SERVER_ROLE_LABELS,
  VALID_ROLES,
  type Role,
} from '@/lib/role';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Validate env vars in-memory (0 DB connections)
    const env = validateDatabaseEnv();
    if (!env.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          code: 'DB_CONNECTION_ERROR',
          message: `Variáveis de ambiente ausentes ou inválidas: ${env.missingRequired.join(', ')}.`,
          hint: 'Configure DATABASE_URL no painel de deploy (ex.: Vercel) e reinicie a aplicação.',
        },
        { status: 503 }
      );
    }

    // 2. Verify signed cookie before touching the database
    const session = await getSessionFromCookies();
    if (!session?.sub) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // 3. Single lightweight query validates BOTH DB connectivity AND live user status/role
    const dbUser = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!dbUser) {
      const res = NextResponse.json({ authenticated: false }, { status: 401 });
      res.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0, httpOnly: true });
      return res;
    }

    if (dbUser.status === 'blocked' || dbUser.status === 'inactive') {
      const res = NextResponse.json(
        {
          authenticated: false,
          code: 'USER_BLOCKED',
          message: 'Acesso bloqueado pelo administrador.',
        },
        { status: 403 }
      );
      res.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0, httpOnly: true });
      return res;
    }

    const role: Role = VALID_ROLES.includes(dbUser.role as Role)
      ? (dbUser.role as Role)
      : 'student';

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role,
        roleLabel: SERVER_ROLE_LABELS[role] ?? role,
        dashboardPath: SERVER_ROLE_HOME_PATH[role] ?? '/dashboard',
      },
    });
  } catch (e: any) {
    const formatted = formatDbError(e, 'verificação de sessão');
    return NextResponse.json(
      {
        authenticated: false,
        code: formatted.httpStatus === 503 ? 'DB_CONNECTION_ERROR' : formatted.code,
        message: formatted.message,
        hint: formatted.hint,
      },
      { status: formatted.httpStatus }
    );
  }
}
