import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize, type Role } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  updateWithSchemaFallback,
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

const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo').optional(),
  email: z.string().trim().email('Informe um e-mail válido').optional(),
  password: z.string().optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'blocked']).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_users', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json({ message: authErr?.message ?? 'Sem permissão' }, { status: 403 });
    }

    const { data, error } = await db.from('users').select('*').eq('id', id).maybeSingle();
    if (error) return dbErrorResponse(error, 'usuário');
    if (!data) return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });

    const role = (data.role ?? 'student') as Role;
    return NextResponse.json({
      id: data.id,
      email: data.email ?? '',
      name: data.name ?? '',
      role,
      roleLabel: SERVER_ROLE_LABELS[role] ?? role,
      status: data.status === 'blocked' || data.status === 'inactive' ? 'blocked' : 'active',
      supabase_uid: data.auth_uid ?? undefined,
      has_password: Boolean(data.auth_uid),
      created_at: data.created_at ?? new Date().toISOString(),
      updated_at: data.updated_at ?? new Date().toISOString(),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'usuário');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authClient, adminClient, db } = await getServerDbContext();
    let callerRole: Role;
    try {
      callerRole = await authorize(authClient, ['manage_users', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar usuários' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { data: current, error: findErr } = await db
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr) return dbErrorResponse(findErr, 'usuário');
    if (!current) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    if (
      callerRole !== 'super_admin' &&
      (current.role === 'super_admin' || parsed.data.role === 'super_admin')
    ) {
      return NextResponse.json(
        { message: 'Apenas Super Administradores podem alterar contas de Super Administrador.' },
        { status: 403 }
      );
    }

    const trimmedPassword = (parsed.data.password ?? '').trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      return NextResponse.json(
        { message: 'A nova senha deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    const nextEmail = parsed.data.email ? parsed.data.email.toLowerCase() : current.email;
    const nextName = parsed.data.name ?? current.name;
    const nextRole = (parsed.data.role ?? current.role ?? 'student') as Role;
    const nextStatus = parsed.data.status ?? (current.status === 'blocked' ? 'blocked' : 'active');

    if (trimmedPassword && !adminClient) {
      return NextResponse.json(
        {
          message:
            'A variável SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor. Configure-a para alterar senhas no Supabase Auth.',
          code: 'MISSING_SERVICE_ROLE_KEY',
        },
        { status: 400 }
      );
    }

    let authUid: string | undefined = current.auth_uid ?? undefined;

    if (adminClient) {
      if (authUid) {
        const { error: authUpdErr } = await adminClient.auth.admin.updateUserById(authUid, {
          ...(nextEmail ? { email: nextEmail } : {}),
          ...(trimmedPassword ? { password: trimmedPassword } : {}),
          ban_duration: nextStatus === 'blocked' ? '876000h' : 'none',
          user_metadata: { name: nextName, role: nextRole },
        });
        if (authUpdErr) {
          return NextResponse.json({ message: authUpdErr.message }, { status: 400 });
        }
      } else if (trimmedPassword && nextEmail) {
        const { data: createdAuth, error: authCreateErr } =
          await adminClient.auth.admin.createUser({
            email: nextEmail,
            password: trimmedPassword,
            email_confirm: true,
            user_metadata: { name: nextName, role: nextRole },
          });
        if (authCreateErr || !createdAuth?.user) {
          return NextResponse.json(
            { message: authCreateErr?.message ?? 'Erro ao criar conta no Supabase Auth.' },
            { status: 400 }
          );
        }
        authUid = createdAuth.user.id;
      }
    }

    const corePayload: Record<string, any> = {
      name: nextName,
      email: nextEmail,
      role: nextRole,
      ...(authUid ? { auth_uid: authUid } : {}),
    };
    const fullPayload = { ...corePayload, status: nextStatus };

    const { data: updated, error: updErr } = await updateWithSchemaFallback(
      db,
      'users',
      id,
      fullPayload,
      corePayload
    );

    if (updErr) return dbErrorResponse(updErr, 'atualização de usuário');

    return NextResponse.json({
      id: updated?.id ?? id,
      email: updated?.email ?? nextEmail,
      name: updated?.name ?? nextName,
      role: nextRole,
      roleLabel: SERVER_ROLE_LABELS[nextRole] ?? nextRole,
      status: nextStatus,
      supabase_uid: authUid,
      has_password: Boolean(authUid),
      last_login_at: updated?.last_login_at ?? null,
      created_at: current.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'atualização de usuário');
  }
}

export const PATCH = PUT;

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authClient, adminClient, db } = await getServerDbContext();
    let callerRole: Role;
    try {
      callerRole = await authorize(authClient, ['manage_users', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir usuários' },
        { status: 403 }
      );
    }

    const { data: target, error: findErr } = await db
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr) return dbErrorResponse(findErr, 'usuário');
    if (!target) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    if (callerRole !== 'super_admin' && target.role === 'super_admin') {
      return NextResponse.json(
        { message: 'Apenas Super Administradores podem excluir contas de Super Administrador.' },
        { status: 403 }
      );
    }

    const { error: delErr } = await db.from('users').delete().eq('id', id);
    if (delErr) return dbErrorResponse(delErr, 'exclusão de usuário');

    if (target.auth_uid && adminClient) {
      await adminClient.auth.admin.deleteUser(target.auth_uid);
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de usuário');
  }
}
