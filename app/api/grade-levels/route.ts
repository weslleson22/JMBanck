import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const createGradeLevelSchema = z.object({
  name: z.string().trim().min(2, 'Nome da série é obrigatório'),
  stage: z.string().trim().min(2, 'Selecione a etapa de ensino').default('Ensino Fundamental II'),
  order_index: z.coerce.number().int().min(1, 'Ordem deve ser maior ou igual a 1'),
  description: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  school_id: z.string().trim().optional(),
});

function normalizeGradeLevel(row: any) {
  return {
    id: row.id,
    name: row.name,
    stage: row.stage ?? 'Ensino Básico',
    order_index: Number(row.order_index ?? 1),
    description: row.description ?? undefined,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    school_id: row.school_id ?? undefined,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : (row.created_at ?? new Date().toISOString()),
  };
}

export async function GET() {
  try {
    const levels = await prisma.gradeLevel.findMany({
      orderBy: { order_index: 'asc' },
    });
    return NextResponse.json(levels.map(normalizeGradeLevel));
  } catch (e: any) {
    return dbErrorResponse(e, 'séries (grade_levels)');
  }
}

export async function POST(req: Request) {
  try {
    try {
      await authorize(['manage_grade_levels']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para cadastrar séries' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createGradeLevelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    let schoolId = parsed.data.school_id || null;
    if (!schoolId) {
      const firstSchool = await prisma.school.findFirst({ select: { id: true } });
      schoolId = firstSchool?.id ?? null;
    }

    const created = await prisma.gradeLevel.create({
      data: {
        school_id: schoolId,
        name: parsed.data.name,
        stage: parsed.data.stage,
        order_index: parsed.data.order_index,
        description: parsed.data.description || null,
        status: parsed.data.status,
      },
    });

    return NextResponse.json(normalizeGradeLevel(created), { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de série');
  }
}
