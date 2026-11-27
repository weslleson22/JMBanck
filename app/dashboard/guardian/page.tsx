'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Award, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  getStudentWallet,
  getSubmissions,
  DEFAULT_WALLET,
  type StudentWalletState,
  type ActivitySubmission,
} from '@/lib/activities-store';

export default function GuardianDashboardPage() {
  const [wallet, setWallet] = useState<StudentWalletState>(DEFAULT_WALLET);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);

  const syncData = () => {
    setWallet(getStudentWallet());
    setSubmissions(getSubmissions());
  };

  useEffect(() => {
    syncData();
    window.addEventListener('jmbank-store-update', syncData);
    return () => window.removeEventListener('jmbank-store-update', syncData);
  }, []);

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <Badge variant="default" className="mb-2">Portal da Família</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard do Responsável</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Estudante vinculado: <strong className="font-semibold text-slate-700">Lucas Oliveira (9º Ano A)</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card className="overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Saldo Atual</p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-blue-600 mt-0.5 sm:mt-1">{wallet.balance.toLocaleString('pt-BR')} JM$</p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Conquistado</p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-0.5 sm:mt-1">+{wallet.totalEarned.toLocaleString('pt-BR')} JM$</p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Conquistas</p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-0.5 sm:mt-1">4</p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-500">
              <Award className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Participação</p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-0.5 sm:mt-1">98%</p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Histórico Recente de Moedas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Movimentações, atividades validadas e resgates realizados</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
            {wallet.movements.map((m) => (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900">{m.description}</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    {m.operator} · {m.timestamp}
                  </p>
                </div>
                <Badge variant={m.amount < 0 ? 'warning' : 'success'} className="self-start sm:self-auto shrink-0 text-xs font-semibold">
                  {m.amount >= 0 ? `+${m.amount}` : m.amount} JM$
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Atividades Submetidas pelo Estudante</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Acompanhamento de entregas e validações dos professores</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900">{sub.activityTitle}</p>
                  <p className="text-[11px] text-slate-500">
                    {sub.subject} · Enviado: {sub.submittedAt}
                  </p>
                </div>
                <Badge
                  variant={
                    sub.status === 'approved'
                      ? 'success'
                      : sub.status === 'pending'
                      ? 'warning'
                      : 'destructive'
                  }
                  className="self-start sm:self-auto shrink-0 text-[11px]"
                >
                  {sub.status === 'approved'
                    ? `Validada (+${sub.rewardAmount} JM$)`
                    : sub.status === 'pending'
                    ? 'Aguardando Professor'
                    : 'Em Revisão'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
