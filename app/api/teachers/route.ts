import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { hashPassword } from '@/lib/auth-session';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const createTeacherSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do professor'),
  email: z.string().trim().email('Informe um e-mail válido').or(z.literal('')).optional().default(''),
  subject: z.string().trim().min(2, 'Informe a disciplina principal'),
  classes_linked: z.string().trim().optional().default(''),
  school_id: z.string().trim().optional().default(''),
  phone: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  password: z.string().optional().default(''),
  access_status: z.enum(['active', 'blocked']).optional().default('active'),
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

export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({
      include: { user: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(teachers.map(formatTeacher));
  } catch (e: any) {
    return dbErrorResponse(e, 'professores (teachers)');
  }
}

export async function POST(req: Request) {
  try {
    try {
      await authorize(['manage_teachers']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para cadastrar professores' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const email = parsed.data.email?.trim().toLowerCase() || '';
    const password = parsed.data.password?.trim() || '';

    if (password && !email) {
      return NextResponse.json(
        { message: 'Informe um e-mail de login para definir a senha do professor.' },
        { status: 400 }
      );
    }
    if (password && password.length < 6) {
      return NextResponse.json(
        { message: 'A senha de acesso deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    let schoolId = parsed.data.school_id || null;
    if (!schoolId) {
      const firstSchool = await prisma.school.findFirst({ select: { id: true } });
      schoolId = firstSchool?.id ?? null;
    }

    const created = await prisma.$transaction(async (tx) => {
      let userId: string | null = null;

      if (email) {
        const existingUser = await tx.user.findUnique({ where: { email } });
        if (existingUser) {
          const updatedUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: parsed.data.name,
              role: 'teacher',
              status: parsed.data.access_status,
              ...(password ? { password_hash: hashPassword(password) } : {}),
              ...(schoolId ? { school_id: schoolId } : {}),
            },
          });
          userId = updatedUser.id;
        } else {
          const createdUser = await tx.user.create({
            data: {
              email,
              name: parsed.data.name,
              role: 'teacher',
              status: parsed.data.access_status,
              password_hash: password ? hashPassword(password) : null,
              school_id: schoolId,
            },
          });
          userId = createdUser.id;
        }
      }

      return await tx.teacher.create({
        data: {
          user_id: userId,
          school_id: schoolId,
          name: parsed.data.name,
          email: email || null,
          subject: parsed.data.subject,
          classes_linked: parsed.data.classes_linked || 'Sem turma vinculada',
          phone: parsed.data.phone || null,
          status: parsed.data.status,
        },
        include: { user: true },
      });
    });

    return NextResponse.json(formatTeacher(created), { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de professor');
  }
}
