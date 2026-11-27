import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';
import type { GradeLevelRecord } from '@/lib/school-types';

const createGradeLevelSchema = z.object({
  name: z.string().trim().min(2, 'Nome da série é obrigatório'),
  stage: z.string().trim().min(2, 'Selecione a etapa de ensino').default('Ensino Fundamental II'),
  order_index: z.coerce.number().int().min(1, 'Ordem deve ser maior ou igual a 1'),
  description: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export async function GET() {
  try {
    const db = await readSchoolStructureDb();
    const sorted = [...db.gradeLevels].sort((a, b) => a.order_index - b.order_index);
    return NextResponse.json(sorted);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao carregar séries' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    try {
      await authorize(supabase, ['manage_grade_levels']);
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

    const newLevel: GradeLevelRecord = {
      id: `gl-${Date.now()}`,
      name: parsed.data.name,
      stage: parsed.data.stage,
      order_index: parsed.data.order_index,
      description: parsed.data.description || undefined,
      status: parsed.data.status,
      created_at: new Date().toISOString(),
    };

    try {
      const { data } = await supabase
        .from('grade_levels')
        .insert({ name: newLevel.name, order_index: newLevel.order_index })
        .select()
        .single();
      if (data?.id) newLevel.id = data.id;
    } catch {
      // Persisted in JSON DB
    }

    const db = await readSchoolStructureDb();
    db.gradeLevels = [...db.gradeLevels, newLevel].sort((a, b) => a.order_index - b.order_index);
    await writeSchoolStructureDb(db);

    return NextResponse.json(newLevel, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao criar série' },
      { status: 500 }
    );
  }
}
