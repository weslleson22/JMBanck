import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';
import type { ClassRecord } from '@/lib/school-types';

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

export async function GET() {
  try {
    const db = await readSchoolStructureDb();
    return NextResponse.json(db.classes);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao carregar turmas' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    try {
      await authorize(supabase, ['manage_classes']);
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

    const newClass: ClassRecord = {
      id: `turma-${Date.now()}`,
      name: parsed.data.name,
      grade_level_id: parsed.data.grade_level_id,
      school_id: parsed.data.school_id,
      shift: parsed.data.shift,
      academic_year: parsed.data.academic_year,
      room: parsed.data.room || undefined,
      capacity: parsed.data.capacity,
      status: parsed.data.status,
      created_at: new Date().toISOString(),
    };

    try {
      const { data } = await supabase
        .from('classes')
        .insert({
          name: newClass.name,
          grade_level_id: newClass.grade_level_id,
          school_id: newClass.school_id,
        })
        .select()
        .single();
      if (data?.id) newClass.id = data.id;
    } catch {
      // Persisted in JSON DB
    }

    const db = await readSchoolStructureDb();
    db.classes = [newClass, ...db.classes];
    await writeSchoolStructureDb(db);

    return NextResponse.json(newClass, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Erro ao criar turma' }, { status: 500 });
  }
}
