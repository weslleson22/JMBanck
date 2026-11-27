-- ============================================================================
-- JM Bank — Esquema Completo do Banco de Dados (Supabase / PostgreSQL)
-- Execute este script no SQL Editor do painel do Supabase.
-- É idempotente (pode ser reexecutado com segurança).
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Escolas
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  city text,
  academic_year text not null default '2026',
  director_name text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- 2. Anos Letivos
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- 3. Séries / Anos Escolares
create table if not exists public.grade_levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  name text not null,
  stage text not null default 'Ensino Fundamental II',
  order_index integer not null default 1,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- 4. Turmas
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  grade_level_id uuid references public.grade_levels(id) on delete set null,
  name text not null,
  shift text not null default 'Matutino',
  academic_year text not null default '2026',
  room text,
  capacity integer not null default 35,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- 5. Usuários & Perfis RBAC (vinculados ao Supabase Auth via auth_uid)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid unique,
  school_id uuid references public.schools(id) on delete set null,
  email text unique not null,
  name text not null,
  role text not null default 'student' check (
    role in ('super_admin', 'school_admin', 'coordinator', 'teacher', 'student', 'guardian', 'treasury')
  ),
  status text not null default 'active' check (status in ('active', 'blocked', 'inactive')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Professores
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  name text,
  email text,
  subject text not null default 'Docente',
  classes_linked text not null default 'Sem turma vinculada',
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- 7. Alunos
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  name text,
  email text,
  enrollment_number text unique not null,
  guardian_name text,
  guardian_contact text,
  birth_date text,
  photo_path text,
  lgpd_consent boolean not null default true,
  status text not null default 'active' check (status in ('active', 'transferred', 'inactive')),
  created_at timestamptz not null default now()
);

-- 8. Carteiras Digitais
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid unique not null references public.students(id) on delete cascade,
  balance numeric not null default 0,
  total_earned numeric not null default 0,
  total_spent numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Missões & Atividades
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  title text not null,
  description text,
  subject text not null default 'Geral',
  reward_amount integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- 10. Catálogo de Recompensas
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  stock integer not null default 0,
  category_id uuid,
  image_path text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Índices para performance
-- ============================================================================
create index if not exists idx_users_auth_uid on public.users(auth_uid);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_students_class_id on public.students(class_id);
create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_teachers_user_id on public.teachers(user_id);
create index if not exists idx_wallets_student_id on public.wallets(student_id);

-- ============================================================================
-- Row Level Security (RLS)
-- Usuários autenticados acessam conforme controle RBAC do backend;
-- chaves administrativas (service_role / sb_secret) possuem bypass automático.
-- ============================================================================
alter table public.schools enable row level security;
alter table public.academic_years enable row level security;
alter table public.grade_levels enable row level security;
alter table public.classes enable row level security;
alter table public.users enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.wallets enable row level security;
alter table public.missions enable row level security;
alter table public.rewards enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'schools', 'academic_years', 'grade_levels', 'classes',
    'users', 'teachers', 'students', 'wallets', 'missions', 'rewards'
  ] loop
    execute format('drop policy if exists "authenticated_all_%I" on public.%I', tbl, tbl);
    execute format(
      'create policy "authenticated_all_%I" on public.%I for all to authenticated using (true) with check (true)',
      tbl, tbl
    );
  end loop;
end $$;

