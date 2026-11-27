import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  updateWithSchemaFallback,
} from '@/lib/supabase-data';

const updateSchoolSchema = z.object({
  name: z.string().trim().min(2, 'Nome da escola é obrigatório').optional(),
  code: z.string().trim().optional(),
  city: z.string().trim().optional(),
  academic_year: z.string().trim().min(4, 'Informe o ano letivo').optional(),
  director_name: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getServerDbContext();
    const { data, error } = await db.from('schools').select('*').eq('id', id).maybeSingle();
    if (error) return dbErrorResponse(error, 'escola');
    if (!data) return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 });
    return NextResponse.json(normalizeSchool(data));
  } catch (e: any) {
    return dbErrorResponse(e, 'escola');
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
      await authorize(authClient, ['manage_schools', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para editar escolas' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const fullPayload: Record<string, any> = {};
    if (parsed.data.name !== undefined) fullPayload.name = parsed.data.name;
    if (parsed.data.code !== undefined) fullPayload.code = parsed.data.code || null;
    if (parsed.data.city !== undefined) fullPayload.city = parsed.data.city || null;
    if (parsed.data.academic_year !== undefined) fullPayload.academic_year = parsed.data.academic_year;
    if (parsed.data.director_name !== undefined)
      fullPayload.director_name = parsed.data.director_name || null;
    if (parsed.data.status !== undefined) fullPayload.status = parsed.data.status;

    const corePayload: Record<string, any> = {};
    if (parsed.data.name !== undefined) corePayload.name = parsed.data.name;

    const { data, error } = await updateWithSchemaFallback(
      db,
      'schools',
      id,
      fullPayload,
      corePayload
    );

    if (error) return dbErrorResponse(error, 'atualização de escola');
    if (!data) return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 });
    return NextResponse.json(normalizeSchool(data));
  } catch (e: any) {
    return dbErrorResponse(e, 'atualização de escola');
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
      await authorize(authClient, ['manage_schools', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para excluir escolas' },
        { status: 403 }
      );
    }

    const { error } = await db.from('schools').delete().eq('id', id);
    if (error) return dbErrorResponse(error, 'exclusão de escola');
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return dbErrorResponse(e, 'exclusão de escola');
  }
}
