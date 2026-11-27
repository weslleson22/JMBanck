-- ============================================================================
-- Seed: supabase/seed.sql
-- JM Bank — Dados iniciais estruturais (100% idempotente via ON CONFLICT)
--
-- OBS: Contas de login no Supabase Auth (auth.users) são criadas via API Admin
-- oficial executando `npm run db:seed` (scripts/seed.mjs) para manter total
-- compatibilidade com o GoTrue/Supabase Auth.
-- ============================================================================

-- 1. Escolas iniciais
insert into public.schools (id, name, code, city, academic_year, director_name, status)
values
  (
    '11111111-1111-4111-8111-111111111101',
    'Escola Estadual JM Bank',
    'INEP-21048290',
    'São Luís - MA',
    '2026',
    'Helena Costa',
    'active'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Colégio Modelo Educa+',
    'INEP-21048291',
    'São Luís - MA',
    '2026',
    'Carlos Mendes',
    'active'
  )
on conflict (id) do nothing;

-- 2. Ano Letivo
insert into public.academic_years (id, school_id, name, start_date, end_date)
values (
  '22222222-2222-4222-8222-222222222201',
  '11111111-1111-4111-8111-111111111101',
  '2026',
  '2026-02-02',
  '2026-12-18'
)
on conflict (id) do nothing;

-- 3. Séries / Anos Escolares
insert into public.grade_levels (id, school_id, name, stage, order_index, description, status)
values
  (
    '33333333-3333-4333-8333-333333333306',
    '11111111-1111-4111-8111-111111111101',
    '6º Ano - Ensino Fundamental II',
    'Ensino Fundamental II',
    6,
    'Introdução à educação financeira e metas coletivas.',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333307',
    '11111111-1111-4111-8111-111111111101',
    '7º Ano - Ensino Fundamental II',
    'Ensino Fundamental II',
    7,
    'Planejamento financeiro básico e projetos em equipe.',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333308',
    '11111111-1111-4111-8111-111111111101',
    '8º Ano - Ensino Fundamental II',
    'Ensino Fundamental II',
    8,
    'Consumo consciente, poupança e desafios interdisciplinares.',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333309',
    '11111111-1111-4111-8111-111111111101',
    '9º Ano - Ensino Fundamental II',
    'Ensino Fundamental II',
    9,
    'Empreendedorismo jovem, orçamento e preparação para o Ensino Médio.',
    'active'
  )
on conflict (id) do nothing;

-- 4. Turmas
insert into public.classes (id, school_id, grade_level_id, name, shift, academic_year, room, capacity, status)
values
  (
    '44444444-4444-4444-8444-444444444401',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333309',
    '9º Ano A',
    'Matutino',
    '2026',
    'Sala 101',
    35,
    'active'
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333309',
    '9º Ano B',
    'Vespertino',
    '2026',
    'Sala 102',
    35,
    'active'
  ),
  (
    '44444444-4444-4444-8444-444444444403',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333308',
    '8º Ano A',
    'Matutino',
    '2026',
    'Sala 201',
    32,
    'active'
  )
on conflict (id) do nothing;

-- 5. Missões & Atividades iniciais
insert into public.missions (id, school_id, title, description, subject, reward_amount, status)
values
  (
    '55555555-5555-4555-8555-555555555501',
    '11111111-1111-4111-8111-111111111101',
    'Desafio de Educação Financeira — Orçamento Familiar',
    'Monte um planejamento mensal equilibrando receitas, despesas essenciais e reserva de emergência.',
    'Matemática',
    50,
    'active'
  ),
  (
    '55555555-5555-4555-8555-555555555502',
    '11111111-1111-4111-8111-111111111101',
    'Olimpíada Escolar de Porcentagem e Juros',
    'Resolva a lista prática de juros simples e descontos aplicada a compras cotidianas.',
    'Matemática',
    75,
    'active'
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    '11111111-1111-4111-8111-111111111101',
    'Leitura & Resumo Semanal',
    'Entregue a resenha crítica da leitura indicada pela coordenação pedagógica.',
    'Português',
    40,
    'active'
  )
on conflict (id) do nothing;

-- 6. Recompensas iniciais
insert into public.rewards (id, name, price, stock, status)
values
  (
    '66666666-6666-4666-8666-666666666601',
    'Caderno Personalizado JM Bank',
    80,
    25,
    'active'
  ),
  (
    '66666666-6666-4666-8666-666666666602',
    'Kit Canetas Coloridas',
    45,
    40,
    'active'
  ),
  (
    '66666666-6666-4666-8666-666666666603',
    'Vale Lanche Especial na Cantina',
    60,
    30,
    'active'
  ),
  (
    '66666666-6666-4666-8666-666666666604',
    'Livro de Empreendedorismo Jovem',
    120,
    15,
    'active'
  )
on conflict (id) do nothing;

