import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';
import type { TeacherRecord } from '@/lib/school-types';

const createTeacherSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do professor'),
  email: z.string().trim().email('Informe um e-mail válido').or(z.literal('')).optional().default(''),
  subject: z.string().trim().min(2, 'Informe a disciplina principal'),
  classes_linked: z.string().trim().optional().default(''),
  school_id: z.string().trim().optional().default(''),
  phone: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export async function GET() {
  try {
    const db = await readSchoolStructureDb();
    return NextResponse.json(db.teachers);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao carregar professores' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    try {
      await authorize(supabase, ['manage_teachers']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para cadastrar professores' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const newTeacher: TeacherRecord = {
      id: `prof-${Date.now()}`,
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      subject: parsed.data.subject,
      classes_linked: parsed.data.classes_linked || 'Sem turma vinculada',
      school_id: parsed.data.school_id || undefined,
      phone: parsed.data.phone || undefined,
      status: parsed.data.status,
      created_at: new Date().toISOString(),
    };

    try {
      const { data } = await supabase
        .from('teachers')
        .insert({ name: newTeacher.name })
        .select()
        .single();
      if (data?.id) newTeacher.id = data.id;
    } catch {
      // Persisted in JSON DB
    }

    const db = await readSchoolStructureDb();
    db.teachers = [newTeacher, ...db.teachers];
    await writeSchoolStructureDb(db);

    return NextResponse.json(newTeacher, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao cadastrar professor' },
      { status: 500 }
    );
  }
}
