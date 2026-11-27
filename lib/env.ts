export interface EnvVarCheck {
  name: string;
  required: boolean;
  configured: boolean;
  valid: boolean;
  issue?: string;
}

export interface EnvValidationResult {
  ok: boolean;
  isProduction: boolean;
  environment: string;
  databaseUrl: string | null;
  databaseHost: string | null;
  authSecretConfigured: boolean;
  checks: EnvVarCheck[];
  missingRequired: string[];
  warnings: string[];
}

function isPlaceholderValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  return (
    v.includes('<user>') ||
    v.includes('<password>') ||
    v.includes('<host>') ||
    v.includes('placeholder') ||
    v === 'changeme'
  );
}

export function isProductionDeploy(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    process.env.NEXT_PUBLIC_STRICT_DB === 'true'
  );
}

export function getDatabaseUrl(): string | null {
  const raw = process.env.DATABASE_URL?.trim();
  return raw ? raw : null;
}

export function getAuthSecretEnv(): string | null {
  const raw = process.env.AUTH_SECRET?.trim();
  return raw ? raw : null;
}

export function validateDatabaseEnv(): EnvValidationResult {
  const isProduction = isProductionDeploy();
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

  const databaseUrl = getDatabaseUrl();
  const authSecret = getAuthSecretEnv();

  const checks: EnvVarCheck[] = [];
  const missingRequired: string[] = [];
  const warnings: string[] = [];
  let databaseHost: string | null = null;

  // 1. DATABASE_URL (obrigatória para Prisma PostgreSQL)
  if (!databaseUrl) {
    checks.push({
      name: 'DATABASE_URL',
      required: true,
      configured: false,
      valid: false,
      issue:
        'Variável ausente. Configure a string de conexão PostgreSQL (postgres://...) no .env ou no painel de deploy.',
    });
    missingRequired.push('DATABASE_URL');
  } else if (isPlaceholderValue(databaseUrl)) {
    checks.push({
      name: 'DATABASE_URL',
      required: true,
      configured: true,
      valid: false,
      issue: 'Contém valor de exemplo/placeholder em vez da URL real do PostgreSQL.',
    });
    missingRequired.push('DATABASE_URL');
  } else {
    try {
      const parsed = new URL(databaseUrl);
      if (
        parsed.protocol !== 'postgres:' &&
        parsed.protocol !== 'postgresql:' &&
        parsed.protocol !== 'prisma+postgres:'
      ) {
        throw new Error('Protocolo inválido');
      }
      databaseHost = parsed.host;
      checks.push({
        name: 'DATABASE_URL',
        required: true,
        configured: true,
        valid: true,
      });
    } catch {
      checks.push({
        name: 'DATABASE_URL',
        required: true,
        configured: true,
        valid: false,
        issue: 'Formato inválido. Deve iniciar com postgres:// ou postgresql://.',
      });
      missingRequired.push('DATABASE_URL');
    }
  }

  // 2. AUTH_SECRET (recomendada para assinatura de sessão)
  if (!authSecret) {
    checks.push({
      name: 'AUTH_SECRET',
      required: false,
      configured: false,
      valid: false,
      issue:
        'Não definida explicitamente. Usando chave derivada de DATABASE_URL (defina AUTH_SECRET no deploy para maior segurança).',
    });
    warnings.push(
      'Recomenda-se configurar AUTH_SECRET com ao menos 32 caracteres nas variáveis de ambiente do deploy.'
    );
  } else if (authSecret.length < 16 || isPlaceholderValue(authSecret)) {
    checks.push({
      name: 'AUTH_SECRET',
      required: false,
      configured: true,
      valid: false,
      issue: 'AUTH_SECRET muito curta ou com valor de exemplo (use ao menos 32 caracteres).',
    });
    warnings.push('AUTH_SECRET parece fraca; defina uma chave aleatória de 32+ caracteres.');
  } else {
    checks.push({
      name: 'AUTH_SECRET',
      required: false,
      configured: true,
      valid: true,
    });
  }

  return {
    ok: missingRequired.length === 0,
    isProduction,
    environment,
    databaseUrl,
    databaseHost,
    authSecretConfigured: Boolean(authSecret && authSecret.length >= 16),
    checks,
    missingRequired,
    warnings,
  };
}

// Compatibility aliases
export const validateSupabaseEnv = validateDatabaseEnv;
