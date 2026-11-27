import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    '⚠️  Defina SUPABASE_SERVICE_ROLE_KEY no arquivo .env.local para criar os usuários diretamente no Supabase Auth.\n' +
    '💡 Dica: Você já pode acessar http://localhost:3000/login e clicar em qualquer uma das 7 Contas de Teste para entrar imediatamente!'
  );
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey);

const accounts = [
  { email: 'admin@demo.com', password: 'Admin123!', role: 'super_admin' },
  { email: 'director@demo.com', password: 'Director123!', role: 'school_admin' },
  { email: 'coordinator@demo.com', password: 'Coord123!', role: 'coordinator' },
  { email: 'teacher@demo.com', password: 'Teach123!', role: 'teacher' },
  { email: 'student@demo.com', password: 'Student123!', role: 'student' },
  { email: 'guardian@demo.com', password: 'Guard123!', role: 'guardian' },
  { email: 'treasury@demo.com', password: 'Treasury123!', role: 'treasury' },
];

for (const acc of accounts) {
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: acc.email,
    password: acc.password,
    email_confirm: true,
    user_metadata: { role: acc.role, name: acc.email.split('@')[0] },
  });

  if (createErr) {
    console.log(`ℹ️  Conta ${acc.email}: ${createErr.message}`);
  } else {
    console.log(`✅ Conta criada: ${acc.email} (${acc.role}) - UID: ${created.user.id}`);
  }
}

