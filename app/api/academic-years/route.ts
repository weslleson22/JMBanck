import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type AcademicYear = z.infer<typeof schema>;

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  await authorize(supabase, ['manage_academic_years']);
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid data', error: parsed.error.format() }, { status: 400 });
  const { data, error } = await supabase.from('academic_years').insert(parsed.data).select();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data[0]);
}

export async function GET() {
  const supabase = await supabaseServer();
  await authorize(supabase, ['manage_academic_years']);
  const { data, error } = await supabase.from('academic_years').select('*');
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

