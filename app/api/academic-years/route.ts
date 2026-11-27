import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2, 'Nome do ano letivo é obrigatório'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  school_id: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    try {
      await authorize(['manage_academic_years']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Acesso não autorizado.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Dados inválidos.', error: parsed.error.format() },
        { status: 400 }
      );
    }

    const created = await prisma.academicYear.create({
      data: {
        name: parsed.data.name,
        school_id: parsed.data.school_id || null,
        start_date: parsed.data.start_date ? new Date(parsed.data.start_date) : null,
        end_date: parsed.data.end_date ? new Date(parsed.data.end_date) : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'academic_years');
  }
}

export async function GET() {
  try {
    try {
      await authorize(['manage_academic_years']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Acesso não autorizado.' },
        { status: 403 }
      );
    }

    const years = await prisma.academicYear.findMany({ orderBy: { name: 'desc' } });
    return NextResponse.json(years);
  } catch (e: any) {
    return dbErrorResponse(e, 'academic_years');
  }
}
