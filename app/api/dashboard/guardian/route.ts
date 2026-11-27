import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    totalStudents: 1,
    studentName: 'Lucas Oliveira (9º Ano A)',
    totalBalance: 340,
    totalEarned: 520,
    totalSpent: 180,
    achievementsCount: 4,
    attendanceRate: '98%',
    recentActivity: [
      { type: 'Crédito – Missão de Matemática', amount: '+50 JM$', date: 'Hoje' },
      { type: 'Bonificação – Frequência Semanal', amount: '+30 JM$', date: 'Ontem' },
      { type: 'Resgate – Ingresso Cinema Escolar', amount: '-80 JM$', date: '04/11/2026' },
    ],
  });
}

