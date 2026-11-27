import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize, getAuthenticatedUser } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const transactionSchema = z.object({
  student_id: z.string().min(1, 'Selecione o aluno'),
  type: z.enum(['credit', 'bonus', 'award', 'reversal']),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  description: z.string().trim().min(3, 'Descreva o motivo da movimentação'),
});

export async function GET() {
  try {
    let authUser;
    try {
      authUser = await getAuthenticatedUser();
    } catch (err: any) {
      return NextResponse.json({ message: err?.message ?? 'Conta bloqueada' }, { status: 403 });
    }
    if (!authUser) {
      return NextResponse.json({ message: 'Usuário não autenticado' }, { status: 401 });
    }

    const whereClause =
      authUser.role === 'student'
        ? {
            OR: [{ user_id: authUser.id }, { email: authUser.email }],
          }
        : undefined;

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true } },
        classRoom: { select: { name: true } },
        wallet: {
          include: {
            transactions: {
              orderBy: { created_at: 'desc' },
              take: 15,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = students.map((s) => ({
      wallet_id: s.wallet?.id ?? null,
      student_id: s.id,
      student_name: s.name ?? s.user?.name ?? `Matrícula ${s.enrollment_number}`,
      enrollment_number: s.enrollment_number,
      class_name: s.classRoom?.name ?? s.class_id ?? 'Sem turma',
      balance: Number(s.wallet?.balance ?? 0),
      total_earned: Number(s.wallet?.total_earned ?? 0),
      total_spent: Number(s.wallet?.total_spent ?? 0),
      transactions: (s.wallet?.transactions ?? []).map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        description: tx.description,
        created_at: tx.created_at.toISOString(),
      })),
    }));

    return NextResponse.json(enriched);
  } catch (e: any) {
    return dbErrorResponse(e, 'carteiras (wallets)');
  }
}

export async function POST(req: Request) {
  try {
    let callerId: string;
    try {
      const auth = await authorize(['grant_coins', 'manage_school', 'view_wallets']);
      callerId = auth.user.id;
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

    const { student_id, type, amount, description } = parsed.data;
    const isReversal = type === 'reversal';

    const savedWallet = await prisma.$transaction(async (tx) => {
      const existing = await tx.wallet.findUnique({ where: { student_id } });
      const prevBalance = Number(existing?.balance ?? 0);
      const prevEarned = Number(existing?.total_earned ?? 0);
      const prevSpent = Number(existing?.total_spent ?? 0);

      const nextBalance = isReversal ? Math.max(0, prevBalance - amount) : prevBalance + amount;
      const nextEarned = isReversal ? prevEarned : prevEarned + amount;
      const nextSpent = isReversal ? prevSpent + amount : prevSpent;

      const wallet = existing
        ? await tx.wallet.update({
            where: { id: existing.id },
            data: {
              balance: nextBalance,
              total_earned: nextEarned,
              total_spent: nextSpent,
            },
          })
        : await tx.wallet.create({
            data: {
              student_id,
              balance: nextBalance,
              total_earned: nextEarned,
              total_spent: nextSpent,
            },
          });

      await tx.walletTransaction.create({
        data: {
          wallet_id: wallet.id,
          type,
          amount,
          description,
          created_by: callerId,
        },
      });

      return wallet;
    });

    return NextResponse.json({
      wallet_id: savedWallet.id,
      student_id,
      balance: Number(savedWallet.balance),
      total_earned: Number(savedWallet.total_earned),
      total_spent: Number(savedWallet.total_spent),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'movimentação de carteira');
  }
}

export const PATCH = POST;
