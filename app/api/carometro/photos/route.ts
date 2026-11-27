import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      where: { photo_path: { not: null } },
      select: { id: true, photo_path: true, created_at: true },
    });

    const photos: Record<string, { studentId: string; photoDataUrl: string; updatedAt: string }> =
      {};
    for (const row of students) {
      if (row.photo_path) {
        photos[row.id] = {
          studentId: row.id,
          photoDataUrl: row.photo_path,
          updatedAt: row.created_at.toISOString(),
        };
      }
    }

    return NextResponse.json({ photos });
  } catch (e: any) {
    return dbErrorResponse(e, 'fotos do carômetro (students.photo_path)');
  }
}

export async function POST(req: Request) {
  try {
    try {
      await authorize(['manage_student_photos', 'manage_students', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para salvar fotos no carômetro' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { studentId, photoDataUrl } = body as {
      studentId?: string;
      photoDataUrl?: string;
    };

    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json({ message: 'studentId é obrigatório' }, { status: 400 });
    }
    if (!photoDataUrl || typeof photoDataUrl !== 'string' || !photoDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ message: 'Imagem inválida' }, { status: 400 });
    }
    if (photoDataUrl.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'Imagem muito grande. Use uma foto de até 3MB.' },
        { status: 413 }
      );
    }

    await prisma.student.update({
      where: { id: studentId },
      data: { photo_path: photoDataUrl },
    });

    return NextResponse.json({
      ok: true,
      record: {
        studentId,
        photoDataUrl,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'salvamento de foto do carômetro');
  }
}

export async function DELETE(req: Request) {
  try {
    try {
      await authorize(['manage_student_photos', 'manage_students', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para remover fotos do carômetro' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ message: 'studentId é obrigatório' }, { status: 400 });
    }

    await prisma.student.update({
      where: { id: studentId },
      data: { photo_path: null },
    });

    return NextResponse.json({ ok: true, studentId });
  } catch (e: any) {
    return dbErrorResponse(e, 'remoção de foto do carômetro');
  }
}
