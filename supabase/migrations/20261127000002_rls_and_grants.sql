-- ============================================================================
-- Migration: 20261127000002_rls_and_grants
-- JM Bank — Row Level Security (RLS) baseado em papéis + propriedade (ownership),
-- helper em schema privado (não exposto na API) e recarga do cache PostgREST.
-- 100% idempotente (seguro para reexecução).
-- ============================================================================

-- Schema privado (não exposto via PostgREST) para helper de papel RBAC
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

-- Limpa políticas legadas genéricas caso existam
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
-- Leitura: qualquer usuário autenticado | Escrita: super_admin, school_admin
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
-- 2. Usuários (users)
-- Leitura: próprio perfil ou equipe autorizada | Escrita: super_admin, school_admin
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
-- Leitura: equipe autorizada ou o próprio aluno | Escrita: admin (e professor para foto)
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
-- Leitura: equipe autorizada ou carteira do próprio aluno
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
-- 6. Missões & Atividades (missions)
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
-- 7. Catálogo de Recompensas (rewards)
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
-- Permissões de schema/tabela (RLS continua protegendo anon — 0 linhas expostas)
-- ============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to authenticated, service_role;

-- Recarrega imediatamente o cache do PostgREST
notify pgrst, 'reload schema';
