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

// Test accounts to be created (email, password, role)
const accounts = [
  { email: 'admin@demo.com', password: 'Admin123!', role: 'super_admin' },
  { email: 'director@demo.com', password: 'Director123!', role: 'school_admin' },
  { email: 'coordinator@demo.com', password: 'Coord123!', role: 'coordinator' },
  { email: 'teacher@demo.com', password: 'Teach123!', role: 'teacher' },
  { email: 'student@demo.com', password: 'Student123!', role: 'student' },
  { email: 'guardian@demo.com', password: 'Guard123!', role: 'guardian' },
  { email: 'treasury@demo.com', password: 'Treasury123!', role: 'treasury' },
];

async function ensureAccount(account: typeof accounts[0]) {
  // Attempt to sign in to get the user ID (auth_uid)
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  let userId: string | null = null;
  if (signInErr) {
    // If sign‑in fails, try to create the user via admin API
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
    });
    if (createErr) {
      console.error('Failed to create user', account.email, createErr.message);
      return;
    }
    userId = created.user.id;
    console.log(`Created user ${account.email} with UID ${userId}`);
  } else {
    userId = signIn.user?.id ?? null;
    console.log(`Existing user ${account.email} UID ${userId}`);
  }

  if (!userId) {
    console.error('Could not obtain UID for', account.email);
    return;
  }

  // Upsert profile in our custom users table
  const { error: upsertErr } = await supabase.from('users').upsert({
    auth_uid: userId,
    email: account.email,
    name: account.email.split('@')[0],
    role: account.role,
    // For director/teacher/student you may want to associate a school_id later manually
  });
  if (upsertErr) {
    console.error('Failed to upsert profile for', account.email, upsertErr.message);
  } else {
    console.log(`Profile upserted for ${account.email}`);
  }
}

async function main() {
  for (const acc of accounts) {
    await ensureAccount(acc);
  }
  console.log('All test accounts processed');
}

main().catch((e) => {
  console.error('Unexpected error', e);
  process.exit(1);
});

