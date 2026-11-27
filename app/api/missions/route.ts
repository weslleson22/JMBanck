import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
} from '@/lib/supabase-data';

export const dynamic = 'force-dynamic';

const createMissionSchema = z.object({
  school_id: z.string().trim().optional(),
  title: z.string().trim().min(2, 'Informe o título da missão/atividade'),
  description: z.string().trim().optional().default(''),
  subject: z.string().trim().optional().default('Geral'),
  reward_amount: z.coerce.number().int().nonnegative('A recompensa não pode ser negativa'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export async function GET() {
  try {
    const { db } = await getServerDbContext();
    const { data, error } = await db
      .from('missions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Retry without created_at order in case schema doesn't have created_at
      const retry = await db.from('missions').select('*');
      if (retry.error) return dbErrorResponse(retry.error, 'missões (missions)');
      return NextResponse.json(retry.data ?? []);
    }

    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return dbErrorResponse(e, 'missões (missions)');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, [
        'create_activities',
        'create_pedagogical_challenges',
        'create_campaigns',
        'manage_school',
      ]);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para criar missões' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createMissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    let schoolId = parsed.data.school_id;
    if (!schoolId) {
      const { data: firstSchool } = await db.from('schools').select('id').limit(1).maybeSingle();
      schoolId = firstSchool?.id;
    }

    const corePayload: Record<string, any> = {
      ...(schoolId ? { school_id: schoolId } : {}),
      title: parsed.data.title,
      reward_amount: parsed.data.reward_amount,
      status: parsed.data.status,
    };

    const fullPayload: Record<string, any> = {
      ...corePayload,
      ...(parsed.data.description ? { description: parsed.data.description } : {}),
      ...(parsed.data.subject ? { subject: parsed.data.subject } : {}),
    };

    const { data, error } = await insertWithSchemaFallback(
      db,
      'missions',
      fullPayload,
      corePayload
    );

    if (error) return dbErrorResponse(error, 'criação de missão');
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de missão');
  }
}
