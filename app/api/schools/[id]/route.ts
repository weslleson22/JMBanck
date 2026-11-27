import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

const updateSchoolSchema = z.object({
  name: z.string().trim().min(2, 'Nome da escola é obrigatório').optional(),
  code: z.string().trim().optional(),
  city: z.string().trim().optional(),
  academic_year: z.string().trim().min(4, 'Informe o ano letivo').optional(),
  director_name: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

function normalizeSchool(row: any) {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? undefined,
    city: row.city ?? undefined,
    academic_year: row.academic_year ? String(row.academic_year) : '2026',
    director_name: row.director_name ?? undefined,
    status: row.status === 'inactive' ? 'inactive' : 'active',
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
    const found = await prisma.school.findUnique({ where: { id } });
    if (!found) {
      return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 });
    }
    return NextResponse.json(normalizeSchool(found));
  } catch (e: any) {
    return dbErrorResponse(e, 'consulta de escola');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['manage_schools', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar escolas' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.code !== undefined ? { code: parsed.data.code || null } : {}),
        ...(parsed.data.city !== undefined ? { city: parsed.data.city || null } : {}),
        ...(parsed.data.academic_year !== undefined
          ? { academic_year: parsed.data.academic_year }
          : {}),
        ...(parsed.data.director_name !== undefined
          ? { director_name: parsed.data.director_name || null }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      },
    });

    return NextResponse.json(normalizeSchool(updated));
  } catch (e: any) {
    return dbErrorResponse(e, 'atualização de escola');
  }
}

export const PATCH = PUT;

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['manage_schools', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir escolas' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.school.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de escola');
  }
}
