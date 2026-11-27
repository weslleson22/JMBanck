import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/role';
import { dbErrorResponse } from '@/lib/prisma-errors';

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
    const missions = await prisma.mission.findMany({
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(missions);
  } catch (e: any) {
    return dbErrorResponse(e, 'missões (missions)');
  }
}

export async function POST(req: Request) {
  try {
    try {
      await authorize([
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

    let schoolId = parsed.data.school_id || null;
    if (!schoolId) {
      const firstSchool = await prisma.school.findFirst({ select: { id: true } });
      schoolId = firstSchool?.id ?? null;
    }

    const created = await prisma.mission.create({
      data: {
        school_id: schoolId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        subject: parsed.data.subject || 'Geral',
        reward_amount: parsed.data.reward_amount,
        status: parsed.data.status,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de missão');
  }
}
