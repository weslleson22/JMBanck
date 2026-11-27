import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const createClassSchema = z.object({
  name: z.string().trim().min(2, 'Nome da turma é obrigatório'),
  grade_level_id: z.string().trim().min(1, 'Selecione a série'),
  school_id: z.string().trim().min(1, 'Selecione a escola'),
  shift: z.enum(['Matutino', 'Vespertino', 'Noturno', 'Integral']).default('Matutino'),
  academic_year: z.string().trim().min(4).default('2026'),
  room: z.string().trim().optional().default(''),
  capacity: z.coerce.number().int().min(1).max(200).optional().default(35),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

function normalizeClass(row: any) {
  return {
    id: row.id,
    name: row.name,
    grade_level_id: row.grade_level_id ?? '',
    school_id: row.school_id ?? '',
    shift: row.shift ?? 'Matutino',
    academic_year: row.academic_year ? String(row.academic_year) : '2026',
    room: row.room ?? undefined,
    capacity: row.capacity != null ? Number(row.capacity) : undefined,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : (row.created_at ?? new Date().toISOString()),
  };
}

export async function GET() {
  try {
    const classes = await prisma.classRoom.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(classes.map(normalizeClass));
  } catch (e: any) {
    return dbErrorResponse(e, 'turmas (classes)');
  }
}

export async function POST(req: Request) {
  try {
    try {
      await authorize(['manage_classes']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para cadastrar turmas' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const created = await prisma.classRoom.create({
      data: {
        name: parsed.data.name,
        grade_level_id: parsed.data.grade_level_id,
        school_id: parsed.data.school_id,
        shift: parsed.data.shift,
        academic_year: parsed.data.academic_year,
        room: parsed.data.room || null,
        capacity: parsed.data.capacity,
        status: parsed.data.status,
      },
    });

    return NextResponse.json(normalizeClass(created), { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de turma');
  }
}
