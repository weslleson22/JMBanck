import { prisma } from './prisma';
import { validateDatabaseEnv, type EnvVarCheck } from './env';
import { formatDbError } from './prisma-errors';

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
  databaseHost: string | null;
  supabaseHost?: string | null;
  usingServiceRole?: boolean;
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
  'academic_years',
  'grade_levels',
  'classes',
  'users',
  'teachers',
  'students',
  'wallets',
  'missions',
  'rewards',
] as const;

// Short TTL cache (30s) ONLY for healthy results in production warm containers
// to avoid hitting information_schema on every /api/health + /api/auth/login pair.
// Failures are NEVER cached so errors surface and recover immediately.
let cachedHealthyReport: { expiresAt: number; report: DatabaseHealthReport } | null = null;
const HEALTH_CACHE_TTL_MS = 30_000;

export async function checkDatabaseHealth(options?: { bypassCache?: boolean }): Promise<DatabaseHealthReport> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  const env = validateDatabaseEnv();

  if (
    env.isProduction &&
    !options?.bypassCache &&
    cachedHealthyReport &&
    cachedHealthyReport.expiresAt > Date.now()
  ) {
    return {
      ...cachedHealthyReport.report,
      checkedAt,
      latencyMs: 0,
    };
  }

  if (!env.ok || !env.databaseUrl) {
    return {
      ok: false,
      checkedAt,
      environment: env.environment,
      isProduction: env.isProduction,
      latencyMs: Date.now() - started,
      databaseHost: env.databaseHost,
      supabaseHost: env.databaseHost,
      envVars: env.checks,
      warnings: env.warnings,
      tables: [],
      missingTables: [],
      errorCode: 'MISSING_ENV_VARS',
      errorMessage: `Variáveis de ambiente obrigatórias ausentes ou inválidas: ${env.missingRequired.join(', ')}.`,
      hint: 'Configure DATABASE_URL no arquivo .env ou nas variáveis de ambiente do deploy (ex.: Vercel) e reinicie a aplicação.',
    };
  }

  // Single lightweight query validates BOTH live PostgreSQL connectivity AND all 10 tables
  // using only 1 database connection (avoids exhausting connection limits in serverless deploys).
  let existingTableSet = new Set<string>();
  try {
    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    existingTableSet = new Set(rows.map((r) => r.table_name));
  } catch (err: any) {
    const formatted = formatDbError(err, 'PostgreSQL (Prisma)');
    return {
      ok: false,
      checkedAt,
      environment: env.environment,
      isProduction: env.isProduction,
      latencyMs: Date.now() - started,
      databaseHost: env.databaseHost,
      supabaseHost: env.databaseHost,
      envVars: env.checks,
      warnings: env.warnings,
      tables: [],
      missingTables: [],
      errorCode: formatted.code,
      errorMessage: formatted.message,
      hint: formatted.hint,
    };
  }

  const missingTables = CORE_TABLES.filter((t) => !existingTableSet.has(t));
  const latencyMs = Date.now() - started;

  if (missingTables.length > 0) {
    return {
      ok: false,
      checkedAt,
      environment: env.environment,
      isProduction: env.isProduction,
      latencyMs,
      databaseHost: env.databaseHost,
      supabaseHost: env.databaseHost,
      envVars: env.checks,
      warnings: env.warnings,
      tables: CORE_TABLES.map((table) => ({
        table,
        ok: existingTableSet.has(table),
        error: existingTableSet.has(table) ? undefined : 'Tabela ausente no banco',
        code: existingTableSet.has(table) ? undefined : 'MISSING_TABLE',
      })),
      missingTables: [...missingTables],
      errorCode: 'MISSING_TABLES',
      errorMessage: `Conexão com o PostgreSQL (Prisma) estabelecida, mas faltam ${missingTables.length} tabela(s): ${missingTables.join(', ')}.`,
      hint: 'Execute "npx prisma migrate deploy" e "npm run db:seed" para aplicar as migrations e popular o banco.',
    };
  }

  const tableResults: TableHealthStatus[] = CORE_TABLES.map((table) => ({
    table,
    ok: true,
  }));

  const warnings = [...env.warnings];
  let devUsers: DevDatabaseUser[] | undefined;

  if (!env.isProduction) {
    const users = await prisma.user.findMany({
      where: { status: 'active' },
      select: { email: true, name: true, role: true },
      orderBy: { email: 'asc' },
      take: 20,
    });
    devUsers = users;
    if (users.length === 0) {
      warnings.push(
        'Nenhum usuário ativo encontrado na tabela users. Execute "npm run db:seed" para criar os usuários iniciais.'
      );
    }
  }

  const healthyReport: DatabaseHealthReport = {
    ok: true,
    checkedAt,
    environment: env.environment,
    isProduction: env.isProduction,
    latencyMs: Date.now() - started,
    databaseHost: env.databaseHost,
    supabaseHost: env.databaseHost,
    envVars: env.checks,
    warnings,
    tables: tableResults,
    missingTables: [],
    devUsers,
    errorCode: null,
    errorMessage: null,
    hint: null,
  };

  if (env.isProduction) {
    cachedHealthyReport = {
      expiresAt: Date.now() + HEALTH_CACHE_TTL_MS,
      report: healthyReport,
    };
  }

  return healthyReport;
}
