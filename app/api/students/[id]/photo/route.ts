import { supabaseServer } from '@/lib/supabase';
import { authorize } from '@/lib/role';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    await authorize(supabase, ['view_carometro']);
    const { id: studentId } = await params;

    const { data: student, error } = await supabase
      .from('students')
      .select('photo_path')
      .eq('id', studentId)
      .single();
    if (error) return NextResponse.json({ url: null }, { status: 200 });

    const path = student?.photo_path;
    if (!path) return NextResponse.json({ url: null }, { status: 200 });

    const { data: signed, error: signErr } = await supabase.storage
      .from('student-photos')
      .createSignedUrl(path, 60 * 5);
    if (signErr) return NextResponse.json({ url: null }, { status: 200 });

    return NextResponse.json({ url: signed?.signedUrl ?? null });
  } catch {
    return NextResponse.json({ url: null }, { status: 200 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    await authorize(supabase, ['manage_student_photos']);
    const { id: studentId } = await params;

    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });

    const fileExt = file.name.split('.').pop();
    const path = `${studentId}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from('student-photos')
      .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
    if (uploadErr) return NextResponse.json({ message: uploadErr.message }, { status: 500 });

    const { error: updErr } = await supabase
      .from('students')
      .update({ photo_path: path })
      .eq('id', studentId);
    if (updErr) return NextResponse.json({ message: updErr.message }, { status: 500 });

    return NextResponse.json({ message: 'Photo uploaded', path });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Error' }, { status: 403 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    await authorize(supabase, ['manage_student_photos']);
    const { id: studentId } = await params;

    const { data: student, error } = await supabase
      .from('students')
      .select('photo_path')
      .eq('id', studentId)
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 404 });

    const path = student?.photo_path;
    if (!path) return NextResponse.json({ message: 'No photo to delete' }, { status: 400 });

    await supabase.storage.from('student-photos').remove([path]);
    await supabase.from('students').update({ photo_path: null }).eq('id', studentId);

    return NextResponse.json({ message: 'Photo deleted' });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Error' }, { status: 403 });
  }
}
