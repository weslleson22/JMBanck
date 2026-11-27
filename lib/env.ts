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
  supabaseUrl: string | null;
  supabasePublicKey: string | null;
  supabaseServiceRoleKey: string | null;
  supabaseHost: string | null;
  checks: EnvVarCheck[];
  missingRequired: string[];
  warnings: string[];
}

function isPlaceholderValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  return (
    v.includes('<your') ||
    v.includes('your-project') ||
    v.includes('your-anon-key') ||
    v.includes('your-service-role') ||
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

export function getSupabaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return raw ? raw : null;
}

export function getSupabasePublicKey(): string | null {
  const raw = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  return raw ? raw : null;
}

export function getSupabaseServiceRoleKey(): string | null {
  const raw = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY
  )?.trim();
  return raw ? raw : null;
}

export function validateSupabaseEnv(): EnvValidationResult {
  const isProduction = isProductionDeploy();
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

  const url = getSupabaseUrl();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
  const publicKey = publishableKey || anonKey;
  const serviceKey = getSupabaseServiceRoleKey();

  const checks: EnvVarCheck[] = [];
  const missingRequired: string[] = [];
  const warnings: string[] = [];

  // 1. NEXT_PUBLIC_SUPABASE_URL
  let supabaseHost: string | null = null;
  if (!url) {
    checks.push({
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      required: true,
      configured: false,
      valid: false,
      issue: 'Variável ausente. Defina a URL do projeto Supabase (ex.: https://xxxx.supabase.co).',
    });
    missingRequired.push('NEXT_PUBLIC_SUPABASE_URL');
  } else if (isPlaceholderValue(url)) {
    checks.push({
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      required: true,
      configured: true,
      valid: false,
      issue: 'Contém valor de exemplo/placeholder em vez da URL real do Supabase.',
    });
    missingRequired.push('NEXT_PUBLIC_SUPABASE_URL');
  } else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Protocolo inválido');
      }
      supabaseHost = parsed.host;
      checks.push({
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        required: true,
        configured: true,
        valid: true,
      });
    } catch {
      checks.push({
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        required: true,
        configured: true,
        valid: false,
        issue: 'Formato de URL inválido. Deve iniciar com https://',
      });
      missingRequired.push('NEXT_PUBLIC_SUPABASE_URL');
    }
  }

  // 2. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY
  const publicKeyVarName = publishableKey
    ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    : anonKey
      ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      : 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY)';

  if (!publicKey) {
    checks.push({
      name: publicKeyVarName,
      required: true,
      configured: false,
      valid: false,
      issue:
        'Chave pública do Supabase ausente. Configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    });
    missingRequired.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  } else if (isPlaceholderValue(publicKey) || publicKey.length < 20) {
    checks.push({
      name: publicKeyVarName,
      required: true,
      configured: true,
      valid: false,
      issue: 'Chave pública do Supabase inválida ou incompleta.',
    });
    missingRequired.push(publicKeyVarName);
  } else {
    checks.push({
      name: publicKeyVarName,
      required: true,
      configured: true,
      valid: true,
    });
  }

  // 3. SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY (server-side admin operations)
  const serviceKeyVarName = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ? 'SUPABASE_SERVICE_ROLE_KEY'
    : process.env.SUPABASE_SECRET_KEY?.trim()
      ? 'SUPABASE_SECRET_KEY'
      : 'SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY)';

  if (!serviceKey) {
    checks.push({
      name: serviceKeyVarName,
      required: false,
      configured: false,
      valid: false,
      issue:
        'Não configurada no servidor. Necessária para criar/editar senhas de outros usuários no Supabase Auth e consultas administrativas sem restrição RLS.',
    });
    warnings.push(
      'SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) não está configurada: criação/redefinição de senhas de outros usuários e consultas administrativas podem ser limitadas.'
    );
  } else if (isPlaceholderValue(serviceKey) || serviceKey.length < 20) {
    checks.push({
      name: serviceKeyVarName,
      required: false,
      configured: true,
      valid: false,
      issue: 'Chave Service Role / Secret Key inválida ou com valor de exemplo.',
    });
    warnings.push(
      'SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY parece inválida. Verifique o valor no painel Supabase.'
    );
  } else {
    checks.push({
      name: serviceKeyVarName,
      required: false,
      configured: true,
      valid: true,
    });
  }

  return {
    ok: missingRequired.length === 0,
    isProduction,
    environment,
    supabaseUrl: url,
    supabasePublicKey: publicKey,
    supabaseServiceRoleKey: serviceKey,
    supabaseHost,
    checks,
    missingRequired,
    warnings,
  };
}

