'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getStoredDemoUser,
  supabaseClient,
  canAccessRoute,
  ROLE_HOME_PATH,
  type DemoUser,
} from '@/lib/client';
import type { Role } from '@/lib/role';
import { ShieldAlert, ArrowLeft, LogIn, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      setChecking(true);
      const demo = getStoredDemoUser();
      if (demo) {
        setUser(demo);
        setChecking(false);
        return;
      }

      try {
        const supabase = supabaseClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          const role = ((authUser.user_metadata?.role as Role) ?? 'student');
          setUser({
            id: authUser.id,
            email: authUser.email ?? '',
            name: authUser.user_metadata?.name ?? authUser.email?.split('@')[0] ?? 'Usuário',
            role,
            roleLabel: role,
          });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setChecking(false);
      }
    };

    verify();
    window.addEventListener('jmbank-auth-change', verify);
    return () => window.removeEventListener('jmbank-auth-change', verify);
  }, [pathname]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-slate-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        Verificando permissões de acesso (RBAC)...
      </div>
    );
  }

  // Not logged in -> prompt/redirect to login
  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <LogIn className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              Autenticação Necessária
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Escolha um perfil na tela de login para acessar os módulos autorizados pelo controle
              de acesso (RBAC).
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

  // Logged in, check if route is permitted for this user's role
  const allowed = canAccessRoute(user.role, pathname);
  if (!allowed) {
    const homeHref = ROLE_HOME_PATH[user.role] ?? '/';
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm space-y-5">
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
              O seu perfil atual (<strong className="font-semibold text-slate-800">{user.roleLabel}</strong>) não possui autorização para
              acessar a rota <code className="font-mono rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">{pathname}</code>.
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

