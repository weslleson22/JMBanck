import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db-health';
import { formatDbError, getServerDbContext } from '@/lib/supabase-data';
import { SERVER_ROLE_HOME_PATH, SERVER_ROLE_LABELS } from '@/lib/users-db';
import type { Role } from '@/lib/role';

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

    const { authClient, db } = await getServerDbContext();
    const {
      data: { user: authUser },
      error: authErr,
    } = await authClient.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let profile: any = null;
    const byAuthUid = await db
      .from('users')
      .select('*')
      .eq('auth_uid', authUser.id)
      .maybeSingle();

    if (!byAuthUid.error && byAuthUid.data) {
      profile = byAuthUid.data;
    } else if (authUser.email) {
      const byEmail = await db
        .from('users')
        .select('*')
        .eq('email', authUser.email.toLowerCase())
        .maybeSingle();
      if (!byEmail.error && byEmail.data) {
        profile = byEmail.data;
      }
    }

    if (profile?.status === 'blocked' || profile?.status === 'inactive') {
      await authClient.auth.signOut();
      return NextResponse.json(
        {
          authenticated: false,
          code: 'USER_BLOCKED',
          message: 'Acesso bloqueado pelo administrador.',
        },
        { status: 403 }
      );
    }

    const validRoles: Role[] = [
      'super_admin',
      'school_admin',
      'coordinator',
      'teacher',
      'student',
      'guardian',
      'treasury',
    ];
    const candidateRole = (profile?.role ?? authUser.user_metadata?.role ?? 'student') as Role;
    const role: Role = validRoles.includes(candidateRole) ? candidateRole : 'student';

    const user = {
      id: profile?.id ?? authUser.id,
      auth_uid: authUser.id,
      email: profile?.email ?? authUser.email ?? '',
      name:
        profile?.name ??
        authUser.user_metadata?.name ??
        authUser.email?.split('@')[0] ??
        'Usuário',
      role,
      roleLabel: SERVER_ROLE_LABELS[role] ?? role,
      dashboardPath: SERVER_ROLE_HOME_PATH[role] ?? '/dashboard',
    };

    return NextResponse.json({ authenticated: true, user });
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

