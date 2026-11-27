import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { validateSupabaseEnv, type EnvVarCheck } from './env';
import { formatDbError } from './supabase-data';

export interface TableHealthStatus {
  table: string;
  ok: boolean;
  count?: number;
  error?: string;
  code?: string;
}

export interface DevDatabaseUser {
  email: string;
  name: string;
  role: string;
}

export interface DatabaseHealthReport {
  ok: boolean;
  checkedAt: string;
  environment: string;
  isProduction: boolean;
  latencyMs: number;
  supabaseHost: string | null;
  usingServiceRole: boolean;
  envVars: EnvVarCheck[];
  warnings: string[];
  tables: TableHealthStatus[];
  missingTables: string[];
  devUsers?: DevDatabaseUser[];
  errorCode: string | null;
  errorMessage: string | null;
  hint: string | null;
}

const CORE_TABLES = [
  'schools',
  'grade_levels',
  'classes',
  'users',
  'teachers',
  'students',
  'wallets',
  'missions',
  'rewards',
] as const;

export async function checkDatabaseHealth(): Promise<DatabaseHealthReport> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  const env = validateSupabaseEnv();

  if (!env.ok || !env.supabaseUrl || !env.supabasePublicKey) {
    return {
      ok: false,
      checkedAt,
      environment: env.environment,
      isProduction: env.isProduction,
      latencyMs: Date.now() - started,
      supabaseHost: env.supabaseHost,
      usingServiceRole: false,
      envVars: env.checks,
      warnings: env.warnings,
      tables: [],
      missingTables: [],
      errorCode: 'MISSING_ENV_VARS',
      errorMessage: `Variáveis de ambiente obrigatórias ausentes ou inválidas: ${env.missingRequired.join(', ')}.`,
      hint: 'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) nas variáveis de ambiente do deploy (ex.: Vercel / .env.local) e reinicie a aplicação.',
    };
  }

  // 1. Probe Supabase Auth endpoint with an explicit timeout so deploy never hangs
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const authHealthRes = await fetch(`${env.supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, {
        headers: {
          apikey: env.supabasePublicKey,
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (authHealthRes.status === 401 || authHealthRes.status === 403) {
        return {
          ok: false,
          checkedAt,
          environment: env.environment,
          isProduction: env.isProduction,
          latencyMs: Date.now() - started,
          supabaseHost: env.supabaseHost,
          usingServiceRole: Boolean(env.supabaseServiceRoleKey),
          envVars: env.checks,
          warnings: env.warnings,
          tables: [],
          missingTables: [],
          errorCode: 'INVALID_API_KEY',
          errorMessage: `O Supabase recusou a chave de API (HTTP ${authHealthRes.status}).`,
          hint: 'Verifique se NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) corresponde à chave ativa do seu projeto Supabase.',
        };
      }

      if (!authHealthRes.ok && authHealthRes.status >= 500) {
        return {
          ok: false,
          checkedAt,
          environment: env.environment,
          isProduction: env.isProduction,
          latencyMs: Date.now() - started,
          supabaseHost: env.supabaseHost,
          usingServiceRole: Boolean(env.supabaseServiceRoleKey),
          envVars: env.checks,
          warnings: env.warnings,
          tables: [],
          missingTables: [],
          errorCode: `SUPABASE_HTTP_${authHealthRes.status}`,
          errorMessage: `Serviço de autenticação do Supabase indisponível (HTTP ${authHealthRes.status}).`,
          hint: 'Verifique no painel do Supabase se o projeto está ativo (não pausado) e saudável.',
        };
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (networkErr: any) {
    const formatted = formatDbError(networkErr, 'Supabase Auth');
    return {
      ok: false,
      checkedAt,
      environment: env.environment,
      isProduction: env.isProduction,
      latencyMs: Date.now() - started,
      supabaseHost: env.supabaseHost,
      usingServiceRole: Boolean(env.supabaseServiceRoleKey),
      envVars: env.checks,
      warnings: env.warnings,
      tables: [],
      missingTables: [],
      errorCode: formatted.code,
      errorMessage: formatted.message,
      hint: formatted.hint,
    };
  }

  // 2. Probe PostgreSQL tables via Supabase REST using GET (NOT HEAD, because PostgREST
  // can return HTTP 204 with empty body on HEAD for missing tables when using sb_publishable keys)
  const serviceCheck = env.checks.find((c) => c.name.startsWith('SUPABASE_'));
  const usingServiceRole = Boolean(env.supabaseServiceRoleKey && serviceCheck?.valid);
  const clientKey = usingServiceRole ? env.supabaseServiceRoleKey! : env.supabasePublicKey;

  const client = createSupabaseJsClient(env.supabaseUrl, clientKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tableResults: TableHealthStatus[] = await Promise.all(
    CORE_TABLES.map(async (table) => {
      try {
        const { count, error } = await client
          .from(table)
          .select('id', { count: 'exact' })
          .limit(1);
        if (error) {
          return {
            table,
            ok: false,
            error: error.message,
            code: error.code,
          };
        }
        return {
          table,
          ok: true,
          count: count ?? 0,
        };
      } catch (e: any) {
        return {
          table,
          ok: false,
          error: e?.message ?? 'Erro ao consultar tabela',
          code: 'QUERY_ERROR',
        };
      }
    })
  );

  const latencyMs = Date.now() - started;

  const missingTables = tableResults
    .filter(
      (t) =>
        !t.ok &&
        (t.code === 'PGRST205' ||
          t.code === '42P01' ||
          (t.error ?? '').toLowerCase().includes('could not find the table') ||
          (t.error ?? '').toLowerCase().includes('does not exist'))
    )
    .map((t) => t.table);

  const invalidKeyError = tableResults.find(
    (t) =>
      !t.ok &&
      ((t.error ?? '').toLowerCase().includes('invalid api key') ||
        (t.error ?? '').toLowerCase().includes('jwt') ||
        t.code === '401')
  );

  if (invalidKeyError) {
    return {
      ok: false,
      checkedAt,
      environment: env.environment,
      isProduction: env.isProduction,
      latencyMs,
      supabaseHost: env.supabaseHost,
      usingServiceRole,
      envVars: env.checks,
      warnings: env.warnings,
      tables: tableResults,
      missingTables,
      errorCode: 'INVALID_API_KEY',
      errorMessage: `Chave de acesso ao banco de dados rejeitada: ${invalidKeyError.error}`,
      hint: usingServiceRole
        ? 'Verifique a variável SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) no painel do Supabase.'
        : 'Verifique a variável NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  const networkTableErr = tableResults.find(
    (t) =>
      !t.ok &&
      ((t.error ?? '').toLowerCase().includes('fetch failed') ||
        (t.error ?? '').toLowerCase().includes('enotfound') ||
        (t.error ?? '').toLowerCase().includes('network'))
  );

  if (networkTableErr) {
    const formatted = formatDbError(new Error(networkTableErr.error), 'PostgreSQL');
    return {
      ok: false,
      checkedAt,
      environment: env.environment,
      isProduction: env.isProduction,
      latencyMs,
      supabaseHost: env.supabaseHost,
      usingServiceRole,
      envVars: env.checks,
      warnings: env.warnings,
      tables: tableResults,
      missingTables,
      errorCode: formatted.code,
      errorMessage: formatted.message,
      hint: formatted.hint,
    };
  }

  if (missingTables.length > 0) {
    return {
      ok: false,
      checkedAt,
      environment: env.environment,
      isProduction: env.isProduction,
      latencyMs,
      supabaseHost: env.supabaseHost,
      usingServiceRole,
      envVars: env.checks,
      warnings: env.warnings,
      tables: tableResults,
      missingTables,
      errorCode: 'MISSING_TABLES',
      errorMessage: `Conexão com o Supabase estabelecida, mas faltam ${missingTables.length} tabela(s) no banco: ${missingTables.join(', ')}.`,
      hint: 'Execute o arquivo supabase/schema.sql no SQL Editor do painel Supabase para criar as tabelas e depois cadastre seus usuários (ex.: via node scripts/create_test_accounts.mjs).',
    };
  }

  // Note: If anon key is used before login, RLS might return 42501 on protected tables;
  // check if ANY table failed with non-RLS error.
  const hardErrors = tableResults.filter(
    (t) =>
      !t.ok &&
      t.code !== '42501' &&
      !(t.error ?? '').toLowerCase().includes('permission denied')
  );

  if (hardErrors.length > 0) {
    const first = hardErrors[0];
    return {
      ok: false,
      checkedAt,
      environment: env.environment,
      isProduction: env.isProduction,
      latencyMs,
      supabaseHost: env.supabaseHost,
      usingServiceRole,
      envVars: env.checks,
      warnings: env.warnings,
      tables: tableResults,
      missingTables,
      errorCode: first.code ?? 'DB_QUERY_ERROR',
      errorMessage: `Erro ao validar tabela "${first.table}" no banco de dados: ${first.error}`,
      hint: 'Verifique a configuração do banco de dados e permissões no painel do Supabase.',
    };
  }

  const rlsBlockedTables = tableResults
    .filter(
      (t) =>
        !t.ok &&
        (t.code === '42501' || (t.error ?? '').toLowerCase().includes('permission denied'))
    )
    .map((t) => t.table);

  const warnings = [...env.warnings];
  if (rlsBlockedTables.length > 0 && !usingServiceRole) {
    warnings.push(
      `Tabelas protegidas por RLS antes do login (${rlsBlockedTables.join(', ')}). Configure SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) no servidor para leitura administrativa completa.`
    );
  }

  // In local development only, fetch real users currently in `public.users` (emails only, never passwords)
  let devUsers: DevDatabaseUser[] | undefined;
  if (!env.isProduction) {
    const { data: realUsers } = await client
      .from('users')
      .select('email, name, role')
      .order('email', { ascending: true })
      .limit(20);
    if (Array.isArray(realUsers)) {
      devUsers = realUsers
        .filter((u: any) => Boolean(u?.email))
        .map((u: any) => ({
          email: String(u.email),
          name: String(u.name ?? u.email),
          role: String(u.role ?? 'student'),
        }));
      if (devUsers.length === 0) {
        warnings.push(
          'A tabela public.users está vazia. Execute "node scripts/create_test_accounts.mjs" (com SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY) ou crie usuários no Supabase Auth.'
        );
      }
    }
  }

  return {
    ok: true,
    checkedAt,
    environment: env.environment,
    isProduction: env.isProduction,
    latencyMs,
    supabaseHost: env.supabaseHost,
    usingServiceRole,
    envVars: env.checks,
    warnings,
    tables: tableResults,
    missingTables: [],
    devUsers,
    errorCode: null,
    errorMessage: null,
    hint: null,
  };
}
