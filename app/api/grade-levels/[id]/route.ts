import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';

const updateGradeLevelSchema = z.object({
  name: z.string().trim().min(2, 'Nome da série é obrigatório').optional(),
  stage: z.string().trim().min(2).optional(),
  order_index: z.coerce.number().int().min(1).optional(),
  description: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await readSchoolStructureDb();
    const item = db.gradeLevels.find((g) => g.id === id);
    if (!item) {
      return NextResponse.json({ message: 'Série não encontrada' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    try {
      await authorize(supabase, ['manage_grade_levels']);
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

    const db = await readSchoolStructureDb();
    const idx = db.gradeLevels.findIndex((g) => g.id === id);
    if (idx === -1) {
      return NextResponse.json({ message: 'Série não encontrada' }, { status: 404 });
    }

    const updated = {
      ...db.gradeLevels[idx],
      ...parsed.data,
    };
    db.gradeLevels[idx] = updated;
    db.gradeLevels.sort((a, b) => a.order_index - b.order_index);
    await writeSchoolStructureDb(db);

    try {
      await supabase
        .from('grade_levels')
        .update({ name: updated.name, order_index: updated.order_index })
        .eq('id', id);
    } catch {
      // Local DB already saved
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Erro ao atualizar série' }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    try {
      await authorize(supabase, ['manage_grade_levels']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir séries' },
        { status: 403 }
      );
    }

    const db = await readSchoolStructureDb();
    const exists = db.gradeLevels.some((g) => g.id === id);
    if (!exists) {
      return NextResponse.json({ message: 'Série não encontrada' }, { status: 404 });
    }

    db.gradeLevels = db.gradeLevels.filter((g) => g.id !== id);
    await writeSchoolStructureDb(db);

    try {
      await supabase.from('grade_levels').delete().eq('id', id);
    } catch {
      // Local DB already saved
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Erro ao excluir série' }, { status: 500 });
  }
}
