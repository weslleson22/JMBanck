import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';
import type { SchoolRecord } from '@/lib/school-types';

const createSchoolSchema = z.object({
  name: z.string().trim().min(2, 'Nome da escola é obrigatório'),
  code: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  academic_year: z.string().trim().min(4, 'Informe o ano letivo').default('2026'),
  director_name: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export async function GET() {
  try {
    const db = await readSchoolStructureDb();
    return NextResponse.json(db.schools);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao carregar escolas' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    try {
      await authorize(supabase, ['manage_schools', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para cadastrar escolas' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const newSchool: SchoolRecord = {
      id: `esc-${Date.now()}`,
      name: parsed.data.name,
      code: parsed.data.code || undefined,
      city: parsed.data.city || undefined,
      academic_year: parsed.data.academic_year || '2026',
      director_name: parsed.data.director_name || undefined,
      status: parsed.data.status,
      created_at: new Date().toISOString(),
    };

    try {
      const { data } = await supabase
        .from('schools')
        .insert({ name: newSchool.name })
        .select()
        .single();
      if (data?.id) newSchool.id = data.id;
    } catch {
      // Fallback persisted in server JSON DB
    }

    const db = await readSchoolStructureDb();
    db.schools = [newSchool, ...db.schools];
    await writeSchoolStructureDb(db);

    return NextResponse.json(newSchool, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao criar escola' },
      { status: 500 }
    );
  }
}
