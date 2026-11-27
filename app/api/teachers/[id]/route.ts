import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { hashPassword } from '@/lib/auth-session';
import { dbErrorResponse } from '@/lib/prisma-errors';

const updateTeacherSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email('Informe um e-mail válido').or(z.literal('')).optional(),
  subject: z.string().trim().min(2).optional(),
  classes_linked: z.string().trim().optional(),
  school_id: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string().optional(),
  access_status: z.enum(['active', 'blocked']).optional(),
});

function formatTeacher(t: any) {
  const u = t.user;
  const hasAccess = Boolean(u?.password_hash);
  const isBlocked = u?.status === 'blocked' || u?.status === 'inactive';

  return {
    id: t.id,
    user_id: t.user_id ?? undefined,
    name: t.name ?? u?.name ?? 'Professor',
    email: u?.email ?? t.email ?? undefined,
    subject: t.subject ?? 'Docente',
    classes_linked: t.classes_linked ?? 'Sem turma vinculada',
    school_id: t.school_id ?? u?.school_id ?? undefined,
    phone: t.phone ?? undefined,
    status: t.status === 'inactive' ? 'inactive' : 'active',
    has_access: hasAccess,
    access_status: !hasAccess ? 'none' : isBlocked ? 'blocked' : 'active',
    created_at:
      t.created_at instanceof Date
        ? t.created_at.toISOString()
        : (t.created_at ?? new Date().toISOString()),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const found = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!found) {
      return NextResponse.json({ message: 'Professor não encontrado' }, { status: 404 });
    }
    return NextResponse.json(formatTeacher(found));
  } catch (e: any) {
    return dbErrorResponse(e, 'consulta de professor');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['manage_teachers']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar professores' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const current = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!current) {
      return NextResponse.json({ message: 'Professor não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateTeacherSchema.safeParse(body);
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
        { message: 'Informe um e-mail de login para criar ou alterar a senha do professor.' },
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
            ...(parsed.data.school_id ? { school_id: parsed.data.school_id } : {}),
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
              role: 'teacher',
              status: nextAccessStatus,
              password_hash: trimmedPassword ? hashPassword(trimmedPassword) : null,
              school_id: parsed.data.school_id || current.school_id || null,
            },
          });
          userId = u.id;
        }
      }

      return await tx.teacher.update({
        where: { id },
        data: {
          user_id: userId,
          name: nextName,
          ...(parsed.data.email !== undefined ? { email: nextEmail || null } : {}),
          ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
          ...(parsed.data.classes_linked !== undefined
            ? { classes_linked: parsed.data.classes_linked }
            : {}),
          ...(parsed.data.school_id !== undefined
            ? { school_id: parsed.data.school_id || null }
            : {}),
          ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        },
        include: { user: true },
      });
    });

    return NextResponse.json(formatTeacher(updated));
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
    try {
      await authorize(['manage_teachers']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir professores' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.teacher.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de professor');
  }
}
