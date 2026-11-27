import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize, type Role } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
} from '@/lib/supabase-data';
import { SERVER_ROLE_LABELS } from '@/lib/users-db';

const ROLES: [Role, ...Role[]] = [
  'super_admin',
  'school_admin',
  'coordinator',
  'teacher',
  'student',
  'guardian',
  'treasury',
];

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo'),
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  role: z.enum(ROLES),
  status: z.enum(['active', 'blocked']).optional().default('active'),
});

export async function GET() {
  try {
    const { authClient, adminClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_users', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para visualizar usuários' },
        { status: 403 }
      );
    }

    const [{ data: users, error: uErr }, { data: teachers }, { data: students }] =
      await Promise.all([
        db.from('users').select('*').order('name', { ascending: true }),
        db.from('teachers').select('id, user_id'),
        db.from('students').select('id, user_id'),
      ]);

    if (uErr) return dbErrorResponse(uErr, 'usuários (users)');

    const authMap = new Map<string, any>();
    if (adminClient) {
      try {
        const { data: authList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        for (const au of authList?.users ?? []) {
          authMap.set(au.id, au);
        }
      } catch {
        // Optional enrichment
      }
    }

    const teacherByUserId = new Map((teachers ?? []).map((t: any) => [t.user_id, t.id]));
    const studentByUserId = new Map((students ?? []).map((s: any) => [s.user_id, s.id]));

    const result = (users ?? []).map((u: any) => {
      const authUser = u.auth_uid ? authMap.get(u.auth_uid) : null;
      const isBanned = Boolean(
        authUser?.banned_until && new Date(authUser.banned_until) > new Date()
      );
      const role = (u.role ?? 'student') as Role;
      const teacherId = teacherByUserId.get(u.id);
      const studentId = studentByUserId.get(u.id);

      return {
        id: u.id,
        email: u.email ?? authUser?.email ?? '',
        name: u.name ?? authUser?.user_metadata?.name ?? 'Usuário',
        role,
        roleLabel: SERVER_ROLE_LABELS[role] ?? role,
        status:
          u.status === 'blocked' || u.status === 'inactive' || isBanned ? 'blocked' : 'active',
        supabase_uid: u.auth_uid ?? undefined,
        has_password: Boolean(u.auth_uid),
        linked_entity_type: teacherId ? 'teacher' : studentId ? 'student' : null,
        linked_entity_id: teacherId ?? studentId ?? null,
        last_login_at: authUser?.last_sign_in_at ?? u.last_login_at ?? null,
        created_at: u.created_at ?? authUser?.created_at ?? new Date().toISOString(),
        updated_at: u.updated_at ?? u.created_at ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return dbErrorResponse(e, 'usuários (users)');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, adminClient, db } = await getServerDbContext();
    let callerRole: Role;
    try {
      callerRole = await authorize(authClient, ['manage_users', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para criar usuários' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    if (callerRole !== 'super_admin' && parsed.data.role === 'super_admin') {
      return NextResponse.json(
        { message: 'Apenas Super Administradores podem criar contas de Super Administrador.' },
        { status: 403 }
      );
    }

    if (!adminClient) {
      return NextResponse.json(
        {
          message:
            'A variável SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor. Configure-a no .env.local ou no painel de deploy para criar usuários no Supabase Auth.',
          code: 'MISSING_SERVICE_ROLE_KEY',
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();

    const { data: createdAuth, error: authErr } = await adminClient.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { name: parsed.data.name, role: parsed.data.role },
    });

    if (authErr || !createdAuth?.user) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Erro ao criar conta no Supabase Auth.' },
        { status: 400 }
      );
    }

    const authUid = createdAuth.user.id;
    if (parsed.data.status === 'blocked') {
      await adminClient.auth.admin.updateUserById(authUid, { ban_duration: '876000h' });
    }

    const { data: firstSchool } = await db.from('schools').select('id').limit(1).maybeSingle();
    const corePayload: Record<string, any> = {
      auth_uid: authUid,
      email,
      name: parsed.data.name,
      role: parsed.data.role,
      ...(firstSchool?.id ? { school_id: firstSchool.id } : {}),
    };
    const fullPayload = { ...corePayload, status: parsed.data.status };

    const { data: createdUser, error: userErr } = await insertWithSchemaFallback(
      db,
      'users',
      fullPayload,
      corePayload
    );

    if (userErr) {
      await adminClient.auth.admin.deleteUser(authUid);
      return dbErrorResponse(userErr, 'criação de perfil do usuário (users)');
    }

    return NextResponse.json(
      {
        id: createdUser.id,
        email: createdUser.email ?? email,
        name: createdUser.name ?? parsed.data.name,
        role: parsed.data.role,
        roleLabel: SERVER_ROLE_LABELS[parsed.data.role] ?? parsed.data.role,
        status: parsed.data.status,
        supabase_uid: authUid,
        has_password: true,
        linked_entity_type: null,
        linked_entity_id: null,
        last_login_at: null,
        created_at: createdUser.created_at ?? new Date().toISOString(),
        updated_at: createdUser.created_at ?? new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de usuário');
  }
}
