import { NextResponse } from 'next/server';
import { authorize } from '@/lib/role';
import { dbErrorResponse, getServerDbContext } from '@/lib/supabase-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['view_treasury_dashboard', 'manage_rewards']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para o painel de tesouraria' },
        { status: 403 }
      );
    }

    const [{ data: rewards, error: rewErr }, { data: wallets, error: walErr }] =
      await Promise.all([
        db.from('rewards').select('*').order('name', { ascending: true }),
        db.from('wallets').select('total_spent'),
      ]);

    const firstErr = rewErr || walErr;
    if (firstErr) {
      return dbErrorResponse(firstErr, 'painel de tesouraria');
    }

    const items = rewards ?? [];
    const totalRewards = items.length;
    const totalStock = items.reduce((sum: number, r: any) => sum + Number(r.stock ?? 0), 0);
    const outOfStockCount = items.filter((r: any) => Number(r.stock ?? 0) <= 0).length;
    const totalCoinsRedeemed = (wallets ?? []).reduce(
      (sum: number, w: any) => sum + Number(w.total_spent ?? 0),
      0
    );

    return NextResponse.json({
      totalRewards,
      totalStock,
      outOfStockCount,
      totalCoinsRedeemed,
      rewards: items.map((r: any) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price ?? 0),
        stock: Number(r.stock ?? 0),
        status: r.status ?? 'active',
      })),
    });
  } catch (e: any) {
    return dbErrorResponse(e, 'painel de tesouraria');
  }
}
