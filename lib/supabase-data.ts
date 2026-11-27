import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseServer } from './supabase';
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  validateSupabaseEnv,
} from './env';

export interface FormattedDbError {
  message: string;
  code: string;
  hint: string;
  httpStatus: number;
  raw?: string;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!url || !serviceKey) return null;
  return createSupabaseJsClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Returns both the cookie-scoped auth client (for reading current session)
 * and the best available DB client (service role when configured, else cookie client).
 */
export async function getServerDbContext() {
  const env = validateSupabaseEnv();
  if (!env.ok) {
    throw new Error(
      `Variáveis de ambiente do Supabase ausentes ou inválidas: ${env.missingRequired.join(', ')}.`
    );
  }

  const authClient = await supabaseServer();
  const adminClient = getSupabaseAdminClient();
  return {
    authClient,
    adminClient,
    db: adminClient ?? authClient,
    hasServiceRole: Boolean(adminClient),
  };
}

export function formatDbError(err: any, context = 'banco de dados'): FormattedDbError {
  const rawMessage = String(err?.message ?? err ?? 'Erro desconhecido');
  const code = String(err?.code ?? err?.status ?? 'DB_ERROR');
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('variáveis de ambiente') ||
    lower.includes('supabaseurl') ||
    lower.includes('supabasekey')
  ) {
    return {
      message: rawMessage,
      code: 'MISSING_ENV_VARS',
      hint: 'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) no .env.local ou no painel de deploy.',
      httpStatus: 503,
      raw: rawMessage,
    };
  }

  if (
    lower.includes('fetch failed') ||
    lower.includes('enotfound') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('network') ||
    lower.includes('abort')
  ) {
    return {
      message: `Não foi possível conectar ao servidor do banco de dados (${context}).`,
      code: 'NETWORK_ERROR',
      hint: 'Verifique se NEXT_PUBLIC_SUPABASE_URL está correta, se o projeto Supabase não está pausado e se há conectividade de rede no ambiente de deploy.',
      httpStatus: 503,
      raw: rawMessage,
    };
  }

  if (
    lower.includes('invalid api key') ||
    lower.includes('jwt') ||
    code === '401' ||
    lower.includes('apikey')
  ) {
    return {
      message: 'Chave de API do Supabase inválida ou expirada.',
      code: 'INVALID_API_KEY',
      hint: 'Revise NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no painel do Supabase (Project Settings > API).',
      httpStatus: 503,
      raw: rawMessage,
    };
  }

  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    lower.includes('could not find the table') ||
    lower.includes('does not exist')
  ) {
    return {
      message: `Tabela obrigatória não encontrada no banco de dados ao consultar ${context}.`,
      code: code || 'MISSING_TABLE',
      hint: 'Verifique se todas as tabelas do esquema SQL foram criadas no seu projeto Supabase.',
      httpStatus: 503,
      raw: rawMessage,
    };
  }

  if (
    code === '42501' ||
    lower.includes('row-level security') ||
    lower.includes('permission denied')
  ) {
    return {
      message: `Permissão negada pelo banco de dados (RLS) ao acessar ${context}.`,
      code: 'RLS_PERMISSION_DENIED',
      hint: 'Configure SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do servidor ou ajuste as políticas RLS no Supabase.',
      httpStatus: 403,
      raw: rawMessage,
    };
  }

  if (code === '23505' || lower.includes('duplicate key')) {
    return {
      message: 'Registro duplicado: já existe um registro com este valor único no banco.',
      code: 'DUPLICATE_RECORD',
      hint: 'Verifique se o e-mail, matrícula ou identificador já foi cadastrado.',
      httpStatus: 409,
      raw: rawMessage,
    };
  }

  if (code === '23503' || lower.includes('foreign key')) {
    return {
      message: 'Violação de vínculo entre tabelas (chave estrangeira) no banco de dados.',
      code: 'FOREIGN_KEY_VIOLATION',
      hint: 'Certifique-se de que o registro relacionado (ex.: escola, série ou turma) existe ou não possui dependências antes de excluir.',
      httpStatus: 409,
      raw: rawMessage,
    };
  }

  return {
    message: `Erro ao acessar ${context} no banco de dados: ${rawMessage}`,
    code,
    hint: 'Verifique os logs do servidor e o status do seu projeto no painel do Supabase.',
    httpStatus: 500,
    raw: rawMessage,
  };
}

export function dbErrorResponse(err: any, context: string) {
  const formatted = formatDbError(err, context);
  return NextResponse.json(
    {
      error: true,
      message: formatted.message,
      code: formatted.code,
      hint: formatted.hint,
      raw: formatted.raw,
    },
    { status: formatted.httpStatus }
  );
}

/**
 * Inserts a record into Supabase with full fields; if PostgREST reports PGRST204
 * (optional column absent in the user's current table schema), retries with core columns.
 */
export async function insertWithSchemaFallback(
  db: SupabaseClient,
  table: string,
  fullPayload: Record<string, any>,
  corePayload: Record<string, any>
) {
  const first = await db.from(table).insert(fullPayload).select().single();
  if (!first.error) return first;

  const isSchemaColErr =
    first.error.code === 'PGRST204' ||
    first.error.code === '42703' ||
    String(first.error.message).toLowerCase().includes('could not find the');

  if (isSchemaColErr) {
    return await db.from(table).insert(corePayload).select().single();
  }
  return first;
}

/**
 * Updates a record in Supabase with full fields; if PostgREST reports PGRST204
 * (optional column absent in the user's current table schema), retries with core columns.
 */
export async function updateWithSchemaFallback(
  db: SupabaseClient,
  table: string,
  id: string,
  fullPayload: Record<string, any>,
  corePayload: Record<string, any>
) {
  const first = await db.from(table).update(fullPayload).eq('id', id).select().single();
  if (!first.error) return first;

  const isSchemaColErr =
    first.error.code === 'PGRST204' ||
    first.error.code === '42703' ||
    String(first.error.message).toLowerCase().includes('could not find the');

  if (isSchemaColErr && Object.keys(corePayload).length > 0) {
    return await db.from(table).update(corePayload).eq('id', id).select().single();
  }
  return first;
}
