import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Ensures direct PostgreSQL connections in serverless/production environments
 * use a strict per-instance connection limit so parallel requests and warm
 * lambdas never exhaust managed Postgres role connection limits (e.g. db.prisma.io).
 */
function getOptimizedDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;

  // Prisma Accelerate URLs (prisma+postgres://) already have built-in pooling
  if (!raw.startsWith('postgres://') && !raw.startsWith('postgresql://')) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', isProd ? '1' : '3');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '20');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '15');
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient() {
  const optimizedUrl = getOptimizedDatabaseUrl();
  return new PrismaClient({
    ...(optimizedUrl ? { datasources: { db: { url: optimizedUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

// Always cache singleton on globalThis (including in production warm serverless containers)
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
