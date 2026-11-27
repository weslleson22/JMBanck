import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  const authSecret = process.env.AUTH_SECRET?.trim();

  console.log('🔎 Variáveis de ambiente (.env):');
  console.log(`   - DATABASE_URL: ${url ? 'OK' : 'AUSENTE'}`);
  console.log(`   - AUTH_SECRET : ${authSecret ? 'OK' : 'AUSENTE (usará chave derivada)'}`);

  if (!url) process.exit(1);

  await prisma.$queryRaw`SELECT 1`;
  console.log('\n✅ Conexão com PostgreSQL via Prisma estabelecida!\n');

  const counts = {
    schools: await prisma.school.count(),
    academic_years: await prisma.academicYear.count(),
    grade_levels: await prisma.gradeLevel.count(),
    classes: await prisma.classRoom.count(),
    users: await prisma.user.count(),
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    wallets: await prisma.wallet.count(),
    wallet_transactions: await prisma.walletTransaction.count(),
    missions: await prisma.mission.count(),
    rewards: await prisma.reward.count(),
  };

  console.log('📊 Contagem de registros no Prisma Postgres:');
  console.table(counts);
}

main()
  .catch((err) => {
    console.error('❌ Erro ao verificar banco Prisma:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
