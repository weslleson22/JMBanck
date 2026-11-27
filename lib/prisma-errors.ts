import { NextResponse } from 'next/server';

export interface FormattedDbError {
  message: string;
  code: string;
  hint: string;
  httpStatus: number;
  raw?: string;
}

export function formatDbError(err: any, context = 'banco de dados'): FormattedDbError {
  const rawMessage = String(err?.message ?? err ?? 'Erro desconhecido');
  const code = String(err?.code ?? 'DB_ERROR');
  const lower = rawMessage.toLowerCase();

  if (
    code === 'P1012' ||
    lower.includes('environment variable not found: database_url') ||
    lower.includes('database_url')
  ) {
    return {
      message: 'A variável de ambiente DATABASE_URL não está configurada ou é inválida.',
      code: 'MISSING_ENV_VARS',
      hint: 'Configure DATABASE_URL no arquivo .env ou nas variáveis de ambiente do deploy (ex.: Vercel).',
      httpStatus: 503,
      raw: rawMessage,
    };
  }

  if (
    code === 'P1001' ||
    code === 'P1002' ||
    code === 'P1008' ||
    code === 'P1017' ||
    lower.includes("can't reach database server") ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('timed out')
  ) {
    return {
      message: `Não foi possível conectar ao servidor PostgreSQL (${context}).`,
      code: code === 'DB_ERROR' ? 'NETWORK_ERROR' : code,
      hint: 'Verifique se DATABASE_URL está correta, se o banco Prisma Postgres está ativo e se há acesso de rede.',
      httpStatus: 503,
      raw: rawMessage,
    };
  }

  if (
    code === 'P1000' ||
    lower.includes('authentication failed') ||
    lower.includes('password authentication failed')
  ) {
    return {
      message: 'Falha de autenticação no PostgreSQL: usuário ou senha incorretos em DATABASE_URL.',
      code: 'INVALID_DB_CREDENTIALS',
      hint: 'Revise as credenciais na variável DATABASE_URL do .env ou painel de deploy.',
      httpStatus: 503,
      raw: rawMessage,
    };
  }

  if (
    code === 'P2021' ||
    code === 'P2022' ||
    lower.includes('does not exist') ||
    lower.includes('relation')
  ) {
    return {
      message: `Tabela ou coluna não encontrada no PostgreSQL ao acessar ${context}.`,
      code: 'MISSING_TABLES',
      hint: 'Execute as migrations do Prisma ("npx prisma migrate deploy") e a seed ("npm run db:seed").',
      httpStatus: 503,
      raw: rawMessage,
    };
  }

  if (code === 'P2002' || lower.includes('unique constraint')) {
    return {
      message: 'Registro duplicado: já existe um registro com este valor único no banco.',
      code: 'DUPLICATE_RECORD',
      hint: 'Verifique se o e-mail ou matrícula informados já estão cadastrados.',
      httpStatus: 409,
      raw: rawMessage,
    };
  }

  if (code === 'P2003' || lower.includes('foreign key constraint')) {
    return {
      message: 'Vínculo inválido entre tabelas (chave estrangeira).',
      code: 'FOREIGN_KEY_VIOLATION',
      hint: 'Verifique se o registro relacionado (escola, série, turma ou aluno) existe.',
      httpStatus: 409,
      raw: rawMessage,
    };
  }

  if (code === 'P2025' || lower.includes('record to update not found') || lower.includes('record to delete does not exist')) {
    return {
      message: `Registro não encontrado em ${context}.`,
      code: 'NOT_FOUND',
      hint: 'Atualize a página e verifique se o registro ainda existe no banco de dados.',
      httpStatus: 404,
      raw: rawMessage,
    };
  }

  return {
    message: `Erro ao acessar ${context} no banco de dados: ${rawMessage}`,
    code,
    hint: 'Verifique os logs do servidor e o status da conexão com o PostgreSQL.',
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

