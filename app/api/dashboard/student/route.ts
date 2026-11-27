import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let authUser;
    try {
      authUser = await getAuthenticatedUser();
    } catch (err: any) {
      return NextResponse.json(
        { message: err?.message ?? 'Conta bloqueada.' },
        { status: 403 }
      );
    }

    if (!authUser) {
      return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
    }

    // Resolve student record linked to the logged-in user (or fallback to first student for super_admin preview)
    let student = await prisma.student.findFirst({
      where: {
        OR: [{ user_id: authUser.id }, { email: authUser.email }],
      },
      include: {
        classRoom: { select: { id: true, name: true } },
        wallet: true,
      },
    });

    if (!student && authUser.role === 'super_admin') {
      student = await prisma.student.findFirst({
        include: {
          classRoom: { select: { id: true, name: true } },
          wallet: true,
        },
        orderBy: { created_at: 'asc' },
      });
    }

    const missions = await prisma.mission.findMany({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
    });

    let rankPosition: number | null = null;
    if (student?.class_id) {
      const peers = await prisma.student.findMany({
        where: { class_id: student.class_id },
        include: { wallet: { select: { balance: true } } },
      });
      const sorted = peers
        .map((p) => ({ id: p.id, balance: Number(p.wallet?.balance ?? 0) }))
        .sort((a, b) => b.balance - a.balance);
      const idx = sorted.findIndex((p) => p.id === student!.id);
      if (idx >= 0) rankPosition = idx + 1;
    }

    return NextResponse.json({
      student: student
        ? {
            id: student.id,
            name: student.name,
            enrollment_number: student.enrollment_number,
            class_id: student.class_id ?? '',
            class_name: student.classRoom?.name ?? 'Sem turma',
          }
        : {
            id: authUser.id,
            name: authUser.name,
            enrollment_number: '',
            class_id: '',
            class_name: 'Sem turma vinculada',
          },
      wallet: {
        id: student?.wallet?.id ?? null,
        balance: Number(student?.wallet?.balance ?? 0),
        total_earned: Number(student?.wallet?.total_earned ?? 0),
        total_spent: Number(student?.wallet?.total_spent ?? 0),
      },
      rankPosition,
      missions,
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'dashboard do aluno');
  }
}
