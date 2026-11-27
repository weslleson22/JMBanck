import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let authUser;
    try {
      const res = await authorize(['view_guardian_dashboard', 'view_linked_students']);
      authUser = res.user;
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Acesso não autorizado ao painel do responsável.' },
        { status: 403 }
      );
    }

    const firstName = authUser.name.split(' ')[0] ?? '';
    let student = firstName
      ? await prisma.student.findFirst({
          where: {
            guardian_name: { contains: firstName, mode: 'insensitive' },
          },
          include: {
            classRoom: { select: { name: true } },
            wallet: true,
          },
        })
      : null;

    if (!student) {
      student = await prisma.student.findFirst({
        include: {
          classRoom: { select: { name: true } },
          wallet: true,
        },
        orderBy: { created_at: 'asc' },
      });
    }

    const missions = await prisma.mission.findMany({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      student: student
        ? {
            id: student.id,
            name: student.name,
            enrollment_number: student.enrollment_number,
            class_name: student.classRoom?.name ?? 'Sem turma',
          }
        : null,
      wallet: {
        balance: Number(student?.wallet?.balance ?? 0),
        total_earned: Number(student?.wallet?.total_earned ?? 0),
        total_spent: Number(student?.wallet?.total_spent ?? 0),
      },
      activeMissionsCount: missions.length,
      missions,
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'dashboard do responsável');
  }
}
