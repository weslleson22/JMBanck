import { NextResponse } from 'next/server';
import { authorize } from '@/lib/role';
import { dbErrorResponse, getServerDbContext } from '@/lib/supabase-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['view_teacher_dashboard']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para o painel do professor' },
        { status: 403 }
      );
    }

    const [
      { count: classesCount, error: clsErr },
      { count: studentsCount, error: stuErr },
      { data: missions, error: misErr },
      { data: wallets, error: walErr },
    ] = await Promise.all([
      db.from('classes').select('id', { count: 'exact', head: true }),
      db.from('students').select('id', { count: 'exact', head: true }),
      db.from('missions').select('*'),
      db.from('wallets').select('total_earned'),
    ]);

    const firstErr = clsErr || stuErr || misErr || walErr;
    if (firstErr) {
      return dbErrorResponse(firstErr, 'painel do professor');
    }

    const activeMissionsCount = (missions ?? []).filter(
      (m: any) => !m.status || m.status === 'active'
    ).length;

    const totalCoinsDistributed = (wallets ?? []).reduce(
      (sum: number, w: any) => sum + Number(w.total_earned ?? 0),
      0
    );

    return NextResponse.json({
      totalClasses: classesCount ?? 0,
      totalStudents: studentsCount ?? 0,
      activeMissionsCount,
      totalMissionsCount: (missions ?? []).length,
      totalCoinsDistributed,
      missions: missions ?? [],
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'painel do professor');
  }
}
