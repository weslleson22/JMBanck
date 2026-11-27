import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase URL or Service Role Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  try {
    // 1. Schools
    const { data: schoolA, error: errA } = await supabase.from('schools').insert({ name: 'Escola Alpha' }).select();
    const { data: schoolB, error: errB } = await supabase.from('schools').insert({ name: 'Escola Beta' }).select();
    if (errA || errB) throw errA ?? errB;
    const schoolAId = schoolA[0].id;
    const schoolBId = schoolB[0].id;

    // 2. Grade Levels (for Escola Alpha only)
    const { data: grade1, error: gErr1 } = await supabase.from('grade_levels').insert({ school_id: schoolAId, name: '1º Ano', order_index: 1 }).select();
    const { data: grade2, error: gErr2 } = await supabase.from('grade_levels').insert({ school_id: schoolAId, name: '2º Ano', order_index: 2 }).select();
    if (gErr1 || gErr2) throw gErr1 ?? gErr2;
    const grade1Id = grade1[0].id;
    const grade2Id = grade2[0].id;

    // 3. Class (Turma A)
    const { data: classA, error: cErr } = await supabase.from('classes').insert({ school_id: schoolAId, grade_level_id: grade1Id, name: 'Turma A' }).select();
    if (cErr) throw cErr;
    const classAId = classA[0].id;

    // 4. Users – you must replace these placeholders with real auth_uids created in Supabase Auth.
    //    For demo we just create dummy rows (they will not be usable for auth).
    const dummyStudentAuth = 'dummy-student-auth-uid';
    const dummyTeacherAuth = 'dummy-teacher-auth-uid';

    const { data: userStudent, error: uErr1 } = await supabase.from('users').insert({ auth_uid: dummyStudentAuth, school_id: schoolAId, role: 'student', email: 'aluno1@example.com', name: 'Aluno 1' }).select();
    const { data: userTeacher, error: uErr2 } = await supabase.from('users').insert({ auth_uid: dummyTeacherAuth, school_id: schoolAId, role: 'teacher', email: 'prof1@example.com', name: 'Prof. 1' }).select();
    if (uErr1 || uErr2) throw uErr1 ?? uErr2;
    const studentUserId = userStudent[0].id;
    const teacherUserId = userTeacher[0].id;

    // 5. Student record
    const { data: student, error: sErr } = await supabase.from('students').insert({ user_id: studentUserId, enrollment_number: '20230001', class_id: classAId }).select();
    if (sErr) throw sErr;
    const studentId = student[0].id;

    // 6. Teacher record
    const { data: teacher, error: tErr } = await supabase.from('teachers').insert({ user_id: teacherUserId }).select();
    if (tErr) throw tErr;

    // 7. Wallet for the student
    await supabase.from('wallets').insert({ student_id: studentId, balance: 0, total_earned: 0, total_spent: 0 });

    // 8. Mission
    await supabase.from('missions').insert({ school_id: schoolAId, title: 'Participar da aula de matemática', reward_amount: 10, status: 'active' });

    // 9. Reward
    await supabase.from('rewards').insert({ name: 'Caneta personalizada', price: 25, stock: 10, status: 'active' });

    console.log('Seed data inserted successfully.');
  } catch (e) {
    console.error('Error seeding data:', e);
    process.exit(1);
  }
}

main();

