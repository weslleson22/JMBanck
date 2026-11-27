import { NextResponse } from 'next/server';
import { authorize } from '@/lib/role';
import { dbErrorResponse, getServerDbContext } from '@/lib/supabase-data';

export const dynamic = 'force-dynamic';

export interface StoredStudentPhoto {
  studentId: string;
  photoDataUrl: string;
  updatedAt: string;
  updatedBy?: string;
}

export async function GET() {
  try {
    const { db } = await getServerDbContext();
    const { data: students, error } = await db
      .from('students')
      .select('id, photo_path')
      .not('photo_path', 'is', null);

    if (error) return dbErrorResponse(error, 'fotos do carômetro (students.photo_path)');

    const photos: Record<string, StoredStudentPhoto> = {};
    for (const s of students ?? []) {
      if (!s.photo_path) continue;
      if (s.photo_path.startsWith('data:image/') || s.photo_path.startsWith('http')) {
        photos[s.id] = {
          studentId: s.id,
          photoDataUrl: s.photo_path,
          updatedAt: new Date().toISOString(),
        };
      } else {
        const { data: signed } = await db.storage
          .from('student-photos')
          .createSignedUrl(s.photo_path, 3600);
        if (signed?.signedUrl) {
          photos[s.id] = {
            studentId: s.id,
            photoDataUrl: signed.signedUrl,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }

    return NextResponse.json({ photos });
  } catch (e: any) {
    return dbErrorResponse(e, 'fotos do carômetro');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_student_photos', 'manage_students']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para alterar fotos de alunos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { studentId, photoDataUrl, updatedBy } = body as {
      studentId?: string;
      photoDataUrl?: string;
      updatedBy?: string;
    };

    if (!studentId || !photoDataUrl) {
      return NextResponse.json(
        { message: 'studentId e photoDataUrl são obrigatórios' },
        { status: 400 }
      );
    }

    const { error } = await db
      .from('students')
      .update({ photo_path: photoDataUrl })
      .eq('id', studentId);

    if (error) return dbErrorResponse(error, 'salvamento da foto no banco');

    return NextResponse.json({
      ok: true,
      photo: {
        studentId,
        photoDataUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy ?? 'Usuário Autorizado',
      },
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'salvamento da foto no banco');
  }
}

export async function DELETE(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_student_photos', 'manage_students']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para remover fotos de alunos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ message: 'studentId é obrigatório' }, { status: 400 });
    }

    const { error } = await db
      .from('students')
      .update({ photo_path: null })
      .eq('id', studentId);

    if (error) return dbErrorResponse(error, 'remoção de foto no banco');

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return dbErrorResponse(e, 'remoção de foto no banco');
  }
}
