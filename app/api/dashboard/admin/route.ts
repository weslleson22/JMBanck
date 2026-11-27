import { NextResponse } from 'next/server';
import { authorize } from '@/lib/role';
import { dbErrorResponse, getServerDbContext } from '@/lib/supabase-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['view_reports', 'view_indicators', 'manage_school']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para indicadores administrativos' },
        { status: 403 }
      );
    }

    const [
      { count: studentsCount, error: stuErr },
      { count: teachersCount, error: teaErr },
      { count: classesCount, error: clsErr },
      { count: schoolsCount, error: schErr },
      { data: wallets, error: walErr },
      { count: missionsCount, error: misErr },
      { count: rewardsCount, error: rewErr },
      { data: classesData },
      { data: studentsData },
    ] = await Promise.all([
      db.from('students').select('id', { count: 'exact', head: true }),
      db.from('teachers').select('id', { count: 'exact', head: true }),
      db.from('classes').select('id', { count: 'exact', head: true }),
      db.from('schools').select('id', { count: 'exact', head: true }),
      db.from('wallets').select('student_id, balance, total_earned, total_spent'),
      db.from('missions').select('id', { count: 'exact', head: true }),
      db.from('rewards').select('id', { count: 'exact', head: true }),
      db.from('classes').select('id, name'),
      db.from('students').select('id, class_id'),
    ]);

    const firstErr = stuErr || teaErr || clsErr || schErr || walErr || misErr || rewErr;
    if (firstErr) {
      return dbErrorResponse(firstErr, 'indicadores administrativos');
    }

    const totalCoinsEmitted = (wallets ?? []).reduce(
      (sum: number, w: any) => sum + Number(w.total_earned ?? 0),
      0
    );
    const totalCoinsRedeemed = (wallets ?? []).reduce(
      (sum: number, w: any) => sum + Number(w.total_spent ?? 0),
      0
    );

    // Compute real topClasses ranking from actual students & wallets in the database
    const walletByStudent = new Map<string, number>();
    for (const w of wallets ?? []) {
      walletByStudent.set(w.student_id, Number(w.total_earned ?? 0));
    }

    const classTotals = new Map<string, { name: string; coins: number; students: number }>();
    for (const c of classesData ?? []) {
      classTotals.set(c.id, { name: c.name, coins: 0, students: 0 });
    }
    for (const s of studentsData ?? []) {
      const bucket = classTotals.get(s.class_id);
      if (bucket) {
        bucket.students += 1;
        bucket.coins += walletByStudent.get(s.id) ?? 0;
      }
    }

    const topClasses = Array.from(classTotals.values())
      .sort((a, b) => b.coins - a.coins || b.students - a.students)
      .slice(0, 5)
      .map((item) => ({
        name: item.name,
        studentsCount: item.students,
        coins: item.coins,
      }));

    return NextResponse.json({
      totalSchools: schoolsCount ?? 0,
      totalStudents: studentsCount ?? 0,
      totalTeachers: teachersCount ?? 0,
      totalClasses: classesCount ?? 0,
      totalCoinsEmitted,
      totalCoinsRedeemed,
      totalMissions: missionsCount ?? 0,
      totalRewards: rewardsCount ?? 0,
      topClasses,
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'dashboard administrativo');
  }
}
