import { authorize } from '@/lib/role';
import { dbErrorResponse, getServerDbContext } from '@/lib/supabase-data';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authClient, db } = await getServerDbContext();
    await authorize(authClient, ['view_carometro']);
    const { id: studentId } = await params;

    const { data: student, error } = await db
      .from('students')
      .select('photo_path')
      .eq('id', studentId)
      .single();
    if (error) return dbErrorResponse(error, 'students.photo_path');

    const path = student?.photo_path;
    if (!path) return NextResponse.json({ url: null }, { status: 200 });

    // If stored directly as data URL or external URL, return immediately
    if (path.startsWith('data:image/') || path.startsWith('http://') || path.startsWith('https://')) {
      return NextResponse.json({ url: path });
    }

    const { data: signed, error: signErr } = await db.storage
      .from('student-photos')
      .createSignedUrl(path, 60 * 5);
    if (signErr) return dbErrorResponse(signErr, 'storage.student-photos');

    return NextResponse.json({ url: signed?.signedUrl ?? null });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg === 'Unauthorized' || msg === 'Forbidden') {
      return NextResponse.json({ message: 'Acesso não autorizado.' }, { status: 403 });
    }
    return dbErrorResponse(e, 'students.photo_path');
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authClient, db } = await getServerDbContext();
    await authorize(authClient, ['manage_student_photos']);
    const { id: studentId } = await params;

    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 });

    const fileExt = file.name.split('.').pop();
    const path = `${studentId}.${fileExt}`;

    const { error: uploadErr } = await db.storage
      .from('student-photos')
      .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
    if (uploadErr) return dbErrorResponse(uploadErr, 'storage.student-photos');

    const { error: updErr } = await db
      .from('students')
      .update({ photo_path: path })
      .eq('id', studentId);
    if (updErr) return dbErrorResponse(updErr, 'students.photo_path');

    return NextResponse.json({ message: 'Foto enviada com sucesso.', path });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg === 'Unauthorized' || msg === 'Forbidden') {
      return NextResponse.json({ message: 'Acesso não autorizado.' }, { status: 403 });
    }
    return dbErrorResponse(e, 'students.photo_path');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authClient, db } = await getServerDbContext();
    await authorize(authClient, ['manage_student_photos']);
    const { id: studentId } = await params;

    const { data: student, error } = await db
      .from('students')
      .select('photo_path')
      .eq('id', studentId)
      .single();
    if (error) return dbErrorResponse(error, 'students.photo_path');

    const path = student?.photo_path;
    if (!path) return NextResponse.json({ message: 'Nenhuma foto para excluir.' }, { status: 400 });

    if (!path.startsWith('data:image/') && !path.startsWith('http')) {
      await db.storage.from('student-photos').remove([path]);
    }
    const { error: updErr } = await db
      .from('students')
      .update({ photo_path: null })
      .eq('id', studentId);
    if (updErr) return dbErrorResponse(updErr, 'students.photo_path');

    return NextResponse.json({ message: 'Foto removida com sucesso.' });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg === 'Unauthorized' || msg === 'Forbidden') {
      return NextResponse.json({ message: 'Acesso não autorizado.' }, { status: 403 });
    }
    return dbErrorResponse(e, 'students.photo_path');
  }
}
