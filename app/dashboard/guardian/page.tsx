'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import { Wallet, TrendingUp, Flag, Coins, Loader2 } from 'lucide-react';

interface GuardianDashboardData {
  student: {
    id: string;
    name: string;
    enrollment_number: string;
    class_name: string;
  } | null;
  wallet: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
  activeMissionsCount: number;
  missions: {
    id: string;
    title: string;
    reward_amount: number;
    status?: string;
  }[];
}

export default function GuardianDashboardPage() {
  const [data, setData] = useState<GuardianDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);

  async function loadData() {
    setLoading(true);
    setDbError(null);
    try {
      const res = await fetch('/api/dashboard/guardian', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDbError({
          message: json?.message ?? 'Erro ao carregar dados do responsável no banco.',
          code: json?.code,
          hint: json?.hint,
        });
        setData(null);
        return;
      }
      setData(json as GuardianDashboardData);
    } catch {
      setDbError({
        message: 'Falha de rede ao consultar o banco de dados.',
        code: 'NETWORK_ERROR',
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 sm:p-8 text-slate-600 text-sm">
        <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
        Carregando dados reais do estudante no banco de dados...
      </div>
    );
  }

  const student = data?.student ?? null;
  const wallet = data?.wallet ?? { balance: 0, total_earned: 0, total_spent: 0 };
  const missions = data?.missions ?? [];

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <Badge variant="default" className="mb-2">Portal da Família</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Dashboard do Responsável
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {student ? (
            <>
              Estudante vinculado:{' '}
              <strong className="font-semibold text-slate-700">
                {student.name} ({student.class_name})
              </strong>{' '}
              · Matrícula:{' '}
              <span className="font-mono text-slate-700">{student.enrollment_number}</span>
            </>
          ) : (
            'Nenhum estudante cadastrado no banco de dados no momento.'
          )}
        </p>
      </div>

      <DatabaseErrorBanner error={dbError} onRetry={loadData} loading={loading} />

      {!dbError && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <Card className="overflow-hidden">
              <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Saldo Atual
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-blue-600 mt-0.5 sm:mt-1">
                    {wallet.balance.toLocaleString('pt-BR')} JM$
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-600">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Conquistado
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-0.5 sm:mt-1">
                    +{wallet.total_earned.toLocaleString('pt-BR')} JM$
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Utilizado
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-0.5 sm:mt-1">
                    -{wallet.total_spent.toLocaleString('pt-BR')} JM$
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-600">
                  <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Missões Ativas
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-0.5 sm:mt-1">
                    {(data?.activeMissionsCount ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600">
                  <Flag className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">
                Missões Pedagógicas Cadastradas ({missions.length})
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Atividades escolares ativas registradas no banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
              {missions.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-500 text-center py-4">
                  Nenhuma missão cadastrada no banco de dados ainda.
                </p>
              ) : (
                missions.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3"
                  >
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">{m.title}</p>
                    <Badge variant="success" className="self-start sm:self-auto shrink-0">
                      +{Number(m.reward_amount ?? 0).toLocaleString('pt-BR')} JM$
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
