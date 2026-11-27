import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
} from '@/lib/supabase-data';

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
    const { db } = await getServerDbContext();
    const { data, error } = await db
      .from('rewards')
      .select('*')
      .order('name', { ascending: true });

    if (error) return dbErrorResponse(error, 'recompensas (rewards)');
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return dbErrorResponse(e, 'recompensas (rewards)');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_rewards', 'manage_rewards_catalog']);
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

    const corePayload: Record<string, any> = {
      name: parsed.data.name,
      price: parsed.data.price,
      stock: parsed.data.stock,
      status: 'active',
    };

    const fullPayload: Record<string, any> = {
      ...corePayload,
      ...(parsed.data.category_id ? { category_id: parsed.data.category_id } : {}),
      ...(parsed.data.image_path ? { image_path: parsed.data.image_path } : {}),
    };

    const { data, error } = await insertWithSchemaFallback(
      db,
      'rewards',
      fullPayload,
      corePayload
    );

    if (error) return dbErrorResponse(error, 'cadastro de recompensa');
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'cadastro de recompensa');
  }
}

export async function PATCH(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    const {
      data: { user: authUser },
    } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ message: 'Usuário não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Recompensa inválida' }, { status: 400 });
    }

    const { data: reward, error: findErr } = await db
      .from('rewards')
      .select('*')
      .eq('id', parsed.data.reward_id)
      .maybeSingle();

    if (findErr) return dbErrorResponse(findErr, 'recompensa');
    if (!reward) {
      return NextResponse.json({ message: 'Recompensa não encontrada' }, { status: 404 });
    }

    const currentStock = Number(reward.stock ?? 0);
    if (currentStock <= 0) {
      return NextResponse.json({ message: 'Item sem estoque disponível.' }, { status: 400 });
    }

    const { data: updated, error: updErr } = await db
      .from('rewards')
      .update({ stock: currentStock - 1 })
      .eq('id', reward.id)
      .select()
      .single();

    if (updErr) return dbErrorResponse(updErr, 'resgate de recompensa');
    return NextResponse.json(updated);
  } catch (e: any) {
    return dbErrorResponse(e, 'resgate de recompensa');
  }
}
