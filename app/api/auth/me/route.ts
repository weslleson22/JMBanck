import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkDatabaseHealth } from '@/lib/db-health';
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
    const health = await checkDatabaseHealth();
    if (!health.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          code: 'DB_CONNECTION_ERROR',
          message: health.errorMessage,
          hint: health.hint,
          health,
        },
        { status: 503 }
      );
    }

    const session = await getSessionFromCookies();
    if (!session?.sub) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.sub },
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
        code: formatted.code,
        message: formatted.message,
        hint: formatted.hint,
      },
      { status: formatted.httpStatus }
    );
  }
}
