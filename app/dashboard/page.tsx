'use client';

import Link from 'next/link';
import {
  ShieldCheck,
  BookOpen,
  UserCircle,
  HeartHandshake,
  Landmark,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStoredDemoUser, canAccessRoute, type DemoUser } from '@/lib/client';
import { useEffect, useState } from 'react';

const dashboards = [
  {
    title: 'Dashboard Administrador / Diretor',
    description:
      'Total de alunos, professores, turmas, moedas emitidas e resgatadas, missões e ranking de engajamento.',
    href: '/dashboard/admin',
    icon: ShieldCheck,
    badge: 'Administração',
  },
  {
    title: 'Dashboard Professor / Coordenador',
    description:
      'Minhas turmas, total de alunos, acesso ao carômetro, missões ativas, moedas distribuídas e atividades pendentes.',
    href: '/dashboard/teacher',
    icon: BookOpen,
    badge: 'Docente',
  },
  {
    title: 'Dashboard do Aluno',
    description:
      'Saldo da carteira virtual, últimas movimentações, missões disponíveis, conquistas, ranking e loja de recompensas.',
    href: '/dashboard/student',
    icon: UserCircle,
    badge: 'Estudante',
  },
  {
    title: 'Dashboard do Responsável',
    description:
      'Resumo do estudante vinculado, saldo atual, conquistas, histórico de movimentações e frequência de participação.',
    href: '/dashboard/guardian',
    icon: HeartHandshake,
    badge: 'Família',
  },
  {
    title: 'Dashboard Operador / Tesouraria',
    description:
      'Catálogo de recompensas, controle de estoque, aprovação de resgates, registro de entregas e relatórios.',
    href: '/dashboard/treasury',
    icon: Landmark,
    badge: 'Tesouraria',
  },
];

export default function DashboardHubPage() {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    setUser(getStoredDemoUser());
  }, []);

  const visibleDashboards = dashboards.filter((d) => canAccessRoute(user?.role, d.href));

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Painéis Autorizados</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Exibindo apenas os dashboards permitidos para o seu perfil de acesso (RBAC).
          </p>
        </div>
        {user && (
          <Badge variant="default" className="self-start sm:self-auto px-3 py-1 text-xs">
            Perfil ativo: {user.roleLabel}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {visibleDashboards.map((d) => {
          const Icon = d.icon;
          return (
            <Link key={d.href} href={d.href} className="group block h-full">
              <Card className="h-full flex flex-col justify-between transition-all group-hover:border-blue-400 group-hover:shadow-md">
                <CardHeader className="p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-[11px] sm:text-xs">{d.badge}</Badge>
                  </div>
                  <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 transition-colors">
                    {d.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm leading-relaxed">{d.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                    Acessar painel <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
