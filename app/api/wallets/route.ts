import { supabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// A wallet belongs to a student. The logged‑in user must be a student.
const schema = z.object({
  student_id: z.string().uuid(),
  balance: z.number().int().nonnegative(),
  total_earned: z.number().int().nonnegative(),
  total_spent: z.number().int().nonnegative(),
});

type Wallet = z.infer<typeof schema>;

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });

  // Find the student record linked to this auth user
  const { data: student, error: stuErr } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (stuErr) return NextResponse.json({ message: stuErr.message }, { status: 500 });

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('student_id', student.id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid data', error: parsed.error.format() }, { status: 400 });

  // Resolve student_id from auth user if not supplied
  const studentId = parsed.data.student_id ?? (await (async () => {
    const { data: s, error: e } = await supabase.from('students').select('id').eq('user_id', user.id).single();
    if (e) throw e;
    return s.id;
  })());

  const { data, error } = await supabase
    .from('wallets')
    .update(parsed.data)
    .eq('student_id', studentId)
    .select();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

