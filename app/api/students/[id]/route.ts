import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { readSchoolStructureDb, writeSchoolStructureDb } from '@/lib/school-db';

const updateStudentSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo do aluno').optional(),
  enrollment_number: z.string().trim().min(1, 'Informe o número da matrícula').optional(),
  class_id: z.string().trim().min(1, 'Selecione a turma').optional(),
  guardian_name: z.string().trim().optional(),
  guardian_contact: z.string().trim().optional(),
  birth_date: z.string().trim().optional(),
  status: z.enum(['active', 'transferred', 'inactive']).optional(),
  lgpd_consent: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await readSchoolStructureDb();
    const item = db.students.find((s) => s.id === id);
    if (!item) {
      return NextResponse.json({ message: 'Aluno não encontrado' }, { status: 404 });
    }
    const matchedClass = db.classes.find((c) => c.id === item.class_id);
    return NextResponse.json({
      ...item,
      class_name: matchedClass?.name ?? item.class_name ?? item.class_id,
    });
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
      await authorize(supabase, ['manage_students', 'transfer_student']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar alunos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const db = await readSchoolStructureDb();
    const idx = db.students.findIndex((s) => s.id === id);
    if (idx === -1) {
      return NextResponse.json({ message: 'Aluno não encontrado' }, { status: 404 });
    }

    if (parsed.data.enrollment_number) {
      const duplicate = db.students.some(
        (s) =>
          s.id !== id &&
          s.enrollment_number.toLowerCase() === parsed.data.enrollment_number!.toLowerCase()
      );
      if (duplicate) {
        return NextResponse.json(
          { message: 'Já existe outro aluno com este número de matrícula.' },
          { status: 409 }
        );
      }
    }

    const nextClassId = parsed.data.class_id ?? db.students[idx].class_id;
    const matchedClass = db.classes.find((c) => c.id === nextClassId);

    const updated = {
      ...db.students[idx],
      ...parsed.data,
      class_id: nextClassId,
      class_name: matchedClass?.name ?? db.students[idx].class_name ?? nextClassId,
    };
    db.students[idx] = updated;
    await writeSchoolStructureDb(db);

    try {
      await supabase
        .from('students')
        .update({
          name: updated.name,
          enrollment_number: updated.enrollment_number,
          class_id: updated.class_id,
          status: updated.status,
        })
        .eq('id', id);
    } catch {
      // Local DB already updated
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao atualizar aluno' },
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
      await authorize(supabase, ['manage_students']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir alunos' },
        { status: 403 }
      );
    }

    const db = await readSchoolStructureDb();
    const exists = db.students.some((s) => s.id === id);
    if (!exists) {
      return NextResponse.json({ message: 'Aluno não encontrado' }, { status: 404 });
    }

    db.students = db.students.filter((s) => s.id !== id);
    await writeSchoolStructureDb(db);

    try {
      await supabase.from('students').delete().eq('id', id);
    } catch {
      // Local DB already updated
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao excluir aluno' },
      { status: 500 }
    );
  }
}

