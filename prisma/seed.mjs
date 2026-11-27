import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

const IDS = {
  schoolMain: '11111111-1111-4111-8111-111111111101',
  schoolSecond: '11111111-1111-4111-8111-111111111102',
  academicYear2026: '22222222-2222-4222-8222-222222222201',
  grade6: '33333333-3333-4333-8333-333333333306',
  grade7: '33333333-3333-4333-8333-333333333307',
  grade8: '33333333-3333-4333-8333-333333333308',
  grade9: '33333333-3333-4333-8333-333333333309',
  class9A: '44444444-4444-4444-8444-444444444401',
  class9B: '44444444-4444-4444-8444-444444444402',
  class8A: '44444444-4444-4444-8444-444444444403',
  mission1: '55555555-5555-4555-8555-555555555501',
  mission2: '55555555-5555-4555-8555-555555555502',
  mission3: '55555555-5555-4555-8555-555555555503',
  reward1: '66666666-6666-4666-8666-666666666601',
  reward2: '66666666-6666-4666-8666-666666666602',
  reward3: '66666666-6666-4666-8666-666666666603',
  reward4: '66666666-6666-4666-8666-666666666604',
  teacherAna: '77777777-7777-4777-8777-777777777701',
  studentLucas: '88888888-8888-4888-8888-888888888801',
  studentSofia: '88888888-8888-4888-8888-888888888802',
  studentPedro: '88888888-8888-4888-8888-888888888803',
};

const SEED_USERS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@demo.com',
    password: 'Admin123!',
    name: 'Carlos Mendes (Super Admin)',
    role: 'super_admin',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'director@demo.com',
    password: 'Director123!',
    name: 'Helena Costa (Diretora)',
    role: 'school_admin',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'coordinator@demo.com',
    password: 'Coord123!',
    name: 'Marcos Souza (Coordenador)',
    role: 'coordinator',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'teacher@demo.com',
    password: 'Teach123!',
    name: 'Profª. Ana Paula',
    role: 'teacher',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    email: 'student@demo.com',
    password: 'Student123!',
    name: 'Lucas Oliveira',
    role: 'student',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    email: 'guardian@demo.com',
    password: 'Guard123!',
    name: 'Roberto Oliveira (Responsável)',
    role: 'guardian',
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    email: 'treasury@demo.com',
    password: 'Treasury123!',
    name: 'Fernanda Lima (Tesouraria)',
    role: 'treasury',
  },
];

async function main() {
  console.log('🚀 Iniciando seed idempotente no Prisma PostgreSQL...');

  // 1. Escolas
  await prisma.school.upsert({
    where: { id: IDS.schoolMain },
    update: {},
    create: {
      id: IDS.schoolMain,
      name: 'Escola Estadual JM Bank',
      code: 'INEP-21048290',
      city: 'São Luís - MA',
      academic_year: '2026',
      director_name: 'Helena Costa',
      status: 'active',
    },
  });

  await prisma.school.upsert({
    where: { id: IDS.schoolSecond },
    update: {},
    create: {
      id: IDS.schoolSecond,
      name: 'Colégio Modelo Educa+',
      code: 'INEP-21048291',
      city: 'São Luís - MA',
      academic_year: '2026',
      director_name: 'Carlos Mendes',
      status: 'active',
    },
  });

  // 2. Ano Letivo
  await prisma.academicYear.upsert({
    where: { id: IDS.academicYear2026 },
    update: {},
    create: {
      id: IDS.academicYear2026,
      school_id: IDS.schoolMain,
      name: '2026',
      start_date: new Date('2026-02-02'),
      end_date: new Date('2026-12-18'),
    },
  });

  // 3. Séries / Anos Escolares
  const grades = [
    {
      id: IDS.grade6,
      name: '6º Ano - Ensino Fundamental II',
      stage: 'Ensino Fundamental II',
      order_index: 6,
      description: 'Introdução à educação financeira e metas coletivas.',
    },
    {
      id: IDS.grade7,
      name: '7º Ano - Ensino Fundamental II',
      stage: 'Ensino Fundamental II',
      order_index: 7,
      description: 'Planejamento financeiro básico e projetos em equipe.',
    },
    {
      id: IDS.grade8,
      name: '8º Ano - Ensino Fundamental II',
      stage: 'Ensino Fundamental II',
      order_index: 8,
      description: 'Consumo consciente, poupança e desafios interdisciplinares.',
    },
    {
      id: IDS.grade9,
      name: '9º Ano - Ensino Fundamental II',
      stage: 'Ensino Fundamental II',
      order_index: 9,
      description: 'Empreendedorismo jovem, orçamento e preparação para o Ensino Médio.',
    },
  ];
  for (const g of grades) {
    await prisma.gradeLevel.upsert({
      where: { id: g.id },
      update: {},
      create: { ...g, school_id: IDS.schoolMain, status: 'active' },
    });
  }

  // 4. Turmas
  const classes = [
    {
      id: IDS.class9A,
      grade_level_id: IDS.grade9,
      name: '9º Ano A',
      shift: 'Matutino',
      room: 'Sala 101',
      capacity: 35,
    },
    {
      id: IDS.class9B,
      grade_level_id: IDS.grade9,
      name: '9º Ano B',
      shift: 'Vespertino',
      room: 'Sala 102',
      capacity: 35,
    },
    {
      id: IDS.class8A,
      grade_level_id: IDS.grade8,
      name: '8º Ano A',
      shift: 'Matutino',
      room: 'Sala 201',
      capacity: 32,
    },
  ];
  for (const c of classes) {
    await prisma.classRoom.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, school_id: IDS.schoolMain, academic_year: '2026', status: 'active' },
    });
  }

  // 5. Usuários (todos os 7 perfis RBAC com senha scrypt)
  const createdUsers = {};
  for (const u of SEED_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      createdUsers[u.role] = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: u.name,
          role: u.role,
          status: 'active',
          password_hash: existing.password_hash || hashPassword(u.password),
          school_id: existing.school_id || IDS.schoolMain,
        },
      });
    } else {
      createdUsers[u.role] = await prisma.user.create({
        data: {
          id: u.id,
          school_id: IDS.schoolMain,
          email: u.email,
          name: u.name,
          role: u.role,
          status: 'active',
          password_hash: hashPassword(u.password),
        },
      });
    }
  }

  // 6. Professores
  await prisma.teacher.upsert({
    where: { id: IDS.teacherAna },
    update: {},
    create: {
      id: IDS.teacherAna,
      user_id: createdUsers.teacher.id,
      school_id: IDS.schoolMain,
      name: 'Profª. Ana Paula',
      email: 'teacher@demo.com',
      subject: 'Matemática',
      classes_linked: '9º Ano A, 9º Ano B',
      phone: '(98) 99111-2200',
      status: 'active',
    },
  });

  // 7. Alunos + Carteiras Digitais
  const students = [
    {
      id: IDS.studentLucas,
      user_id: createdUsers.student.id,
      class_id: IDS.class9A,
      name: 'Lucas Oliveira',
      email: 'student@demo.com',
      enrollment_number: '20260001',
      guardian_name: 'Roberto Oliveira',
      guardian_contact: '(98) 99123-4567',
      birth_date: '2011-05-14',
      balance: 240,
      total_earned: 320,
      total_spent: 80,
    },
    {
      id: IDS.studentSofia,
      user_id: null,
      class_id: IDS.class9A,
      name: 'Sofia Rodrigues',
      email: 'sofia.rodrigues@jmbank.edu.br',
      enrollment_number: '20260002',
      guardian_name: 'Maria Rodrigues',
      guardian_contact: '(98) 99222-3344',
      birth_date: '2011-08-22',
      balance: 195,
      total_earned: 240,
      total_spent: 45,
    },
    {
      id: IDS.studentPedro,
      user_id: null,
      class_id: IDS.class8A,
      name: 'Pedro Henrique Santos',
      email: 'pedro.santos@jmbank.edu.br',
      enrollment_number: '20260003',
      guardian_name: 'André Santos',
      guardian_contact: '(98) 99333-4455',
      birth_date: '2012-03-10',
      balance: 150,
      total_earned: 150,
      total_spent: 0,
    },
  ];

  for (const s of students) {
    const stu = await prisma.student.upsert({
      where: { enrollment_number: s.enrollment_number },
      update: {},
      create: {
        id: s.id,
        user_id: s.user_id,
        class_id: s.class_id,
        name: s.name,
        email: s.email,
        enrollment_number: s.enrollment_number,
        guardian_name: s.guardian_name,
        guardian_contact: s.guardian_contact,
        birth_date: s.birth_date,
        status: 'active',
        lgpd_consent: true,
      },
    });

    const wallet = await prisma.wallet.upsert({
      where: { student_id: stu.id },
      update: {},
      create: {
        student_id: stu.id,
        balance: s.balance,
        total_earned: s.total_earned,
        total_spent: s.total_spent,
      },
    });

    const txCount = await prisma.walletTransaction.count({ where: { wallet_id: wallet.id } });
    if (txCount === 0 && s.total_earned > 0) {
      await prisma.walletTransaction.create({
        data: {
          wallet_id: wallet.id,
          type: 'credit',
          amount: s.total_earned,
          description: 'Bonificação inicial por participação em atividades escolares',
          created_by: createdUsers.teacher.id,
        },
      });
    }
  }

  // 8. Missões & Atividades
  const missions = [
    {
      id: IDS.mission1,
      title: 'Desafio de Educação Financeira — Orçamento Familiar',
      description:
        'Monte um planejamento mensal equilibrando receitas, despesas essenciais e reserva de emergência.',
      subject: 'Matemática',
      reward_amount: 50,
    },
    {
      id: IDS.mission2,
      title: 'Olimpíada Escolar de Porcentagem e Juros',
      description:
        'Resolva a lista prática de juros simples e descontos aplicada a compras cotidianas.',
      subject: 'Matemática',
      reward_amount: 75,
    },
    {
      id: IDS.mission3,
      title: 'Leitura & Resumo Semanal',
      description: 'Entregue a resenha crítica da leitura indicada pela coordenação pedagógica.',
      subject: 'Português',
      reward_amount: 40,
    },
  ];
  for (const m of missions) {
    await prisma.mission.upsert({
      where: { id: m.id },
      update: {},
      create: { ...m, school_id: IDS.schoolMain, status: 'active' },
    });
  }

  // 9. Recompensas
  const rewards = [
    { id: IDS.reward1, name: 'Caderno Personalizado JM Bank', price: 80, stock: 25 },
    { id: IDS.reward2, name: 'Kit Canetas Coloridas', price: 45, stock: 40 },
    { id: IDS.reward3, name: 'Vale Lanche Especial na Cantina', price: 60, stock: 30 },
    { id: IDS.reward4, name: 'Livro de Empreendedorismo Jovem', price: 120, stock: 15 },
  ];
  for (const r of rewards) {
    await prisma.reward.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, status: 'active' },
    });
  }

  const summary = {
    schools: await prisma.school.count(),
    grade_levels: await prisma.gradeLevel.count(),
    classes: await prisma.classRoom.count(),
    users: await prisma.user.count(),
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    wallets: await prisma.wallet.count(),
    missions: await prisma.mission.count(),
    rewards: await prisma.reward.count(),
  };

  console.log('✅ Seed concluída com sucesso no Prisma Postgres!');
  console.table(summary);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed do Prisma:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

