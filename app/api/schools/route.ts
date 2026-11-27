import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

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
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : (row.created_at ?? new Date().toISOString()),
  };
}

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(schools.map(normalizeSchool));
  } catch (e: any) {
    return dbErrorResponse(e, 'escolas (schools)');
  }
}

export async function POST(req: Request) {
  try {
    try {
      await authorize(['manage_schools', 'manage_school']);
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

    const created = await prisma.school.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code || null,
        city: parsed.data.city || null,
        academic_year: parsed.data.academic_year,
        director_name: parsed.data.director_name || null,
        status: parsed.data.status,
      },
    });

    return NextResponse.json(normalizeSchool(created), { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de escola');
  }
}
