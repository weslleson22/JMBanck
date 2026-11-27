import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkDatabaseHealth } from '@/lib/db-health';
import { formatDbError, getServerDbContext } from '@/lib/supabase-data';
import { SERVER_ROLE_HOME_PATH, SERVER_ROLE_LABELS } from '@/lib/users-db';
import type { Role } from '@/lib/role';

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});

export async function POST(req: Request) {
  try {
    // 1. Always validate environment variables and real database connectivity BEFORE login
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

    const { authClient, db } = await getServerDbContext();

    // 2. Authenticate strictly against Supabase Auth
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      const msg = (authError?.message ?? '').toLowerCase();
      if (
        msg.includes('fetch failed') ||
        msg.includes('invalid api key') ||
        msg.includes('enotfound') ||
        msg.includes('network')
      ) {
        const formatted = formatDbError(authError, 'autenticação no banco de dados');
        return NextResponse.json(
          {
            code: formatted.code,
            message: formatted.message,
            hint: formatted.hint,
          },
          { status: 503 }
        );
      }

      if (msg.includes('banned')) {
        return NextResponse.json(
          {
            code: 'USER_BLOCKED',
            message: 'Acesso bloqueado pelo administrador. Procure a secretaria escolar.',
          },
          { status: 403 }
        );
      }

      if (msg.includes('email not confirmed')) {
        return NextResponse.json(
          {
            code: 'EMAIL_NOT_CONFIRMED',
            message: 'Seu e-mail ainda não foi confirmado no Supabase Auth.',
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          code: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha incorretos no banco de dados.',
        },
        { status: 401 }
      );
    }

    const authUser = authData.user;

    // 3. Load real profile & role from Supabase `users` table
    let profile: any = null;
    const byAuthUid = await db
      .from('users')
      .select('*')
      .eq('auth_uid', authUser.id)
      .maybeSingle();

    if (!byAuthUid.error && byAuthUid.data) {
      profile = byAuthUid.data;
    } else {
      const byEmail = await db
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (!byEmail.error && byEmail.data) {
        profile = byEmail.data;
      }
    }

    // Check if account is blocked/inactive in `users` table
    if (profile?.status === 'blocked' || profile?.status === 'inactive') {
      await authClient.auth.signOut();
      return NextResponse.json(
        {
          code: 'USER_BLOCKED',
          message: 'Acesso bloqueado pelo administrador. Procure a secretaria escolar.',
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

    const name =
      profile?.name ??
      authUser.user_metadata?.name ??
      authUser.email?.split('@')[0] ??
      'Usuário';

    const sessionUser = {
      id: profile?.id ?? authUser.id,
      auth_uid: authUser.id,
      email: profile?.email ?? authUser.email ?? email,
      name,
      role,
      roleLabel: SERVER_ROLE_LABELS[role] ?? role,
      dashboardPath: SERVER_ROLE_HOME_PATH[role] ?? '/dashboard',
    };

    const res = NextResponse.json({ user: sessionUser });
    const cookieOpts = {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };
    res.cookies.set('jmbank_role', role, cookieOpts);
    res.cookies.set('jmbank_email', sessionUser.email, cookieOpts);
    res.cookies.set('jmbank_user_id', sessionUser.id, cookieOpts);

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
