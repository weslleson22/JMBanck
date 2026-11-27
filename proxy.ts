import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Executa apenas em rotas de página, excluindo APIs, estáticos, fontes e metadados
     * para evitar invocações desnecessárias e reduzir Fast Origin Transfer na Vercel.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js|map)$).*)',
  ],
};
