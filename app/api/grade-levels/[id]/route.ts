import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  updateWithSchemaFallback,
} from '@/lib/supabase-data';

const updateGradeLevelSchema = z.object({
  name: z.string().trim().min(2, 'Nome da série é obrigatório').optional(),
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
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getServerDbContext();
    const { data, error } = await db.from('grade_levels').select('*').eq('id', id).maybeSingle();
    if (error) return dbErrorResponse(error, 'série');
    if (!data) return NextResponse.json({ message: 'Série não encontrada' }, { status: 404 });
    return NextResponse.json(normalizeGradeLevel(data));
  } catch (e: any) {
    return dbErrorResponse(e, 'série');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_grade_levels']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar séries' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateGradeLevelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const corePayload: Record<string, any> = {};
    if (parsed.data.name !== undefined) corePayload.name = parsed.data.name;
    if (parsed.data.order_index !== undefined) corePayload.order_index = parsed.data.order_index;

    const fullPayload: Record<string, any> = {
      ...corePayload,
      ...(parsed.data.stage !== undefined ? { stage: parsed.data.stage } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description || null }
        : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    };

    const { data, error } = await updateWithSchemaFallback(
      db,
      'grade_levels',
      id,
      fullPayload,
      corePayload
    );

    if (error) return dbErrorResponse(error, 'atualização de série');
    if (!data) return NextResponse.json({ message: 'Série não encontrada' }, { status: 404 });
    return NextResponse.json(normalizeGradeLevel(data));
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
    const { id } = await params;
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_grade_levels']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir séries' },
        { status: 403 }
      );
    }

    const { error } = await db.from('grade_levels').delete().eq('id', id);
    if (error) return dbErrorResponse(error, 'exclusão de série');
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de série');
  }
}
