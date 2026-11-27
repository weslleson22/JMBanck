import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      await authorize(['manage_schools', 'manage_school', 'view_indicators']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Acesso não autorizado ao painel administrativo.' },
        { status: 403 }
      );
    }

    const [
      totalSchools,
      totalStudents,
      totalTeachers,
      totalClasses,
      totalMissions,
      totalRewards,
      walletAgg,
      classesWithStudents,
    ] = await Promise.all([
      prisma.school.count(),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.classRoom.count(),
      prisma.mission.count(),
      prisma.reward.count(),
      prisma.wallet.aggregate({
        _sum: {
          balance: true,
          total_earned: true,
          total_spent: true,
        },
      }),
      prisma.classRoom.findMany({
        include: {
          students: {
            include: {
              wallet: { select: { balance: true } },
            },
          },
        },
      }),
    ]);

    const totalCoinsEmitted = Number(walletAgg._sum.total_earned ?? 0);
    const totalCoinsRedeemed = Number(walletAgg._sum.total_spent ?? 0);
    const totalCoinsBalance = Number(walletAgg._sum.balance ?? 0);

    const topClasses = classesWithStudents
      .map((cls) => ({
        name: cls.name,
        studentsCount: cls.students.length,
        coins: cls.students.reduce((sum, s) => sum + Number(s.wallet?.balance ?? 0), 0),
      }))
      .sort((a, b) => b.coins - a.coins || b.studentsCount - a.studentsCount)
      .slice(0, 6);

    return NextResponse.json({
      totalSchools,
      totalStudents,
      totalTeachers,
      totalClasses,
      totalCoinsEmitted,
      totalCoinsRedeemed,
      totalCoinsBalance,
      totalMissions,
      totalRewards,
      topClasses,
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'dashboard administrativo');
  }
}
