import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';

const updateClassSchema = z.object({
  name: z.string().trim().min(2, 'Nome da turma é obrigatório').optional(),
  grade_level_id: z.string().trim().min(1).optional(),
  school_id: z.string().trim().min(1).optional(),
  shift: z.enum(['Matutino', 'Vespertino', 'Noturno', 'Integral']).optional(),
  academic_year: z.string().trim().min(4).optional(),
  room: z.string().trim().optional(),
  capacity: z.coerce.number().int().min(1).max(200).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await readSchoolStructureDb();
    const item = db.classes.find((c) => c.id === id);
    if (!item) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 });
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
      await authorize(supabase, ['manage_classes']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar turmas' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const db = await readSchoolStructureDb();
    const idx = db.classes.findIndex((c) => c.id === id);
    if (idx === -1) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 });
    }

    const updated = {
      ...db.classes[idx],
      ...parsed.data,
    };
    db.classes[idx] = updated;

    // Keep linked students' class_name synchronized when class name changes
    db.students = db.students.map((s) =>
      s.class_id === id ? { ...s, class_name: updated.name } : s
    );

    await writeSchoolStructureDb(db);

    try {
      await supabase
        .from('classes')
        .update({
          name: updated.name,
          grade_level_id: updated.grade_level_id,
          school_id: updated.school_id,
        })
        .eq('id', id);
    } catch {
      // Local DB already saved
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Erro ao atualizar turma' }, { status: 500 });
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
      await authorize(supabase, ['manage_classes']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir turmas' },
        { status: 403 }
      );
    }

    const db = await readSchoolStructureDb();
    const exists = db.classes.some((c) => c.id === id);
    if (!exists) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 });
    }

    db.classes = db.classes.filter((c) => c.id !== id);
    await writeSchoolStructureDb(db);

    try {
      await supabase.from('classes').delete().eq('id', id);
    } catch {
      // Local DB already saved
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Erro ao excluir turma' }, { status: 500 });
  }
}
