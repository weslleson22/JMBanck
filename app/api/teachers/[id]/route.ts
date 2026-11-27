import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
  updateWithSchemaFallback,
} from '@/lib/supabase-data';

const updateTeacherSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do professor').optional(),
  email: z.string().trim().email('Informe um e-mail válido').or(z.literal('')).optional(),
  subject: z.string().trim().min(2, 'Informe a disciplina principal').optional(),
  classes_linked: z.string().trim().optional(),
  school_id: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string().optional(),
  access_status: z.enum(['active', 'blocked']).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getServerDbContext();
    const { data: teacher, error } = await db
      .from('teachers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return dbErrorResponse(error, 'professor');
    if (!teacher) return NextResponse.json({ message: 'Professor não encontrado' }, { status: 404 });

    let linkedUser: any = null;
    if (teacher.user_id) {
      const { data: u } = await db.from('users').select('*').eq('id', teacher.user_id).maybeSingle();
      linkedUser = u;
    }

    return NextResponse.json({
      id: teacher.id,
      user_id: teacher.user_id ?? undefined,
      name: teacher.name ?? linkedUser?.name ?? 'Professor',
      email: linkedUser?.email ?? teacher.email ?? undefined,
      subject: teacher.subject ?? 'Docente',
      classes_linked: teacher.classes_linked ?? 'Não informado',
      school_id: teacher.school_id ?? linkedUser?.school_id ?? undefined,
      phone: teacher.phone ?? undefined,
      status: teacher.status === 'inactive' ? 'inactive' : 'active',
      has_access: Boolean(linkedUser?.auth_uid),
      access_status: !linkedUser?.auth_uid
        ? 'none'
        : linkedUser?.status === 'blocked'
          ? 'blocked'
          : 'active',
      created_at: teacher.created_at ?? new Date().toISOString(),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'professor');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authClient, adminClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_teachers']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar professores' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { data: currentTeacher, error: findErr } = await db
      .from('teachers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr) return dbErrorResponse(findErr, 'professor');
    if (!currentTeacher) {
      return NextResponse.json({ message: 'Professor não encontrado' }, { status: 404 });
    }

    let linkedUser: any = null;
    if (currentTeacher.user_id) {
      const { data: u } = await db
        .from('users')
        .select('*')
        .eq('id', currentTeacher.user_id)
        .maybeSingle();
      linkedUser = u;
    }

    const nextName = parsed.data.name ?? currentTeacher.name ?? linkedUser?.name ?? 'Professor';
    const nextEmail =
      parsed.data.email !== undefined
        ? parsed.data.email.trim().toLowerCase()
        : linkedUser?.email ?? currentTeacher.email ?? '';
    const trimmedPassword = (parsed.data.password ?? '').trim();
    const nextAccessStatus = parsed.data.access_status ?? linkedUser?.status ?? 'active';

    if (trimmedPassword && trimmedPassword.length < 6) {
      return NextResponse.json(
        { message: 'A nova senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    let authUid: string | null = linkedUser?.auth_uid ?? null;

    if (trimmedPassword || parsed.data.access_status !== undefined || (nextEmail && linkedUser?.auth_uid)) {
      if (trimmedPassword && !adminClient) {
        return NextResponse.json(
          {
            message:
              'A variável SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor. Configure-a para criar ou alterar senhas no Supabase Auth.',
            code: 'MISSING_SERVICE_ROLE_KEY',
          },
          { status: 400 }
        );
      }

      if (adminClient) {
        if (authUid) {
          const { error: authUpdErr } = await adminClient.auth.admin.updateUserById(authUid, {
            ...(nextEmail ? { email: nextEmail } : {}),
            ...(trimmedPassword ? { password: trimmedPassword } : {}),
            ban_duration: nextAccessStatus === 'blocked' ? '876000h' : 'none',
            user_metadata: { name: nextName, role: 'teacher' },
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
              user_metadata: { name: nextName, role: 'teacher' },
            });
          if (authCreateErr || !createdAuth?.user) {
            return NextResponse.json(
              { message: authCreateErr?.message ?? 'Erro ao criar login do professor.' },
              { status: 400 }
            );
          }
          authUid = createdAuth.user.id;
          if (nextAccessStatus === 'blocked') {
            await adminClient.auth.admin.updateUserById(authUid, { ban_duration: '876000h' });
          }
        }
      }
    }

    let nextUserId: string | undefined = linkedUser?.id ?? currentTeacher.user_id;
    if (linkedUser) {
      const userCore: Record<string, any> = {
        name: nextName,
        ...(nextEmail ? { email: nextEmail } : {}),
        ...(authUid ? { auth_uid: authUid } : {}),
      };
      const userFull = { ...userCore, status: nextAccessStatus };
      await updateWithSchemaFallback(db, 'users', linkedUser.id, userFull, userCore);
    } else if (authUid && nextEmail) {
      const { data: createdUser } = await insertWithSchemaFallback(
        db,
        'users',
        {
          auth_uid: authUid,
          email: nextEmail,
          name: nextName,
          role: 'teacher',
          status: nextAccessStatus,
        },
        {
          auth_uid: authUid,
          email: nextEmail,
          name: nextName,
          role: 'teacher',
        }
      );
      if (createdUser?.id) nextUserId = createdUser.id;
    }

    const teacherCore: Record<string, any> = {
      ...(nextUserId ? { user_id: nextUserId } : {}),
    };
    const teacherFull: Record<string, any> = {
      ...teacherCore,
      name: nextName,
      ...(nextEmail ? { email: nextEmail } : {}),
      ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
      ...(parsed.data.classes_linked !== undefined
        ? { classes_linked: parsed.data.classes_linked }
        : {}),
      ...(parsed.data.school_id !== undefined ? { school_id: parsed.data.school_id || null } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    };

    const { data: updatedTeacher, error: updErr } = await updateWithSchemaFallback(
      db,
      'teachers',
      id,
      teacherFull,
      teacherCore
    );

    if (updErr) return dbErrorResponse(updErr, 'atualização de professor');

    return NextResponse.json({
      id: updatedTeacher?.id ?? id,
      user_id: nextUserId,
      name: updatedTeacher?.name ?? nextName,
      email: nextEmail || undefined,
      subject: updatedTeacher?.subject ?? parsed.data.subject ?? currentTeacher.subject ?? 'Docente',
      classes_linked:
        updatedTeacher?.classes_linked ??
        parsed.data.classes_linked ??
        currentTeacher.classes_linked ??
        'Não informado',
      school_id: updatedTeacher?.school_id ?? parsed.data.school_id ?? currentTeacher.school_id,
      phone: updatedTeacher?.phone ?? parsed.data.phone ?? currentTeacher.phone,
      status: updatedTeacher?.status ?? parsed.data.status ?? currentTeacher.status ?? 'active',
      has_access: Boolean(authUid),
      access_status: !authUid ? 'none' : nextAccessStatus === 'blocked' ? 'blocked' : 'active',
      created_at: currentTeacher.created_at ?? new Date().toISOString(),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'atualização de professor');
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
    try {
      await authorize(authClient, ['manage_teachers']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir professores' },
        { status: 403 }
      );
    }

    const { data: teacher } = await db.from('teachers').select('*').eq('id', id).maybeSingle();
    const { error } = await db.from('teachers').delete().eq('id', id);
    if (error) return dbErrorResponse(error, 'exclusão de professor');

    if (teacher?.user_id) {
      const { data: u } = await db.from('users').select('*').eq('id', teacher.user_id).maybeSingle();
      if (u?.auth_uid && adminClient) {
        await adminClient.auth.admin.deleteUser(u.auth_uid);
      }
      await db.from('users').delete().eq('id', teacher.user_id);
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de professor');
  }
}
