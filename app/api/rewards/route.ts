import { supabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().nonnegative(),
  category_id: z.string().uuid().optional(),
  image_path: z.string().optional(),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
  const { data, error } = await supabase.from('rewards')
    .insert({
      name: parsed.data.name,
      price: parsed.data.price,
      stock: parsed.data.stock,
      category_id: parsed.data.category_id,
      image_path: parsed.data.image_path,
    })
    .select();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data[0]);
}

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  const { data, error } = await supabase.from('rewards')
    .select('id, name, price, stock, image_path, status');
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

