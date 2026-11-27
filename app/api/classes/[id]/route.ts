import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  updateWithSchemaFallback,
} from '@/lib/supabase-data';

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

function normalizeClass(row: any) {
  return {
    id: row.id,
    name: row.name,
    grade_level_id: row.grade_level_id ?? '',
    school_id: row.school_id ?? '',
    shift: row.shift ?? 'Matutino',
    academic_year: row.academic_year ? String(row.academic_year) : '2026',
    room: row.room ?? undefined,
    capacity: row.capacity != null ? Number(row.capacity) : undefined,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getServerDbContext();
    const { data, error } = await db.from('classes').select('*').eq('id', id).maybeSingle();
    if (error) return dbErrorResponse(error, 'turma');
    if (!data) return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 });
    return NextResponse.json(normalizeClass(data));
  } catch (e: any) {
    return dbErrorResponse(e, 'turma');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_classes']);
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

    const corePayload: Record<string, any> = {};
    if (parsed.data.name !== undefined) corePayload.name = parsed.data.name;
    if (parsed.data.grade_level_id !== undefined)
      corePayload.grade_level_id = parsed.data.grade_level_id;
    if (parsed.data.school_id !== undefined) corePayload.school_id = parsed.data.school_id;

    const fullPayload: Record<string, any> = {
      ...corePayload,
      ...(parsed.data.shift !== undefined ? { shift: parsed.data.shift } : {}),
      ...(parsed.data.academic_year !== undefined
        ? { academic_year: parsed.data.academic_year }
        : {}),
      ...(parsed.data.room !== undefined ? { room: parsed.data.room || null } : {}),
      ...(parsed.data.capacity !== undefined ? { capacity: parsed.data.capacity } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    };

    const { data, error } = await updateWithSchemaFallback(
      db,
      'classes',
      id,
      fullPayload,
      corePayload
    );

    if (error) return dbErrorResponse(error, 'atualização de turma');
    if (!data) return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 });
    return NextResponse.json(normalizeClass(data));
  } catch (e: any) {
    return dbErrorResponse(e, 'atualização de turma');
  }
}

export const PATCH = PUT;

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_classes']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir turmas' },
        { status: 403 }
      );
    }

    const { error } = await db.from('classes').delete().eq('id', id);
    if (error) return dbErrorResponse(error, 'exclusão de turma');
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de turma');
  }
}
