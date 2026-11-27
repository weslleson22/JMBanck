import { authorize } from '@/lib/role';
import { dbErrorResponse, getServerDbContext } from '@/lib/supabase-data';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(2, 'Nome do ano letivo é obrigatório'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    await authorize(authClient, ['manage_academic_years']);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Dados inválidos.', error: parsed.error.format() },
        { status: 400 }
      );
    }
    const { data, error } = await db.from('academic_years').insert(parsed.data).select().single();
    if (error) return dbErrorResponse(error, 'academic_years');
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg === 'Unauthorized' || msg === 'Forbidden') {
      return NextResponse.json({ message: 'Acesso não autorizado.' }, { status: 403 });
    }
    return dbErrorResponse(e, 'academic_years');
  }
}

export async function GET() {
  try {
    const { authClient, db } = await getServerDbContext();
    await authorize(authClient, ['manage_academic_years']);
    const { data, error } = await db.from('academic_years').select('*');
    if (error) return dbErrorResponse(error, 'academic_years');
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg === 'Unauthorized' || msg === 'Forbidden') {
      return NextResponse.json({ message: 'Acesso não autorizado.' }, { status: 403 });
    }
    return dbErrorResponse(e, 'academic_years');
  }
}
