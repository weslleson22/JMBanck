import { supabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  school_id: z.string().uuid(),
  title: z.string().min(2),
  reward_amount: z.coerce.number().int().nonnegative(),
  status: z.enum(['active', 'inactive']).default('active'),
});

type Mission = z.infer<typeof schema>;

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid data', error: parsed.error.format() }, { status: 400 });

  const { data, error } = await supabase.from('missions').insert(parsed.data).select();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data[0]);
}

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });

  const { data, error } = await supabase.from('missions').select('*');
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

