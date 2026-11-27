import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import { dbErrorResponse, getServerDbContext } from '@/lib/supabase-data';

export const dynamic = 'force-dynamic';

const transactionSchema = z.object({
  student_id: z.string().min(1, 'Selecione o aluno'),
  type: z.enum(['credit', 'bonus', 'award', 'reversal']),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  description: z.string().trim().min(3, 'Descreva o motivo da movimentação'),
});

export async function GET() {
  try {
    const { authClient, db } = await getServerDbContext();
    const {
      data: { user: authUser },
    } = await authClient.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ message: 'Usuário não autenticado' }, { status: 401 });
    }

    const [
      { data: wallets, error: wErr },
      { data: students, error: sErr },
      { data: users, error: uErr },
      { data: classes, error: cErr },
    ] = await Promise.all([
      db.from('wallets').select('*'),
      db.from('students').select('*'),
      db.from('users').select('id, auth_uid, name, email, role'),
      db.from('classes').select('id, name'),
    ]);

    const firstErr = wErr || sErr || uErr || cErr;
    if (firstErr) return dbErrorResponse(firstErr, 'carteiras (wallets)');

    const userMap = new Map<string, any>();
    for (const u of users ?? []) {
      userMap.set(u.id, u);
      if (u.auth_uid) userMap.set(u.auth_uid, u);
    }
    const classMap = new Map((classes ?? []).map((c: any) => [c.id, c.name]));

    const currentProfile = (users ?? []).find(
      (u: any) =>
        u.auth_uid === authUser.id ||
        (authUser.email && u.email?.toLowerCase() === authUser.email.toLowerCase())
    );
    const currentRole = currentProfile?.role ?? authUser.user_metadata?.role ?? 'student';

    const walletByStudent = new Map((wallets ?? []).map((w: any) => [w.student_id, w]));

    let targetStudents = students ?? [];
    if (currentRole === 'student') {
      targetStudents = targetStudents.filter(
        (s: any) =>
          (currentProfile && s.user_id === currentProfile.id) ||
          s.user_id === authUser.id ||
          (authUser.email && s.email?.toLowerCase() === authUser.email.toLowerCase())
      );
    }

    const enriched = targetStudents.map((s: any) => {
      const u = s.user_id ? userMap.get(s.user_id) : null;
      const w = walletByStudent.get(s.id);
      return {
        wallet_id: w?.id ?? null,
        student_id: s.id,
        student_name: s.name ?? u?.name ?? `Matrícula ${s.enrollment_number}`,
        enrollment_number: s.enrollment_number ?? '',
        class_name: classMap.get(s.class_id) ?? s.class_id ?? 'Sem turma',
        balance: Number(w?.balance ?? 0),
        total_earned: Number(w?.total_earned ?? 0),
        total_spent: Number(w?.total_spent ?? 0),
      };
    });

    return NextResponse.json(enriched);
  } catch (e: any) {
    return dbErrorResponse(e, 'carteiras (wallets)');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['grant_coins', 'manage_school', 'view_wallets']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para movimentar carteiras' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { student_id, type, amount } = parsed.data;
    const isReversal = type === 'reversal';

    const { data: existingWallet, error: findErr } = await db
      .from('wallets')
      .select('*')
      .eq('student_id', student_id)
      .maybeSingle();

    if (findErr) return dbErrorResponse(findErr, 'consulta de carteira');

    const prevBalance = Number(existingWallet?.balance ?? 0);
    const prevEarned = Number(existingWallet?.total_earned ?? 0);
    const prevSpent = Number(existingWallet?.total_spent ?? 0);

    const nextBalance = isReversal ? Math.max(0, prevBalance - amount) : prevBalance + amount;
    const nextEarned = isReversal ? prevEarned : prevEarned + amount;
    const nextSpent = isReversal ? prevSpent + amount : prevSpent;

    let savedWallet: any = null;
    if (existingWallet) {
      const { data, error } = await db
        .from('wallets')
        .update({
          balance: nextBalance,
          total_earned: nextEarned,
          total_spent: nextSpent,
        })
        .eq('id', existingWallet.id)
        .select()
        .single();
      if (error) return dbErrorResponse(error, 'atualização de carteira');
      savedWallet = data;
    } else {
      const { data, error } = await db
        .from('wallets')
        .insert({
          student_id,
          balance: nextBalance,
          total_earned: nextEarned,
          total_spent: nextSpent,
        })
        .select()
        .single();
      if (error) return dbErrorResponse(error, 'criação de carteira');
      savedWallet = data;
    }

    return NextResponse.json({
      wallet_id: savedWallet.id,
      student_id,
      balance: Number(savedWallet.balance ?? nextBalance),
      total_earned: Number(savedWallet.total_earned ?? nextEarned),
      total_spent: Number(savedWallet.total_spent ?? nextSpent),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'movimentação de carteira');
  }
}

export const PATCH = POST;
