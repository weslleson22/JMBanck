import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';
import type { StudentRecord } from '@/lib/school-types';

const createStudentSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo do aluno'),
  enrollment_number: z.string().trim().min(1, 'Informe o número da matrícula'),
  class_id: z.string().trim().min(1, 'Selecione a turma'),
  guardian_name: z.string().trim().optional().default(''),
  guardian_contact: z.string().trim().optional().default(''),
  birth_date: z.string().trim().optional().default(''),
  status: z.enum(['active', 'transferred', 'inactive']).optional().default('active'),
  lgpd_consent: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const db = await readSchoolStructureDb();
    const classMap = new Map(db.classes.map((c) => [c.id, c.name]));
    const enriched = db.students.map((s) => ({
      ...s,
      class_name: classMap.get(s.class_id) ?? s.class_name ?? s.class_id,
    }));
    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao carregar alunos' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    try {
      await authorize(supabase, ['manage_students', 'enroll_student']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para matricular alunos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const db = await readSchoolStructureDb();

    const duplicate = db.students.some(
      (s) => s.enrollment_number.toLowerCase() === parsed.data.enrollment_number.toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { message: 'Já existe um aluno cadastrado com este número de matrícula.' },
        { status: 409 }
      );
    }

    const matchedClass = db.classes.find((c) => c.id === parsed.data.class_id);

    const newStudent: StudentRecord = {
      id: `stu-${Date.now()}`,
      name: parsed.data.name,
      enrollment_number: parsed.data.enrollment_number,
      class_id: parsed.data.class_id,
      class_name: matchedClass?.name ?? parsed.data.class_id,
      guardian_name: parsed.data.guardian_name || undefined,
      guardian_contact: parsed.data.guardian_contact || undefined,
      birth_date: parsed.data.birth_date || undefined,
      status: parsed.data.status,
      lgpd_consent: parsed.data.lgpd_consent,
      created_at: new Date().toISOString(),
    };

    try {
      const { data } = await supabase
        .from('students')
        .insert({
          name: newStudent.name,
          enrollment_number: newStudent.enrollment_number,
          class_id: newStudent.class_id,
        })
        .select()
        .single();
      if (data?.id) newStudent.id = data.id;
    } catch {
      // Persisted in JSON DB
    }

    db.students = [newStudent, ...db.students];
    await writeSchoolStructureDb(db);

    return NextResponse.json(newStudent, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao matricular aluno' },
      { status: 500 }
    );
  }
}
