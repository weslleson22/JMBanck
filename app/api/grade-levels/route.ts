import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
} from '@/lib/supabase-data';

const createGradeLevelSchema = z.object({
  name: z.string().trim().min(2, 'Nome da série é obrigatório'),
  stage: z.string().trim().min(2, 'Selecione a etapa de ensino').default('Ensino Fundamental II'),
  order_index: z.coerce.number().int().min(1, 'Ordem deve ser maior ou igual a 1'),
  description: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  school_id: z.string().trim().optional(),
});

function normalizeGradeLevel(row: any) {
  return {
    id: row.id,
    name: row.name,
    stage: row.stage ?? 'Ensino Básico',
    order_index: Number(row.order_index ?? 1),
    description: row.description ?? undefined,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    school_id: row.school_id ?? undefined,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const { db } = await getServerDbContext();
    const { data, error } = await db
      .from('grade_levels')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) return dbErrorResponse(error, 'séries (grade_levels)');
    return NextResponse.json((data ?? []).map(normalizeGradeLevel));
  } catch (e: any) {
    return dbErrorResponse(e, 'séries (grade_levels)');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_grade_levels']);
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

    let schoolId = parsed.data.school_id;
    if (!schoolId) {
      const { data: firstSchool } = await db.from('schools').select('id').limit(1).maybeSingle();
      schoolId = firstSchool?.id;
    }

    const corePayload: Record<string, any> = {
      name: parsed.data.name,
      order_index: parsed.data.order_index,
      ...(schoolId ? { school_id: schoolId } : {}),
    };

    const fullPayload: Record<string, any> = {
      ...corePayload,
      stage: parsed.data.stage,
      ...(parsed.data.description ? { description: parsed.data.description } : {}),
      status: parsed.data.status,
    };

    const { data, error } = await insertWithSchemaFallback(
      db,
      'grade_levels',
      fullPayload,
      corePayload
    );

    if (error) return dbErrorResponse(error, 'criação de série');
    return NextResponse.json(normalizeGradeLevel(data), { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de série');
  }
}
