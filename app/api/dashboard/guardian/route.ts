import { NextResponse } from 'next/server';
import { authorize } from '@/lib/role';
import { dbErrorResponse, getServerDbContext } from '@/lib/supabase-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['view_guardian_dashboard']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para o painel do responsável' },
        { status: 403 }
      );
    }

    const [
      { data: students, error: sErr },
      { data: users, error: uErr },
      { data: classes, error: cErr },
      { data: wallets, error: wErr },
      { data: missions, error: mErr },
    ] = await Promise.all([
      db.from('students').select('*'),
      db.from('users').select('id, name, email'),
      db.from('classes').select('id, name'),
      db.from('wallets').select('*'),
      db.from('missions').select('*'),
    ]);

    const firstErr = sErr || uErr || cErr || wErr || mErr;
    if (firstErr) {
      return dbErrorResponse(firstErr, 'painel do responsável');
    }

    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
    const classMap = new Map((classes ?? []).map((c: any) => [c.id, c.name]));

    const firstStudent = (students ?? [])[0] ?? null;
    const studentUser = firstStudent?.user_id ? userMap.get(firstStudent.user_id) : null;
    const studentWallet = firstStudent
      ? (wallets ?? []).find((w: any) => w.student_id === firstStudent.id) ?? null
      : null;

    return NextResponse.json({
      student: firstStudent
        ? {
            id: firstStudent.id,
            name: firstStudent.name ?? studentUser?.name ?? `Matrícula ${firstStudent.enrollment_number}`,
            enrollment_number: firstStudent.enrollment_number ?? '',
            class_name: classMap.get(firstStudent.class_id) ?? firstStudent.class_id ?? 'Sem turma',
          }
        : null,
      wallet: {
        balance: Number(studentWallet?.balance ?? 0),
        total_earned: Number(studentWallet?.total_earned ?? 0),
        total_spent: Number(studentWallet?.total_spent ?? 0),
      },
      activeMissionsCount: (missions ?? []).filter((m: any) => !m.status || m.status === 'active')
        .length,
      missions: missions ?? [],
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'painel do responsável');
  }
}
