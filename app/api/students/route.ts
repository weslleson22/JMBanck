import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { hashPassword } from '@/lib/auth-session';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const createStudentSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo do aluno'),
  email: z.string().trim().email('Informe um e-mail de acesso válido').or(z.literal('')).optional().default(''),
  enrollment_number: z.string().trim().min(1, 'Informe o número da matrícula'),
  class_id: z.string().trim().min(1, 'Selecione a turma'),
  guardian_name: z.string().trim().optional().default(''),
  guardian_contact: z.string().trim().optional().default(''),
  birth_date: z.string().trim().optional().default(''),
  status: z.enum(['active', 'transferred', 'inactive']).optional().default('active'),
  lgpd_consent: z.boolean().optional().default(true),
  password: z.string().optional().default(''),
  access_status: z.enum(['active', 'blocked']).optional().default('active'),
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

export async function GET() {
  try {
    // Exclui o campo base64 `photo_path` da listagem para evitar duplicação de tráfego
    // (Fast Origin Transfer na Vercel) — as fotos são carregadas com ETag/304 via /api/carometro/photos.
    const students = await prisma.student.findMany({
      select: {
        id: true,
        user_id: true,
        class_id: true,
        name: true,
        email: true,
        enrollment_number: true,
        guardian_name: true,
        guardian_contact: true,
        birth_date: true,
        lgpd_consent: true,
        status: true,
        created_at: true,
        user: {
          select: {
            email: true,
            name: true,
            status: true,
            password_hash: true,
          },
        },
        classRoom: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(students.map(formatStudent));
  } catch (e: any) {
    return dbErrorResponse(e, 'alunos (students)');
  }
}

export async function POST(req: Request) {
  try {
    try {
      await authorize(['manage_students', 'enroll_student']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para matricular alunos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createStudentSchema.safeParse(body);
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
        { message: 'Informe um e-mail de login para definir a senha do aluno.' },
        { status: 400 }
      );
    }
    if (password && password.length < 6) {
      return NextResponse.json(
        { message: 'A senha de acesso deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const matchedClass = await prisma.classRoom.findUnique({
      where: { id: parsed.data.class_id },
      select: { id: true, school_id: true },
    });

    const created = await prisma.$transaction(async (tx) => {
      let userId: string | null = null;

      if (email) {
        const existingUser = await tx.user.findUnique({ where: { email } });
        if (existingUser) {
          const u = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: parsed.data.name,
              role: 'student',
              status: parsed.data.access_status,
              ...(password ? { password_hash: hashPassword(password) } : {}),
              ...(matchedClass?.school_id ? { school_id: matchedClass.school_id } : {}),
            },
          });
          userId = u.id;
        } else {
          const u = await tx.user.create({
            data: {
              email,
              name: parsed.data.name,
              role: 'student',
              status: parsed.data.access_status,
              password_hash: password ? hashPassword(password) : null,
              school_id: matchedClass?.school_id ?? null,
            },
          });
          userId = u.id;
        }
      }

      const stu = await tx.student.create({
        data: {
          user_id: userId,
          class_id: parsed.data.class_id,
          name: parsed.data.name,
          email: email || null,
          enrollment_number: parsed.data.enrollment_number,
          guardian_name: parsed.data.guardian_name || null,
          guardian_contact: parsed.data.guardian_contact || null,
          birth_date: parsed.data.birth_date || null,
          status: parsed.data.status,
          lgpd_consent: parsed.data.lgpd_consent,
        },
        include: {
          user: true,
          classRoom: { select: { id: true, name: true } },
        },
      });

      await tx.wallet.create({
        data: {
          student_id: stu.id,
          balance: 0,
          total_earned: 0,
          total_spent: 0,
        },
      });

      return stu;
    });

    return NextResponse.json(formatStudent(created), { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'matrícula de aluno');
  }
}
