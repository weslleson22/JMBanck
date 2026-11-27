import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY
)?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error(
    '❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) no arquivo .env.local.\n' +
      '   Você encontra a Secret Key / Service Role Key no painel do Supabase em: Project Settings → API Keys.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  {
    email: 'admin@demo.com',
    password: 'Admin123!',
    name: 'Carlos Mendes (Super Admin)',
    role: 'super_admin',
  },
  {
    email: 'director@demo.com',
    password: 'Director123!',
    name: 'Helena Costa (Diretora)',
    role: 'school_admin',
  },
  {
    email: 'coordinator@demo.com',
    password: 'Coord123!',
    name: 'Marcos Souza (Coordenador)',
    role: 'coordinator',
  },
  {
    email: 'teacher@demo.com',
    password: 'Teach123!',
    name: 'Profª. Ana Paula',
    role: 'teacher',
  },
  {
    email: 'student@demo.com',
    password: 'Student123!',
    name: 'Lucas Oliveira',
    role: 'student',
  },
  {
    email: 'guardian@demo.com',
    password: 'Guard123!',
    name: 'Roberto Oliveira (Responsável)',
    role: 'guardian',
  },
  {
    email: 'treasury@demo.com',
    password: 'Treasury123!',
    name: 'Fernanda Lima (Tesouraria)',
    role: 'treasury',
  },
];

async function main() {
  // 1. Validate tables exist before inserting
  const { error: probeErr } = await supabase.from('users').select('id').limit(1);
  if (probeErr && (probeErr.code === 'PGRST205' || probeErr.code === '42P01')) {
    console.error(
      '❌ As tabelas ainda não existem no Supabase.\n' +
        '   Primeiro execute o arquivo supabase/schema.sql no SQL Editor do painel do Supabase.'
    );
    process.exit(1);
  }

  // 2. Ensure base school, grade_level, class exist
  let schoolId;
  const { data: existingSchools } = await supabase.from('schools').select('id').limit(1);
  if (existingSchools && existingSchools.length > 0) {
    schoolId = existingSchools[0].id;
  } else {
    const { data: createdSchool, error: sErr } = await supabase
      .from('schools')
      .insert({
        name: 'Escola Estadual JM Bank',
        code: 'INEP-21048290',
        city: 'São Luís - MA',
        academic_year: '2026',
        director_name: 'Helena Costa',
        status: 'active',
      })
      .select()
      .single();
    if (sErr) throw sErr;
    schoolId = createdSchool.id;
    console.log('✅ Escola inicial criada:', createdSchool.name);
  }

  let gradeId;
  const { data: existingGrades } = await supabase.from('grade_levels').select('id').limit(1);
  if (existingGrades && existingGrades.length > 0) {
    gradeId = existingGrades[0].id;
  } else {
    const { data: createdGrade, error: gErr } = await supabase
      .from('grade_levels')
      .insert({
        school_id: schoolId,
        name: '9º Ano - Ensino Fundamental II',
        stage: 'Ensino Fundamental II',
        order_index: 9,
        status: 'active',
      })
      .select()
      .single();
    if (gErr) throw gErr;
    gradeId = createdGrade.id;
    console.log('✅ Série inicial criada:', createdGrade.name);
  }

  let classId;
  const { data: existingClasses } = await supabase.from('classes').select('id').limit(1);
  if (existingClasses && existingClasses.length > 0) {
    classId = existingClasses[0].id;
  } else {
    const { data: createdClass, error: cErr } = await supabase
      .from('classes')
      .insert({
        school_id: schoolId,
        grade_level_id: gradeId,
        name: '9º Ano A',
        shift: 'Matutino',
        academic_year: '2026',
        room: 'Sala 101',
        capacity: 35,
        status: 'active',
      })
      .select()
      .single();
    if (cErr) throw cErr;
    classId = createdClass.id;
    console.log('✅ Turma inicial criada:', createdClass.name);
  }

  // 3. List existing Auth users once so we can create OR update passwords cleanly
  const { data: existingAuthData, error: listErr } = await supabase.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) throw listErr;
  const authByEmail = new Map(
    (existingAuthData?.users ?? []).map((u) => [(u.email ?? '').toLowerCase(), u])
  );

  let teacherUserId = null;
  let studentUserId = null;

  for (const acc of accounts) {
    const existingAuth = authByEmail.get(acc.email.toLowerCase());
    let authUid;

    if (existingAuth) {
      const { data: updated, error: updErr } = await supabase.auth.admin.updateUserById(
        existingAuth.id,
        {
          password: acc.password,
          email_confirm: true,
          user_metadata: { role: acc.role, name: acc.name },
        }
      );
      if (updErr) {
        console.error(`❌ Erro ao atualizar Auth para ${acc.email}:`, updErr.message);
        continue;
      }
      authUid = updated.user.id;
      console.log(`🔄 Conta Auth atualizada: ${acc.email} (${acc.role})`);
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { role: acc.role, name: acc.name },
      });
      if (createErr) {
        console.error(`❌ Erro ao criar Auth para ${acc.email}:`, createErr.message);
        continue;
      }
      authUid = created.user.id;
      console.log(`✅ Conta Auth criada: ${acc.email} (${acc.role})`);
    }

    const { data: upsertedUser, error: uErr } = await supabase
      .from('users')
      .upsert(
        {
          auth_uid: authUid,
          school_id: schoolId,
          email: acc.email,
          name: acc.name,
          role: acc.role,
          status: 'active',
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (uErr) {
      console.error(`❌ Erro ao salvar ${acc.email} em public.users:`, uErr.message);
      continue;
    }

    if (acc.role === 'teacher') teacherUserId = upsertedUser.id;
    if (acc.role === 'student') studentUserId = upsertedUser.id;
  }

  // 4. Ensure teacher, student, wallet, sample mission & reward exist
  if (teacherUserId) {
    const { data: existingT } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', teacherUserId)
      .maybeSingle();
    if (!existingT) {
      await supabase.from('teachers').insert({
        user_id: teacherUserId,
        school_id: schoolId,
        name: 'Profª. Ana Paula',
        email: 'teacher@demo.com',
        subject: 'Matemática',
        classes_linked: '9º Ano A',
        status: 'active',
      });
      console.log('✅ Registro de professor vinculado.');
    }
  }

  if (studentUserId) {
    const { data: existingS } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', studentUserId)
      .maybeSingle();
    let studentId = existingS?.id;
    if (!studentId) {
      const { data: createdStu } = await supabase
        .from('students')
        .insert({
          user_id: studentUserId,
          class_id: classId,
          name: 'Lucas Oliveira',
          email: 'student@demo.com',
          enrollment_number: '20260001',
          guardian_name: 'Roberto Oliveira',
          status: 'active',
          lgpd_consent: true,
        })
        .select()
        .single();
      studentId = createdStu?.id;
      console.log('✅ Registro de aluno vinculado.');
    }

    if (studentId) {
      await supabase.from('wallets').upsert(
        {
          student_id: studentId,
          balance: 150,
          total_earned: 150,
          total_spent: 0,
        },
        { onConflict: 'student_id' }
      );
      console.log('✅ Carteira digital inicializada para Lucas Oliveira.');
    }
  }

  const { data: existingMissions } = await supabase.from('missions').select('id').limit(1);
  if (!existingMissions || existingMissions.length === 0) {
    await supabase.from('missions').insert({
      school_id: schoolId,
      title: 'Desafio de Educação Financeira — Orçamento Familiar',
      description: 'Complete a planilha de receitas e despesas proposta em sala.',
      subject: 'Matemática',
      reward_amount: 50,
      status: 'active',
    });
    console.log('✅ Missão inicial criada.');
  }

  const { data: existingRewards } = await supabase.from('rewards').select('id').limit(1);
  if (!existingRewards || existingRewards.length === 0) {
    await supabase.from('rewards').insert([
      { name: 'Caderno Personalizado JM Bank', price: 80, stock: 25, status: 'active' },
      { name: 'Kit Canetas Coloridas', price: 45, stock: 40, status: 'active' },
    ]);
    console.log('✅ Recompensas iniciais criadas.');
  }

  console.log('\n🎉 Pronto! Todos os 7 usuários foram gravados no Supabase Auth e em public.users.');
}

main().catch((err) => {
  console.error('❌ Erro ao inicializar usuários:', err);
  process.exit(1);
});
