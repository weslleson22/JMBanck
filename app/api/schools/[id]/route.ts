import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';

const updateSchoolSchema = z.object({
  name: z.string().trim().min(2, 'Nome da escola é obrigatório').optional(),
  code: z.string().trim().optional(),
  city: z.string().trim().optional(),
  academic_year: z.string().trim().min(4, 'Informe o ano letivo').optional(),
  director_name: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await readSchoolStructureDb();
    const school = db.schools.find((s) => s.id === id);
    if (!school) {
      return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 });
    }
    return NextResponse.json(school);
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
      await authorize(supabase, ['manage_schools', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar escolas' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const db = await readSchoolStructureDb();
    const idx = db.schools.findIndex((s) => s.id === id);
    if (idx === -1) {
      return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 });
    }

    const updated = {
      ...db.schools[idx],
      ...parsed.data,
    };
    db.schools[idx] = updated;
    await writeSchoolStructureDb(db);

    try {
      await supabase.from('schools').update({ name: updated.name }).eq('id', id);
    } catch {
      // Local JSON DB already updated
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Erro ao atualizar escola' }, { status: 500 });
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
      await authorize(supabase, ['manage_schools', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir escolas' },
        { status: 403 }
      );
    }

    const db = await readSchoolStructureDb();
    const exists = db.schools.some((s) => s.id === id);
    if (!exists) {
      return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 });
    }

    db.schools = db.schools.filter((s) => s.id !== id);
    await writeSchoolStructureDb(db);

    try {
      await supabase.from('schools').delete().eq('id', id);
    } catch {
      // Local JSON DB already updated
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Erro ao excluir escola' }, { status: 500 });
  }
}
