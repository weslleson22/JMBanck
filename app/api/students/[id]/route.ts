import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { hashPassword } from '@/lib/auth-session';
import { dbErrorResponse } from '@/lib/prisma-errors';

const updateStudentSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email('Informe um e-mail de acesso válido').or(z.literal('')).optional(),
  enrollment_number: z.string().trim().min(1).optional(),
  class_id: z.string().trim().min(1).optional(),
  guardian_name: z.string().trim().optional(),
  guardian_contact: z.string().trim().optional(),
  birth_date: z.string().trim().optional(),
  status: z.enum(['active', 'transferred', 'inactive']).optional(),
  lgpd_consent: z.boolean().optional(),
  photo_path: z.string().nullable().optional(),
  password: z.string().optional(),
  access_status: z.enum(['active', 'blocked']).optional(),
});

function formatStudent(s: any) {
  const u = s.user;
  const hasAccess = Boolean(u?.password_hash);
  const isBlocked = u?.status === 'blocked' || u?.status === 'inactive';

  return {
    id: s.id,
    user_id: s.user_id ?? undefined,
    name: s.name ?? u?.name ?? `Aluno #${s.enrollment_number}`,
    email: u?.email ?? s.email ?? undefined,
    enrollment_number: s.enrollment_number,
    class_id: s.class_id ?? '',
    class_name: s.classRoom?.name ?? s.class_id ?? 'Sem turma',
    guardian_name: s.guardian_name ?? undefined,
    guardian_contact: s.guardian_contact ?? undefined,
    birth_date: s.birth_date ?? undefined,
    status: s.status === 'transferred' || s.status === 'inactive' ? s.status : 'active',
    photo_path: s.photo_path ?? null,
    lgpd_consent: s.lgpd_consent ?? true,
    has_access: hasAccess,
    access_status: !hasAccess ? 'none' : isBlocked ? 'blocked' : 'active',
    created_at:
      s.created_at instanceof Date
        ? s.created_at.toISOString()
        : (s.created_at ?? new Date().toISOString()),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const found = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        classRoom: { select: { id: true, name: true } },
      },
    });
    if (!found) {
      return NextResponse.json({ message: 'Aluno não encontrado' }, { status: 404 });
    }
    return NextResponse.json(formatStudent(found));
  } catch (e: any) {
    return dbErrorResponse(e, 'consulta de aluno');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['manage_students', 'transfer_student', 'enroll_student']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar alunos' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const current = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!current) {
      return NextResponse.json({ message: 'Aluno não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const nextName = parsed.data.name ?? current.name;
    const nextEmail =
      parsed.data.email !== undefined
        ? parsed.data.email.trim().toLowerCase()
        : (current.user?.email ?? current.email ?? '');
    const trimmedPassword = (parsed.data.password ?? '').trim();
    const nextAccessStatus =
      parsed.data.access_status ??
      (current.user?.status === 'blocked' ? 'blocked' : 'active');

    if (trimmedPassword && trimmedPassword.length < 6) {
      return NextResponse.json(
        { message: 'A senha de acesso deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }
    if (trimmedPassword && !nextEmail) {
      return NextResponse.json(
        { message: 'Informe um e-mail de login para criar ou alterar a senha do aluno.' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      let userId = current.user_id;

      if (userId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            name: nextName,
            ...(nextEmail ? { email: nextEmail } : {}),
            status: nextAccessStatus,
            ...(trimmedPassword ? { password_hash: hashPassword(trimmedPassword) } : {}),
          },
        });
      } else if (nextEmail) {
        const existingUser = await tx.user.findUnique({ where: { email: nextEmail } });
        if (existingUser) {
          const u = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: nextName,
              status: nextAccessStatus,
              ...(trimmedPassword ? { password_hash: hashPassword(trimmedPassword) } : {}),
            },
          });
          userId = u.id;
        } else {
          const u = await tx.user.create({
            data: {
              email: nextEmail,
              name: nextName,
              role: 'student',
              status: nextAccessStatus,
              password_hash: trimmedPassword ? hashPassword(trimmedPassword) : null,
            },
          });
          userId = u.id;
        }
      }

      return await tx.student.update({
        where: { id },
        data: {
          user_id: userId,
          name: nextName,
          ...(parsed.data.email !== undefined ? { email: nextEmail || null } : {}),
          ...(parsed.data.enrollment_number !== undefined
            ? { enrollment_number: parsed.data.enrollment_number }
            : {}),
          ...(parsed.data.class_id !== undefined ? { class_id: parsed.data.class_id } : {}),
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
          ...(parsed.data.lgpd_consent !== undefined
            ? { lgpd_consent: parsed.data.lgpd_consent }
            : {}),
          ...(parsed.data.photo_path !== undefined ? { photo_path: parsed.data.photo_path } : {}),
        },
        include: {
          user: true,
          classRoom: { select: { id: true, name: true } },
        },
      });
    });

    return NextResponse.json(formatStudent(updated));
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
    try {
      await authorize(['manage_students']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir alunos' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de aluno');
  }
}
