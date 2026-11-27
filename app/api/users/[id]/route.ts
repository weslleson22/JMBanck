import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize, SERVER_ROLE_LABELS, VALID_ROLES, type Role } from '@/lib/role';
import { hashPassword } from '@/lib/auth-session';
import { dbErrorResponse } from '@/lib/prisma-errors';

const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo').optional(),
  email: z.string().trim().email('Informe um e-mail válido').optional(),
  role: z
    .enum([
      'super_admin',
      'school_admin',
      'coordinator',
      'teacher',
      'student',
      'guardian',
      'treasury',
    ])
    .optional(),
  status: z.enum(['active', 'blocked']).optional(),
  password: z.string().optional(),
});

function formatPublicUser(u: any) {
  const role: Role = VALID_ROLES.includes(u.role as Role) ? (u.role as Role) : 'student';
  const linkedTeacher = u.teachers?.[0];
  const linkedStudent = u.students?.[0];

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role,
    roleLabel: SERVER_ROLE_LABELS[role] ?? role,
    status: u.status === 'blocked' || u.status === 'inactive' ? 'blocked' : 'active',
    has_password: Boolean(u.password_hash),
    linked_entity_type: linkedTeacher ? 'teacher' : linkedStudent ? 'student' : null,
    linked_entity_id: linkedTeacher?.id ?? linkedStudent?.id ?? null,
    last_login_at: u.last_login_at ? u.last_login_at.toISOString() : null,
    created_at: u.created_at.toISOString(),
    updated_at: u.updated_at.toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['manage_users', 'manage_admins', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para consultar usuários.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const found = await prisma.user.findUnique({
      where: { id },
      include: {
        teachers: { select: { id: true }, take: 1 },
        students: { select: { id: true }, take: 1 },
      },
    });
    if (!found) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(formatPublicUser(found));
  } catch (e: any) {
    return dbErrorResponse(e, 'consulta de usuário');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let callerRole: Role;
    try {
      const auth = await authorize(['manage_users', 'manage_admins', 'manage_school']);
      callerRole = auth.role;
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar usuários.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
        { status: 400 }
      );
    }

    if (
      callerRole !== 'super_admin' &&
      (current.role === 'super_admin' || parsed.data.role === 'super_admin')
    ) {
      return NextResponse.json(
        { message: 'Apenas Super Administradores podem gerenciar contas de Super Administrador.' },
        { status: 403 }
      );
    }

    const trimmedPassword = (parsed.data.password ?? '').trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      return NextResponse.json(
        { message: 'A nova senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.email !== undefined ? { email: parsed.data.email.toLowerCase() } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(trimmedPassword ? { password_hash: hashPassword(trimmedPassword) } : {}),
      },
      include: {
        teachers: { select: { id: true }, take: 1 },
        students: { select: { id: true }, take: 1 },
      },
    });

    return NextResponse.json(formatPublicUser(updated));
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
    let callerRole: Role;
    let callerId: string;
    try {
      const auth = await authorize(['manage_users', 'manage_admins', 'manage_school']);
      callerRole = auth.role;
      callerId = auth.user.id;
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir usuários.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (id === callerId) {
      return NextResponse.json(
        { message: 'Você não pode excluir a própria conta em uso.' },
        { status: 400 }
      );
    }

    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    if (callerRole !== 'super_admin' && current.role === 'super_admin') {
      return NextResponse.json(
        { message: 'Apenas Super Administradores podem excluir um Super Administrador.' },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de usuário');
  }
}
