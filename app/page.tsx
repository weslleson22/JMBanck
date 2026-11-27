'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Camera,
  Wallet,
  Flag,
  Gift,
  School,
  ShieldCheck,
  BookOpen,
  UserCircle,
  HeartHandshake,
  Landmark,
  LogIn,
  GraduationCap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getStoredDemoUser,
  canAccessRoute,
  ROLE_HOME_PATH,
  type DemoUser,
} from '@/lib/client';

const roleCards = [
  {
    title: 'Administrador / Diretor',
    description: 'Indicadores gerais, escolas, turmas, professores, alunos e emissão de moedas.',
    href: '/dashboard/admin',
    icon: ShieldCheck,
    badge: 'Gestão Global',
  },
  {
    title: 'Professor & Coordenação',
    description: 'Minhas turmas, carômetro, distribuição de moedas, missões e engajamento.',
    href: '/dashboard/teacher',
    icon: BookOpen,
    badge: 'Pedagógico',
  },
  {
    title: 'Painel do Aluno',
    description: 'Saldo da carteira, extrato, missões disponíveis, conquistas e recompensas.',
    href: '/dashboard/student',
    icon: UserCircle,
    badge: 'Estudante',
  },
  {
    title: 'Painel do Responsável',
    description: 'Acompanhamento de saldo, conquistas, histórico e evolução dos filhos vinculados.',
    href: '/dashboard/guardian',
    icon: HeartHandshake,
    badge: 'Família',
  },
  {
    title: 'Operador / Tesouraria',
    description: 'Controle de catálogo de recompensas, estoque, resgates e entregas.',
    href: '/dashboard/treasury',
    icon: Landmark,
    badge: 'Financeiro',
  },
];

const featureModules = [
  {
    title: 'Carômetro Escolar',
    description: 'Identificação visual dos alunos por turma e status, com conformidade LGPD.',
    href: '/carometro',
    icon: Camera,
  },
  {
    title: 'Carteira Digital',
    description: 'Consulta de saldo, extrato de movimentações, bonificações e resgates.',
    href: '/wallets',
    icon: Wallet,
  },
  {
    title: 'Missões & Desafios',
    description: 'Atividades gamificadas criadas por professores e coordenadores.',
    href: '/missions',
    icon: Flag,
  },
  {
    title: 'Catálogo de Recompensas',
    description: 'Itens e benefícios disponíveis para resgate com moedas escolares.',
    href: '/rewards',
    icon: Gift,
  },
  {
    title: 'Estrutura Organizacional',
    description: 'Cadastro hierárquico de Escolas, Séries, Turmas e Professores.',
    href: '/schools',
    icon: School,
  },
  {
    title: 'Gestão de Alunos & Turmas',
    description: 'Consulta de matrículas, vínculo com turmas e histórico escolar.',
    href: '/students',
    icon: GraduationCap,
  },
];

export default function HomePage() {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    const sync = () => setUser(getStoredDemoUser());
    sync();
    window.addEventListener('jmbank-auth-change', sync);
    return () => window.removeEventListener('jmbank-auth-change', sync);
  }, []);

  const role = user?.role ?? null;
  const allowedDashboards = roleCards.filter((c) => canAccessRoute(role, c.href));
  const allowedModules = featureModules.filter((m) => canAccessRoute(role, m.href));
  const primaryDashboardHref = role ? ROLE_HOME_PATH[role] : '/login';

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-10 max-w-7xl mx-auto w-full">
      {/* Hero Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-5 sm:p-8 text-white shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-2 sm:space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-50">
              JM Bank · Banco Digital Escolar
            </span>
            {user && (
              <span className="inline-flex items-center rounded-full bg-emerald-400/20 border border-emerald-300/30 px-2.5 sm:px-3 py-1 text-xs font-semibold text-emerald-100">
                Logado como: {user.name} ({user.roleLabel})
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-[1.15] tracking-tight">
            Plataforma de Educação Financeira & Gamificação Escolar
          </h1>
          <p className="text-blue-100 text-[13px] sm:text-sm md:text-[15px] leading-relaxed">
            Bem-vindo! Abaixo estão exibidos apenas os painéis e módulos autorizados para o seu
            perfil de acesso (<strong className="font-semibold text-white">{user?.roleLabel ?? 'Visitante'}</strong>).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
          <Link
            href={primaryDashboardHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 active:bg-blue-100 transition-colors"
          >
            Ir para Meu Painel
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800/60 border border-white/20 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 active:bg-blue-900 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Trocar Perfil
          </Link>
        </div>
      </section>

      {/* Allowed Dashboards */}
      {allowedDashboards.length > 0 && (
        <section className="space-y-3 sm:space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Meu Painel de Controle</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Painéis liberados para o perfil <strong>{user?.roleLabel}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {allowedDashboards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.href} href={card.href} className="group block">
                  <Card className="h-full transition-all group-hover:border-blue-300 group-hover:shadow-md">
                    <CardHeader className="space-y-2.5 sm:space-y-3 p-4 sm:p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge>{card.badge}</Badge>
                      </div>
                      <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 transition-colors">
                        {card.title}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm leading-relaxed">
                        {card.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Allowed Modules */}
      {allowedModules.length > 0 && (
        <section className="space-y-3 sm:space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Módulos Autorizados</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Funcionalidades liberadas conforme as permissões da sua função.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {allowedModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.href} href={mod.href} className="group block">
                  <Card className="h-full transition-all group-hover:border-slate-300 group-hover:shadow-sm">
                    <CardContent className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {mod.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
