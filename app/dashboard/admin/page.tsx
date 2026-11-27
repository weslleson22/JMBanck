'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import {
  Loader2,
  Users,
  UserCheck,
  School,
  Coins,
  Gift,
  Flag,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  totalSchools: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalCoinsEmitted: number;
  totalCoinsRedeemed: number;
  totalMissions: number;
  totalRewards: number;
  topClasses: { name: string; studentsCount: number; coins: number }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);

  async function loadStats() {
    setLoading(true);
    setDbError(null);
    try {
      const res = await fetch('/api/dashboard/admin', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDbError({
          message: json?.message ?? 'Erro ao carregar indicadores do banco de dados.',
          code: json?.code,
          hint: json?.hint,
        });
        setData(null);
        return;
      }
      setData(json as AdminStats);
    } catch {
      setDbError({
        message: 'Falha de rede ao consultar os indicadores no servidor.',
        code: 'NETWORK_ERROR',
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 sm:p-8 text-slate-600 text-sm">
        <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
        Carregando indicadores reais do banco de dados...
      </div>
    );
  }

  const stats: AdminStats = data ?? {
    totalSchools: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalCoinsEmitted: 0,
    totalCoinsRedeemed: 0,
    totalMissions: 0,
    totalRewards: 0,
    topClasses: [],
  };

  const kpis = [
    {
      label: 'Total de Alunos',
      value: stats.totalStudents.toLocaleString('pt-BR'),
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Professores',
      value: stats.totalTeachers.toLocaleString('pt-BR'),
      icon: UserCheck,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Turmas Ativas',
      value: stats.totalClasses.toLocaleString('pt-BR'),
      icon: School,
      color: 'text-violet-600 bg-violet-50',
    },
    {
      label: 'Moedas Emitidas',
      value: `${stats.totalCoinsEmitted.toLocaleString('pt-BR')} JM$`,
      icon: Coins,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Moedas Resgatadas',
      value: `${stats.totalCoinsRedeemed.toLocaleString('pt-BR')} JM$`,
      icon: Gift,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Missões Cadastradas',
      value: stats.totalMissions.toLocaleString('pt-BR'),
      icon: Flag,
      color: 'text-rose-600 bg-rose-50',
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Administração & Diretoria</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Institucional
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Indicadores reais consolidados diretamente do banco de dados Supabase.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link
            href="/schools"
            className="flex-1 sm:flex-none text-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Gerenciar Escolas
          </Link>
          <Link
            href="/carometro"
            className="flex-1 sm:flex-none text-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Acessar Carômetro
          </Link>
        </div>
      </div>

      <DatabaseErrorBanner error={dbError} onRetry={loadStats} loading={loading} />

      {!dbError && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className="overflow-hidden">
                  <CardContent className="p-3.5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                        {kpi.label}
                      </p>
                      <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900">
                        {kpi.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${kpi.color}`}
                    >
                      <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Ranking & Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Ranking de Moedas por Turma
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Calculado em tempo real com base nas turmas, alunos e carteiras do banco
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
                {stats.topClasses.length === 0 ? (
                  <p className="text-xs sm:text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                    Nenhuma turma cadastrada no banco de dados ainda.
                  </p>
                ) : (
                  stats.topClasses.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <span className="font-numeric flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] sm:text-xs font-bold text-white">
                          {idx + 1}º
                        </span>
                        <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-xs pl-8 sm:pl-0">
                        <Badge variant="secondary" className="text-[11px]">
                          {item.studentsCount} {item.studentsCount === 1 ? 'aluno' : 'alunos'}
                        </Badge>
                        <span className="font-numeric font-bold text-slate-800">
                          {item.coins.toLocaleString('pt-BR')} JM$
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">Atalhos de Gestão Escolar</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Acesso rápido aos cadastros da estrutura organizacional
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <Link
                  href="/schools"
                  className="rounded-lg border border-slate-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                >
                  <p className="font-semibold text-xs sm:text-sm text-slate-900">Escolas</p>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    {stats.totalSchools} unidades cadastradas
                  </p>
                </Link>
                <Link
                  href="/grade-levels"
                  className="rounded-lg border border-slate-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                >
                  <p className="font-semibold text-xs sm:text-sm text-slate-900">Séries / Anos</p>
                  <p className="text-[11px] sm:text-xs text-slate-500">Níveis de ensino</p>
                </Link>
                <Link
                  href="/classes"
                  className="rounded-lg border border-slate-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                >
                  <p className="font-semibold text-xs sm:text-sm text-slate-900">Turmas</p>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    {stats.totalClasses} turmas no banco
                  </p>
                </Link>
                <Link
                  href="/rewards"
                  className="rounded-lg border border-slate-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                >
                  <p className="font-semibold text-xs sm:text-sm text-slate-900">Recompensas</p>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    {stats.totalRewards} prêmios no catálogo
                  </p>
                </Link>
                <Link
                  href="/users"
                  className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <p className="font-semibold text-xs sm:text-sm text-blue-900">
                    Usuários & Controle de Acessos
                  </p>
                  <p className="text-[11px] sm:text-xs text-blue-700/80">
                    Criar contas, alterar senhas e liberar ou bloquear logins
                  </p>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
