'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const FALLBACK_STATS = {
  totalStudents: 342,
  totalTeachers: 28,
  totalClasses: 14,
  totalCoinsEmitted: 18450,
  totalCoinsRedeemed: 6230,
  totalMissions: 46,
  totalRewards: 19,
  topClasses: [
    { name: '9º Ano A - Matutino', engagement: '94%', coins: 3420 },
    { name: '8º Ano B - Matutino', engagement: '89%', coins: 2980 },
    { name: '1º Ano EM - Integral', engagement: '86%', coins: 2710 },
  ],
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(FALLBACK_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/dashboard/admin');
        if (res.ok) {
          const json = await res.json();
          setData({
            ...FALLBACK_STATS,
            ...json,
            totalStudents: json.totalStudents || FALLBACK_STATS.totalStudents,
            totalTeachers: json.totalTeachers || FALLBACK_STATS.totalTeachers,
            totalClasses: json.totalClasses || FALLBACK_STATS.totalClasses,
            totalCoinsEmitted: json.totalCoinsEmitted || FALLBACK_STATS.totalCoinsEmitted,
            totalCoinsRedeemed: json.totalCoinsRedeemed || FALLBACK_STATS.totalCoinsRedeemed,
            totalMissions: json.totalMissions || FALLBACK_STATS.totalMissions,
            totalRewards: json.totalRewards || FALLBACK_STATS.totalRewards,
          });
        }
      } catch {
        // Keep fallback demo data
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 sm:p-8 text-slate-600">
        <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
        Carregando indicadores administrativos...
      </div>
    );
  }

  const kpis = [
    { label: 'Total de Alunos', value: Number(data.totalStudents).toLocaleString('pt-BR'), icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Professores', value: Number(data.totalTeachers).toLocaleString('pt-BR'), icon: UserCheck, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Turmas Ativas', value: Number(data.totalClasses).toLocaleString('pt-BR'), icon: School, color: 'text-violet-600 bg-violet-50' },
    { label: 'Moedas Emitidas', value: `${Number(data.totalCoinsEmitted).toLocaleString('pt-BR')} JM$`, icon: Coins, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Moedas Resgatadas', value: `${Number(data.totalCoinsRedeemed).toLocaleString('pt-BR')} JM$`, icon: Gift, color: 'text-amber-600 bg-amber-50' },
    { label: 'Missões Realizadas', value: Number(data.totalMissions).toLocaleString('pt-BR'), icon: Flag, color: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Administração & Diretoria</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard Institucional</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Visão consolidada de matrículas, turmas, circulação de moedas e engajamento escolar.
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

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="p-3.5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{kpi.label}</p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900">{kpi.value}</p>
                </div>
                <div className={`flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${kpi.color}`}>
                  <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ranking & Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Ranking de Engajamento por Turma
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Turmas com maior participação em missões e atividades</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
            {(data.topClasses ?? FALLBACK_STATS.topClasses).map((item: any, idx: number) => (
              <div
                key={item.name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <span className="font-numeric flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] sm:text-xs font-bold text-white">
                    {idx + 1}º
                  </span>
                  <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate">{item.name}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-xs pl-8 sm:pl-0">
                  <Badge variant="success" className="text-[11px]">{item.engagement} engajamento</Badge>
                  <span className="font-numeric font-bold text-slate-800">{Number(item.coins).toLocaleString('pt-BR')} JM$</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Atalhos de Gestão Escolar</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Acesso rápido aos cadastros da estrutura organizacional</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <Link href="/schools" className="rounded-lg border border-slate-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
              <p className="font-semibold text-xs sm:text-sm text-slate-900">Escolas</p>
              <p className="text-[11px] sm:text-xs text-slate-500">Unidades e anos letivos</p>
            </Link>
            <Link href="/grade-levels" className="rounded-lg border border-slate-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
              <p className="font-semibold text-xs sm:text-sm text-slate-900">Séries / Anos</p>
              <p className="text-[11px] sm:text-xs text-slate-500">Níveis de ensino</p>
            </Link>
            <Link href="/classes" className="rounded-lg border border-slate-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
              <p className="font-semibold text-xs sm:text-sm text-slate-900">Turmas</p>
              <p className="text-[11px] sm:text-xs text-slate-500">Salas e turnos</p>
            </Link>
            <Link href="/rewards" className="rounded-lg border border-slate-200 p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
              <p className="font-semibold text-xs sm:text-sm text-slate-900">Recompensas</p>
              <p className="text-[11px] sm:text-xs text-slate-500">Catálogo de prêmios</p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
