import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
} from '@/lib/supabase-data';

const createSchoolSchema = z.object({
  name: z.string().trim().min(2, 'Nome da escola é obrigatório'),
  code: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  academic_year: z.string().trim().min(4, 'Informe o ano letivo').default('2026'),
  director_name: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

function normalizeSchool(row: any) {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? undefined,
    city: row.city ?? undefined,
    academic_year: row.academic_year ? String(row.academic_year) : '2026',
    director_name: row.director_name ?? undefined,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const { db } = await getServerDbContext();
    const { data, error } = await db
      .from('schools')
      .select('*')
      .order('name', { ascending: true });

    if (error) return dbErrorResponse(error, 'escolas (schools)');
    return NextResponse.json((data ?? []).map(normalizeSchool));
  } catch (e: any) {
    return dbErrorResponse(e, 'escolas (schools)');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_schools', 'manage_school']);
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

    const fullPayload: Record<string, any> = {
      name: parsed.data.name,
      ...(parsed.data.code ? { code: parsed.data.code } : {}),
      ...(parsed.data.city ? { city: parsed.data.city } : {}),
      academic_year: parsed.data.academic_year,
      ...(parsed.data.director_name ? { director_name: parsed.data.director_name } : {}),
      status: parsed.data.status,
    };

    const { data, error } = await insertWithSchemaFallback(db, 'schools', fullPayload, {
      name: parsed.data.name,
    });

    if (error) return dbErrorResponse(error, 'criação de escola');
    return NextResponse.json(normalizeSchool(data), { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de escola');
  }
}
