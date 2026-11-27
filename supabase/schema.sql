-- ============================================================================
-- Migration: 20261127000001_initial_schema
-- JM Bank â€” Tabelas principais, chaves estrangeiras, Ã­ndices e triggers
-- 100% idempotente (seguro para reexecuÃ§Ã£o).
-- ============================================================================

create extension if not exists pgcrypto;

-- FunÃ§Ã£o auxiliar para atualizar updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

-- 3. SÃ©ries / Anos Escolares
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

-- 5. UsuÃ¡rios & Perfis RBAC (vinculados ao Supabase Auth via auth_uid)
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

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

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

drop trigger if exists trg_wallets_updated_at on public.wallets;
create trigger trg_wallets_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- 9. MissÃµes & Atividades
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

-- 10. CatÃ¡logo de Recompensas
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

-- Ãndices para performance
create index if not exists idx_grade_levels_school_id on public.grade_levels(school_id);
create index if not exists idx_classes_school_id on public.classes(school_id);
create index if not exists idx_classes_grade_level_id on public.classes(grade_level_id);
create index if not exists idx_users_auth_uid on public.users(auth_uid);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_students_class_id on public.students(class_id);
create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_teachers_user_id on public.teachers(user_id);
create index if not exists idx_wallets_student_id on public.wallets(student_id);
create index if not exists idx_missions_school_id on public.missions(school_id);

-- ============================================================================
-- Migration: 20261127000002_rls_and_grants
-- JM Bank â€” Row Level Security (RLS) baseado em papÃ©is + propriedade (ownership),
-- helper em schema privado (nÃ£o exposto na API) e recarga do cache PostgREST.
-- 100% idempotente (seguro para reexecuÃ§Ã£o).
-- ============================================================================

-- Schema privado (nÃ£o exposto via PostgREST) para helper de papel RBAC
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select u.role
      from public.users u
      where u.auth_uid = (select auth.uid())
        and u.status = 'active'
      limit 1
    ),
    (select auth.jwt() -> 'app_metadata' ->> 'role'),
    'student'
  );
$$;

revoke execute on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated;

-- Ativa RLS em todas as tabelas do schema public
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

-- Limpa polÃ­ticas legadas genÃ©ricas caso existam
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'schools', 'academic_years', 'grade_levels', 'classes',
    'users', 'teachers', 'students', 'wallets', 'missions', 'rewards'
  ] loop
    execute format('drop policy if exists "authenticated_all_%I" on public.%I', tbl, tbl);
  end loop;
end $$;

-- ============================================================================
-- 1. Estrutura escolar (schools, academic_years, grade_levels, classes)
-- Leitura: qualquer usuÃ¡rio autenticado | Escrita: super_admin, school_admin
-- ============================================================================
do $$
declare
  tbl text;
begin
  foreach tbl in array array['schools', 'academic_years', 'grade_levels', 'classes'] loop
    execute format('drop policy if exists "%s_select_auth" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_insert_admin" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_update_admin" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_delete_admin" on public.%I', tbl, tbl);

    execute format(
      'create policy "%s_select_auth" on public.%I for select to authenticated using (true)',
      tbl, tbl
    );
    execute format(
      'create policy "%s_insert_admin" on public.%I for insert to authenticated with check ((select private.current_user_role()) in (''super_admin'', ''school_admin''))',
      tbl, tbl
    );
    execute format(
      'create policy "%s_update_admin" on public.%I for update to authenticated using ((select private.current_user_role()) in (''super_admin'', ''school_admin'')) with check ((select private.current_user_role()) in (''super_admin'', ''school_admin''))',
      tbl, tbl
    );
    execute format(
      'create policy "%s_delete_admin" on public.%I for delete to authenticated using ((select private.current_user_role()) in (''super_admin'', ''school_admin''))',
      tbl, tbl
    );
  end loop;
end $$;

-- ============================================================================
-- 2. UsuÃ¡rios (users)
-- Leitura: prÃ³prio perfil ou equipe autorizada | Escrita: super_admin, school_admin
-- ============================================================================
drop policy if exists "users_select_own_or_staff" on public.users;
drop policy if exists "users_insert_admin" on public.users;
drop policy if exists "users_update_admin" on public.users;
drop policy if exists "users_delete_admin" on public.users;

create policy "users_select_own_or_staff"
  on public.users for select to authenticated
  using (
    (select auth.uid()) = auth_uid
    or (select private.current_user_role()) in ('super_admin', 'school_admin', 'coordinator', 'teacher', 'treasury')
  );

create policy "users_insert_admin"
  on public.users for insert to authenticated
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin'));

create policy "users_update_admin"
  on public.users for update to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin'))
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin'));

create policy "users_delete_admin"
  on public.users for delete to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin'));

-- ============================================================================
-- 3. Professores (teachers)
-- ============================================================================
drop policy if exists "teachers_select_auth" on public.teachers;
drop policy if exists "teachers_insert_admin" on public.teachers;
drop policy if exists "teachers_update_admin" on public.teachers;
drop policy if exists "teachers_delete_admin" on public.teachers;

create policy "teachers_select_auth"
  on public.teachers for select to authenticated
  using (true);

create policy "teachers_insert_admin"
  on public.teachers for insert to authenticated
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin'));

create policy "teachers_update_admin"
  on public.teachers for update to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin'))
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin'));

create policy "teachers_delete_admin"
  on public.teachers for delete to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin'));

-- ============================================================================
-- 4. Alunos (students)
-- Leitura: equipe autorizada ou o prÃ³prio aluno | Escrita: admin (e professor para foto)
-- ============================================================================
drop policy if exists "students_select_own_or_staff" on public.students;
drop policy if exists "students_insert_admin" on public.students;
drop policy if exists "students_update_staff" on public.students;
drop policy if exists "students_delete_admin" on public.students;

create policy "students_select_own_or_staff"
  on public.students for select to authenticated
  using (
    (select private.current_user_role()) in ('super_admin', 'school_admin', 'coordinator', 'teacher', 'guardian', 'treasury')
    or exists (
      select 1 from public.users u
      where u.id = user_id and u.auth_uid = (select auth.uid())
    )
  );

create policy "students_insert_admin"
  on public.students for insert to authenticated
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin'));

create policy "students_update_staff"
  on public.students for update to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin', 'teacher'))
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin', 'teacher'));

create policy "students_delete_admin"
  on public.students for delete to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin'));

-- ============================================================================
-- 5. Carteiras Digitais (wallets)
-- Leitura: equipe autorizada ou carteira do prÃ³prio aluno
-- ============================================================================
drop policy if exists "wallets_select_own_or_staff" on public.wallets;
drop policy if exists "wallets_insert_staff" on public.wallets;
drop policy if exists "wallets_update_staff" on public.wallets;
drop policy if exists "wallets_delete_admin" on public.wallets;

create policy "wallets_select_own_or_staff"
  on public.wallets for select to authenticated
  using (
    (select private.current_user_role()) in ('super_admin', 'school_admin', 'coordinator', 'teacher', 'guardian', 'treasury')
    or exists (
      select 1
      from public.students s
      join public.users u on u.id = s.user_id
      where s.id = student_id and u.auth_uid = (select auth.uid())
    )
  );

create policy "wallets_insert_staff"
  on public.wallets for insert to authenticated
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin', 'teacher', 'treasury'));

create policy "wallets_update_staff"
  on public.wallets for update to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin', 'teacher', 'treasury'))
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin', 'teacher', 'treasury'));

create policy "wallets_delete_admin"
  on public.wallets for delete to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin'));

-- ============================================================================
-- 6. MissÃµes & Atividades (missions)
-- ============================================================================
drop policy if exists "missions_select_auth" on public.missions;
drop policy if exists "missions_insert_pedagogical" on public.missions;
drop policy if exists "missions_update_pedagogical" on public.missions;
drop policy if exists "missions_delete_pedagogical" on public.missions;

create policy "missions_select_auth"
  on public.missions for select to authenticated
  using (true);

create policy "missions_insert_pedagogical"
  on public.missions for insert to authenticated
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin', 'coordinator', 'teacher'));

create policy "missions_update_pedagogical"
  on public.missions for update to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin', 'coordinator', 'teacher'))
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin', 'coordinator', 'teacher'));

create policy "missions_delete_pedagogical"
  on public.missions for delete to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin', 'coordinator', 'teacher'));

-- ============================================================================
-- 7. CatÃ¡logo de Recompensas (rewards)
-- ============================================================================
drop policy if exists "rewards_select_auth" on public.rewards;
drop policy if exists "rewards_insert_treasury" on public.rewards;
drop policy if exists "rewards_update_treasury_or_redeem" on public.rewards;
drop policy if exists "rewards_delete_treasury" on public.rewards;

create policy "rewards_select_auth"
  on public.rewards for select to authenticated
  using (true);

create policy "rewards_insert_treasury"
  on public.rewards for insert to authenticated
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin', 'treasury'));

create policy "rewards_update_treasury_or_redeem"
  on public.rewards for update to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin', 'treasury', 'student'))
  with check ((select private.current_user_role()) in ('super_admin', 'school_admin', 'treasury', 'student'));

create policy "rewards_delete_treasury"
  on public.rewards for delete to authenticated
  using ((select private.current_user_role()) in ('super_admin', 'school_admin', 'treasury'));

-- ============================================================================
-- PermissÃµes de schema/tabela (RLS continua protegendo anon â€” 0 linhas expostas)
-- ============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to authenticated, service_role;

-- Recarrega imediatamente o cache do PostgREST
notify pgrst, 'reload schema';
