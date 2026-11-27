import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      await authorize([
        'view_treasury_dashboard',
        'manage_rewards',
        'manage_rewards_catalog',
        'manage_school',
      ]);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Acesso não autorizado ao painel da tesouraria.' },
        { status: 403 }
      );
    }

    const [rewards, walletAgg] = await Promise.all([
      prisma.reward.findMany({ orderBy: { name: 'asc' } }),
      prisma.wallet.aggregate({ _sum: { total_spent: true } }),
    ]);

    const totalStock = rewards.reduce((acc, r) => acc + Number(r.stock ?? 0), 0);
    const outOfStockCount = rewards.filter((r) => Number(r.stock ?? 0) <= 0).length;
    const totalCoinsRedeemed = Number(walletAgg._sum.total_spent ?? 0);

    return NextResponse.json({
      totalRewards: rewards.length,
      totalStock,
      outOfStockCount,
      totalCoinsRedeemed,
      rewards: rewards.map((r) => ({
        ...r,
        price: Number(r.price),
      })),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'dashboard da tesouraria');
  }
}
