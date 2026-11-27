import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      await authorize([
        'view_teacher_dashboard',
        'view_my_classes',
        'view_assigned_classes',
        'manage_school',
      ]);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Acesso não autorizado ao painel docente.' },
        { status: 403 }
      );
    }

    const [totalClasses, totalStudents, missions, walletAgg] = await Promise.all([
      prisma.classRoom.count(),
      prisma.student.count(),
      prisma.mission.findMany({ orderBy: { created_at: 'desc' } }),
      prisma.wallet.aggregate({ _sum: { total_earned: true } }),
    ]);

    const activeMissionsCount = missions.filter((m) => m.status !== 'inactive').length;
    const totalCoinsDistributed = Number(walletAgg._sum.total_earned ?? 0);

    return NextResponse.json({
      totalClasses,
      totalStudents,
      activeMissionsCount,
      totalMissionsCount: missions.length,
      totalCoinsDistributed,
      missions,
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'dashboard do professor');
  }
}
