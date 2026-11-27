import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize, getAuthenticatedUser } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const createRewardSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da recompensa'),
  price: z.coerce.number().positive('O preço em moedas deve ser maior que zero'),
  stock: z.coerce.number().int().nonnegative('O estoque não pode ser negativo'),
  category_id: z.string().uuid().optional(),
  image_path: z.string().optional(),
});

const redeemSchema = z.object({
  reward_id: z.string().min(1, 'ID da recompensa obrigatório'),
});

export async function GET() {
  try {
    const rewards = await prisma.reward.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(
      rewards.map((r) => ({
        ...r,
        price: Number(r.price),
      }))
    );
  } catch (e: any) {
    return dbErrorResponse(e, 'recompensas (rewards)');
  }
}

export async function POST(req: Request) {
  try {
    try {
      await authorize(['manage_rewards', 'manage_rewards_catalog']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para cadastrar recompensas' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createRewardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const created = await prisma.reward.create({
      data: {
        name: parsed.data.name,
        price: parsed.data.price,
        stock: parsed.data.stock,
        category_id: parsed.data.category_id ?? null,
        image_path: parsed.data.image_path ?? null,
        status: 'active',
      },
    });

    return NextResponse.json({ ...created, price: Number(created.price) }, { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'cadastro de recompensa');
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: 'Usuário não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Recompensa inválida' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findUnique({ where: { id: parsed.data.reward_id } });
      if (!reward) {
        return { error: 'Recompensa não encontrada.', status: 404 as const };
      }
      if (reward.stock <= 0) {
        return { error: 'Item sem estoque disponível.', status: 400 as const };
      }

      // If logged-in user is a student, check balance & debit wallet atomically
      if (authUser.role === 'student') {
        const stu = await tx.student.findFirst({
          where: { OR: [{ user_id: authUser.id }, { email: authUser.email }] },
          include: { wallet: true },
        });
        const price = Number(reward.price);
        if (stu?.wallet) {
          const currentBalance = Number(stu.wallet.balance);
          if (currentBalance < price) {
            return {
              error: `Saldo insuficiente (${currentBalance} JM$) para resgatar "${reward.name}" (${price} JM$).`,
              status: 400 as const,
            };
          }
          await tx.wallet.update({
            where: { id: stu.wallet.id },
            data: {
              balance: currentBalance - price,
              total_spent: Number(stu.wallet.total_spent) + price,
            },
          });
          await tx.walletTransaction.create({
            data: {
              wallet_id: stu.wallet.id,
              type: 'redeem',
              amount: price,
              description: `Resgate de recompensa: ${reward.name}`,
              created_by: authUser.id,
            },
          });
        }
      }

      const updated = await tx.reward.update({
        where: { id: reward.id },
        data: { stock: reward.stock - 1 },
      });

      return { reward: { ...updated, price: Number(updated.price) } };
    });

    if ('error' in result) {
      return NextResponse.json({ message: result.error }, { status: result.status });
    }

    return NextResponse.json(result.reward);
  } catch (e: any) {
    return dbErrorResponse(e, 'resgate de recompensa');
  }
}
