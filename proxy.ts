import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Executa em todas as rotas de página, excluindo:
     * - /api (rotas de API fazem sua própria autenticação/RBAC)
     * - _next/static e _next/image (arquivos estáticos/otimizados)
     * - favicon.ico e arquivos de mídia estáticos
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

