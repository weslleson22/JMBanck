import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
} from '@/lib/supabase-data';

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

export async function GET() {
  try {
    const { db } = await getServerDbContext();
    const { data, error } = await db
      .from('classes')
      .select('*')
      .order('name', { ascending: true });

    if (error) return dbErrorResponse(error, 'turmas (classes)');
    return NextResponse.json((data ?? []).map(normalizeClass));
  } catch (e: any) {
    return dbErrorResponse(e, 'turmas (classes)');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_classes']);
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

    const corePayload = {
      name: parsed.data.name,
      grade_level_id: parsed.data.grade_level_id,
      school_id: parsed.data.school_id,
    };

    const fullPayload = {
      ...corePayload,
      shift: parsed.data.shift,
      academic_year: parsed.data.academic_year,
      ...(parsed.data.room ? { room: parsed.data.room } : {}),
      capacity: parsed.data.capacity,
      status: parsed.data.status,
    };

    const { data, error } = await insertWithSchemaFallback(
      db,
      'classes',
      fullPayload,
      corePayload
    );

    if (error) return dbErrorResponse(error, 'criação de turma');
    return NextResponse.json(normalizeClass(data), { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de turma');
  }
}
