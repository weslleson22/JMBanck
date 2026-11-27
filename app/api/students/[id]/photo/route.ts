import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['view_carometro']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Acesso não autorizado.' },
        { status: 403 }
      );
    }

    const { id: studentId } = await params;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { photo_path: true },
    });

    return NextResponse.json({ url: student?.photo_path ?? null });
  } catch (e: any) {
    return dbErrorResponse(e, 'students.photo_path');
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['manage_student_photos']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Acesso não autorizado.' },
        { status: 403 }
      );
    }

    const { id: studentId } = await params;
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

    await prisma.student.update({
      where: { id: studentId },
      data: { photo_path: dataUrl },
    });

    return NextResponse.json({ message: 'Foto enviada com sucesso.', path: dataUrl });
  } catch (e: any) {
    return dbErrorResponse(e, 'students.photo_path');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await authorize(['manage_student_photos']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Acesso não autorizado.' },
        { status: 403 }
      );
    }

    const { id: studentId } = await params;
    await prisma.student.update({
      where: { id: studentId },
      data: { photo_path: null },
    });

    return NextResponse.json({ message: 'Foto removida com sucesso.' });
  } catch (e: any) {
    return dbErrorResponse(e, 'students.photo_path');
  }
}
