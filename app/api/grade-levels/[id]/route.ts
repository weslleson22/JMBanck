import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

const updateGradeLevelSchema = z.object({
  name: z.string().trim().min(2).optional(),
  stage: z.string().trim().min(2).optional(),
  order_index: z.coerce.number().int().min(1).optional(),
  description: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const found = await prisma.gradeLevel.findUnique({ where: { id } });
    if (!found) {
      return NextResponse.json({ message: 'Série não encontrada' }, { status: 404 });
    }
    return NextResponse.json(normalizeGradeLevel(found));
  } catch (e: any) {
    return dbErrorResponse(e, 'consulta de série');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['manage_grade_levels']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar séries' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateGradeLevelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const updated = await prisma.gradeLevel.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.stage !== undefined ? { stage: parsed.data.stage } : {}),
        ...(parsed.data.order_index !== undefined ? { order_index: parsed.data.order_index } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description || null }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      },
    });

    return NextResponse.json(normalizeGradeLevel(updated));
  } catch (e: any) {
    return dbErrorResponse(e, 'atualização de série');
  }
}

export const PATCH = PUT;

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['manage_grade_levels']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir séries' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.gradeLevel.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de série');
  }
}
