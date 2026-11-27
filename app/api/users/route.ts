import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize, SERVER_ROLE_LABELS, VALID_ROLES, type Role } from '@/lib/role';
import { hashPassword } from '@/lib/auth-session';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo'),
  email: z.string().trim().email('Informe um e-mail válido'),
  role: z.enum([
    'super_admin',
    'school_admin',
    'coordinator',
    'teacher',
    'student',
    'guardian',
    'treasury',
  ]),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  status: z.enum(['active', 'blocked']).optional().default('active'),
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

export async function GET() {
  try {
    try {
      await authorize(['manage_users', 'manage_admins', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para listar usuários.' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      include: {
        teachers: { select: { id: true }, take: 1 },
        students: { select: { id: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users.map(formatPublicUser));
  } catch (e: any) {
    return dbErrorResponse(e, 'usuários (users)');
  }
}

export async function POST(req: Request) {
  try {
    let callerRole: Role;
    try {
      const auth = await authorize(['manage_users', 'manage_admins', 'manage_school']);
      callerRole = auth.role;
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para criar usuários.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
        { status: 400 }
      );
    }

    if (callerRole !== 'super_admin' && parsed.data.role === 'super_admin') {
      return NextResponse.json(
        { message: 'Apenas Super Administradores podem criar contas de Super Administrador.' },
        { status: 403 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const firstSchool = await prisma.school.findFirst({ select: { id: true } });

    const created = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        role: parsed.data.role,
        status: parsed.data.status,
        password_hash: hashPassword(parsed.data.password),
        school_id: firstSchool?.id ?? null,
      },
      include: {
        teachers: { select: { id: true }, take: 1 },
        students: { select: { id: true }, take: 1 },
      },
    });

    return NextResponse.json(formatPublicUser(created), { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de usuário');
  }
}
