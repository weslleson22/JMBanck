'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  setStoredDemoUser,
  canAccessRoute,
  ROLE_HOME_PATH,
  type DemoUser,
} from '@/lib/client';
import { ShieldAlert, ArrowLeft, LogIn, Loader2 } from 'lucide-react';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import Link from 'next/link';

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);

  const verify = async () => {
    setChecking(true);
    setDbError(null);
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));

      if (res.status === 503 || json?.code === 'DB_CONNECTION_ERROR') {
        setUser(null);
        setStoredDemoUser(null);
        setDbError({
          message:
            json?.message ?? 'Não foi possível conectar ao banco de dados para validar sua sessão.',
          code: json?.code,
          hint: json?.hint,
        });
        return;
      }

      if (res.ok && json?.authenticated && json?.user) {
        const verifiedUser: DemoUser = {
          id: json.user.id,
          email: json.user.email,
          name: json.user.name,
          role: json.user.role,
          roleLabel: json.user.roleLabel,
        };
        setUser(verifiedUser);
        setStoredDemoUser(verifiedUser);
      } else {
        setUser(null);
        setStoredDemoUser(null);
      }
    } catch {
      setUser(null);
      setDbError({
        message: 'Falha de rede ao verificar sessão com o servidor.',
        code: 'NETWORK_ERROR',
        hint: 'Verifique sua conexão e se o servidor da aplicação está ativo.',
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (pathname === '/login') {
      setChecking(false);
      return;
    }
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-slate-500 gap-2 text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        Validando sessão e conexão com o banco de dados...
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="max-w-xl w-full space-y-4">
          <DatabaseErrorBanner error={dbError} onRetry={verify} loading={checking} />
          <div className="flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4" />
              Ir para Diagnóstico / Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <LogIn className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              Autenticação Necessária
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Faça login com sua conta cadastrada no banco de dados para acessar os módulos
              autorizados pelo controle de acesso (RBAC).
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <LogIn className="h-4 w-4" />
            Ir para a Tela de Login
          </Link>
        </div>
      </div>
    );
  }

  const allowed = canAccessRoute(user.role, pathname);
  if (!allowed) {
    const homeHref = ROLE_HOME_PATH[user.role] ?? '/';
    return (
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-6 sm:p-8 text-center shadow-sm space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-700">
              Acesso Restrito · RBAC
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              Permissão Insuficiente
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              O seu perfil atual (
              <strong className="font-semibold text-slate-800">{user.roleLabel}</strong>) não possui
              autorização para acessar a rota{' '}
              <code className="font-mono rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
                {pathname}
              </code>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={() => router.push(homeHref)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir para Meu Painel
            </button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Trocar de Conta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
