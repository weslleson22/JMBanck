import { supabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { count, error } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return NextResponse.json({ status: 'ok', reachable: true, schoolsCount: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ status: 'ok', reachable: false, message: e?.message ?? 'offline' });
  }
}
