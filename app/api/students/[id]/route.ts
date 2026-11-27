import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
  updateWithSchemaFallback,
} from '@/lib/supabase-data';

const updateStudentSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo do aluno').optional(),
  email: z.string().trim().email('Informe um e-mail de acesso válido').or(z.literal('')).optional(),
  enrollment_number: z.string().trim().min(1, 'Informe o número da matrícula').optional(),
  class_id: z.string().trim().min(1, 'Selecione a turma').optional(),
  guardian_name: z.string().trim().optional(),
  guardian_contact: z.string().trim().optional(),
  birth_date: z.string().trim().optional(),
  status: z.enum(['active', 'transferred', 'inactive']).optional(),
  lgpd_consent: z.boolean().optional(),
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
    const { data: student, error } = await db
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return dbErrorResponse(error, 'aluno');
    if (!student) return NextResponse.json({ message: 'Aluno não encontrado' }, { status: 404 });

    const [{ data: linkedUser }, { data: matchedClass }] = await Promise.all([
      student.user_id
        ? db.from('users').select('*').eq('id', student.user_id).maybeSingle()
        : Promise.resolve({ data: null }),
      student.class_id
        ? db.from('classes').select('id, name').eq('id', student.class_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({
      id: student.id,
      user_id: student.user_id ?? undefined,
      name: student.name ?? linkedUser?.name ?? `Aluno #${student.enrollment_number}`,
      email: linkedUser?.email ?? student.email ?? undefined,
      enrollment_number: student.enrollment_number ?? '',
      class_id: student.class_id ?? '',
      class_name: matchedClass?.name ?? student.class_id,
      guardian_name: student.guardian_name ?? undefined,
      guardian_contact: student.guardian_contact ?? undefined,
      birth_date: student.birth_date ?? undefined,
      status: student.status ?? 'active',
      photo_path: student.photo_path ?? null,
      lgpd_consent: student.lgpd_consent ?? true,
      has_access: Boolean(linkedUser?.auth_uid),
      access_status: !linkedUser?.auth_uid
        ? 'none'
        : linkedUser?.status === 'blocked'
          ? 'blocked'
          : 'active',
      created_at: student.created_at ?? new Date().toISOString(),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'aluno');
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
      await authorize(authClient, ['manage_students', 'transfer_student']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar alunos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { data: currentStudent, error: findErr } = await db
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr) return dbErrorResponse(findErr, 'aluno');
    if (!currentStudent) {
      return NextResponse.json({ message: 'Aluno não encontrado' }, { status: 404 });
    }

    let linkedUser: any = null;
    if (currentStudent.user_id) {
      const { data: u } = await db
        .from('users')
        .select('*')
        .eq('id', currentStudent.user_id)
        .maybeSingle();
      linkedUser = u;
    }

    const nextName =
      parsed.data.name ??
      currentStudent.name ??
      linkedUser?.name ??
      `Aluno #${currentStudent.enrollment_number}`;
    const nextEmail =
      parsed.data.email !== undefined
        ? parsed.data.email.trim().toLowerCase()
        : linkedUser?.email ?? currentStudent.email ?? '';
    const trimmedPassword = (parsed.data.password ?? '').trim();
    const nextAccessStatus = parsed.data.access_status ?? linkedUser?.status ?? 'active';

    if (trimmedPassword && trimmedPassword.length < 6) {
      return NextResponse.json(
        { message: 'A nova senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    let authUid: string | null = linkedUser?.auth_uid ?? null;

    if (trimmedPassword || parsed.data.access_status !== undefined || (nextEmail && authUid)) {
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
            user_metadata: { name: nextName, role: 'student' },
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
              user_metadata: { name: nextName, role: 'student' },
            });
          if (authCreateErr || !createdAuth?.user) {
            return NextResponse.json(
              { message: authCreateErr?.message ?? 'Erro ao criar login do aluno.' },
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

    let nextUserId: string | undefined = linkedUser?.id ?? currentStudent.user_id;
    if (linkedUser) {
      const userCore: Record<string, any> = {
        name: nextName,
        ...(nextEmail ? { email: nextEmail } : {}),
        ...(authUid ? { auth_uid: authUid } : {}),
      };
      await updateWithSchemaFallback(
        db,
        'users',
        linkedUser.id,
        { ...userCore, status: nextAccessStatus },
        userCore
      );
    } else if (authUid && nextEmail) {
      const { data: createdUser } = await insertWithSchemaFallback(
        db,
        'users',
        {
          auth_uid: authUid,
          email: nextEmail,
          name: nextName,
          role: 'student',
          status: nextAccessStatus,
        },
        {
          auth_uid: authUid,
          email: nextEmail,
          name: nextName,
          role: 'student',
        }
      );
      if (createdUser?.id) nextUserId = createdUser.id;
    }

    const nextClassId = parsed.data.class_id ?? currentStudent.class_id;
    const studentCore: Record<string, any> = {
      ...(nextUserId ? { user_id: nextUserId } : {}),
      ...(parsed.data.enrollment_number !== undefined
        ? { enrollment_number: parsed.data.enrollment_number }
        : {}),
      ...(nextClassId ? { class_id: nextClassId } : {}),
    };

    const studentFull: Record<string, any> = {
      ...studentCore,
      name: nextName,
      ...(nextEmail ? { email: nextEmail } : {}),
      ...(parsed.data.guardian_name !== undefined
        ? { guardian_name: parsed.data.guardian_name || null }
        : {}),
      ...(parsed.data.guardian_contact !== undefined
        ? { guardian_contact: parsed.data.guardian_contact || null }
        : {}),
      ...(parsed.data.birth_date !== undefined
        ? { birth_date: parsed.data.birth_date || null }
        : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.lgpd_consent !== undefined ? { lgpd_consent: parsed.data.lgpd_consent } : {}),
    };

    const { data: updatedStudent, error: updErr } = await updateWithSchemaFallback(
      db,
      'students',
      id,
      studentFull,
      studentCore
    );

    if (updErr) return dbErrorResponse(updErr, 'atualização de aluno');

    const { data: matchedClass } = nextClassId
      ? await db.from('classes').select('id, name').eq('id', nextClassId).maybeSingle()
      : { data: null };

    return NextResponse.json({
      id: updatedStudent?.id ?? id,
      user_id: nextUserId,
      name: updatedStudent?.name ?? nextName,
      email: nextEmail || undefined,
      enrollment_number:
        updatedStudent?.enrollment_number ??
        parsed.data.enrollment_number ??
        currentStudent.enrollment_number,
      class_id: nextClassId,
      class_name: matchedClass?.name ?? nextClassId,
      guardian_name:
        updatedStudent?.guardian_name ??
        parsed.data.guardian_name ??
        currentStudent.guardian_name,
      guardian_contact:
        updatedStudent?.guardian_contact ??
        parsed.data.guardian_contact ??
        currentStudent.guardian_contact,
      birth_date:
        updatedStudent?.birth_date ?? parsed.data.birth_date ?? currentStudent.birth_date,
      status: updatedStudent?.status ?? parsed.data.status ?? currentStudent.status ?? 'active',
      photo_path: updatedStudent?.photo_path ?? currentStudent.photo_path ?? null,
      lgpd_consent:
        updatedStudent?.lgpd_consent ?? parsed.data.lgpd_consent ?? currentStudent.lgpd_consent ?? true,
      has_access: Boolean(authUid),
      access_status: !authUid ? 'none' : nextAccessStatus === 'blocked' ? 'blocked' : 'active',
      created_at: currentStudent.created_at ?? new Date().toISOString(),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'atualização de aluno');
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
      await authorize(authClient, ['manage_students']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir alunos' },
        { status: 403 }
      );
    }

    const { data: student } = await db.from('students').select('*').eq('id', id).maybeSingle();
    const { error } = await db.from('students').delete().eq('id', id);
    if (error) return dbErrorResponse(error, 'exclusão de aluno');

    if (student?.user_id) {
      const { data: u } = await db.from('users').select('*').eq('id', student.user_id).maybeSingle();
      if (u?.auth_uid && adminClient) {
        await adminClient.auth.admin.deleteUser(u.auth_uid);
      }
      await db.from('users').delete().eq('id', student.user_id);
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de aluno');
  }
}
