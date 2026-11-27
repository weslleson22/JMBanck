import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

interface AdminCountsRow {
  total_schools: number;
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_missions: number;
  total_rewards: number;
  total_balance: number;
  total_earned: number;
  total_spent: number;
}

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

    // Consolidates 7 count/aggregate queries into 1 single SQL query (minimal DB load & connections)
    const [summaryRow] = await prisma.$queryRaw<AdminCountsRow[]>`
      SELECT
        (SELECT COUNT(*)::int FROM public.schools) AS total_schools,
        (SELECT COUNT(*)::int FROM public.students) AS total_students,
        (SELECT COUNT(*)::int FROM public.teachers) AS total_teachers,
        (SELECT COUNT(*)::int FROM public.classes) AS total_classes,
        (SELECT COUNT(*)::int FROM public.missions) AS total_missions,
        (SELECT COUNT(*)::int FROM public.rewards) AS total_rewards,
        COALESCE((SELECT SUM(balance)::float8 FROM public.wallets), 0) AS total_balance,
        COALESCE((SELECT SUM(total_earned)::float8 FROM public.wallets), 0) AS total_earned,
        COALESCE((SELECT SUM(total_spent)::float8 FROM public.wallets), 0) AS total_spent
    `;

    const topClassesRows = await prisma.$queryRaw<
      { name: string; students_count: number; coins: number }[]
    >`
      SELECT
        c.name,
        COUNT(s.id)::int AS students_count,
        COALESCE(SUM(w.balance)::float8, 0) AS coins
      FROM public.classes c
      LEFT JOIN public.students s ON s.class_id = c.id
      LEFT JOIN public.wallets w ON w.student_id = s.id
      GROUP BY c.id, c.name
      ORDER BY coins DESC, students_count DESC
      LIMIT 6
    `;

    return NextResponse.json({
      totalSchools: Number(summaryRow?.total_schools ?? 0),
      totalStudents: Number(summaryRow?.total_students ?? 0),
      totalTeachers: Number(summaryRow?.total_teachers ?? 0),
      totalClasses: Number(summaryRow?.total_classes ?? 0),
      totalCoinsEmitted: Number(summaryRow?.total_earned ?? 0),
      totalCoinsRedeemed: Number(summaryRow?.total_spent ?? 0),
      totalCoinsBalance: Number(summaryRow?.total_balance ?? 0),
      totalMissions: Number(summaryRow?.total_missions ?? 0),
      totalRewards: Number(summaryRow?.total_rewards ?? 0),
      topClasses: topClassesRows.map((row) => ({
        name: row.name,
        studentsCount: Number(row.students_count ?? 0),
        coins: Number(row.coins ?? 0),
      })),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'dashboard administrativo');
  }
}
