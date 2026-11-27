import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';

const updateTeacherSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do professor').optional(),
  email: z.string().trim().email('Informe um e-mail válido').or(z.literal('')).optional(),
  subject: z.string().trim().min(2, 'Informe a disciplina principal').optional(),
  classes_linked: z.string().trim().optional(),
  school_id: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await readSchoolStructureDb();
    const item = db.teachers.find((t) => t.id === id);
    if (!item) {
      return NextResponse.json({ message: 'Professor não encontrado' }, { status: 404 });
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
      await authorize(supabase, ['manage_teachers']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar professores' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const db = await readSchoolStructureDb();
    const idx = db.teachers.findIndex((t) => t.id === id);
    if (idx === -1) {
      return NextResponse.json({ message: 'Professor não encontrado' }, { status: 404 });
    }

    const updated = {
      ...db.teachers[idx],
      ...parsed.data,
      classes_linked: parsed.data.classes_linked ?? db.teachers[idx].classes_linked,
    };
    db.teachers[idx] = updated;
    await writeSchoolStructureDb(db);

    try {
      await supabase.from('teachers').update({ name: updated.name }).eq('id', id);
    } catch {
      // Local DB already updated
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao atualizar professor' },
      { status: 500 }
    );
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
      await authorize(supabase, ['manage_teachers']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir professores' },
        { status: 403 }
      );
    }

    const db = await readSchoolStructureDb();
    const exists = db.teachers.some((t) => t.id === id);
    if (!exists) {
      return NextResponse.json({ message: 'Professor não encontrado' }, { status: 404 });
    }

    db.teachers = db.teachers.filter((t) => t.id !== id);
    await writeSchoolStructureDb(db);

    try {
      await supabase.from('teachers').delete().eq('id', id);
    } catch {
      // Local DB already updated
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao excluir professor' },
      { status: 500 }
    );
  }
}

