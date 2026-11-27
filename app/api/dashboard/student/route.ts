import { NextResponse } from 'next/server';
import { authorize } from '@/lib/role';
import { dbErrorResponse, getServerDbContext } from '@/lib/supabase-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['view_student_dashboard']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para o painel do aluno' },
        { status: 403 }
      );
    }

    const {
      data: { user: authUser },
    } = await authClient.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ message: 'Usuário não autenticado' }, { status: 401 });
    }

    const [
      { data: users, error: uErr },
      { data: students, error: sErr },
      { data: classes, error: cErr },
      { data: wallets, error: wErr },
      { data: missions, error: mErr },
    ] = await Promise.all([
      db.from('users').select('*'),
      db.from('students').select('*'),
      db.from('classes').select('id, name'),
      db.from('wallets').select('*'),
      db.from('missions').select('*'),
    ]);

    const firstErr = uErr || sErr || cErr || wErr || mErr;
    if (firstErr) {
      return dbErrorResponse(firstErr, 'painel do aluno');
    }

    const profile = (users ?? []).find(
      (u: any) =>
        u.auth_uid === authUser.id ||
        (authUser.email && u.email?.toLowerCase() === authUser.email.toLowerCase())
    );

    const student =
      (students ?? []).find(
        (s: any) =>
          (profile && s.user_id === profile.id) ||
          s.user_id === authUser.id ||
          (authUser.email && s.email?.toLowerCase() === authUser.email.toLowerCase())
      ) ?? null;

    const classMap = new Map((classes ?? []).map((c: any) => [c.id, c.name]));
    const wallet = student
      ? (wallets ?? []).find((w: any) => w.student_id === student.id) ?? null
      : null;

    // Real class ranking computed from classmates' wallets
    let rankPosition: number | null = null;
    if (student) {
      const classmates = (students ?? []).filter((s: any) => s.class_id === student.class_id);
      const ranked = classmates
        .map((s: any) => {
          const w = (wallets ?? []).find((wl: any) => wl.student_id === s.id);
          return { studentId: s.id, earned: Number(w?.total_earned ?? 0) };
        })
        .sort((a, b) => b.earned - a.earned);
      const idx = ranked.findIndex((r) => r.studentId === student.id);
      if (idx !== -1) rankPosition = idx + 1;
    }

    return NextResponse.json({
      student: student
        ? {
            id: student.id,
            name: student.name ?? profile?.name ?? authUser.user_metadata?.name ?? 'Estudante',
            enrollment_number: student.enrollment_number ?? '',
            class_id: student.class_id ?? '',
            class_name: classMap.get(student.class_id) ?? student.class_id ?? 'Sem turma',
          }
        : {
            id: profile?.id ?? authUser.id,
            name: profile?.name ?? authUser.user_metadata?.name ?? authUser.email ?? 'Estudante',
            enrollment_number: 'Não vinculado',
            class_id: '',
            class_name: 'Sem turma vinculada',
          },
      wallet: {
        id: wallet?.id ?? null,
        balance: Number(wallet?.balance ?? 0),
        total_earned: Number(wallet?.total_earned ?? 0),
        total_spent: Number(wallet?.total_spent ?? 0),
      },
      rankPosition,
      missions: (missions ?? []).filter((m: any) => !m.status || m.status === 'active'),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'painel do aluno');
  }
}
