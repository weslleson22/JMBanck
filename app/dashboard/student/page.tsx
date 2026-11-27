'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import { Wallet, Gift, Trophy, BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface StudentDashboardResponse {
  student: {
    id: string;
    name: string;
    enrollment_number: string;
    class_id: string;
    class_name: string;
  };
  wallet: {
    id: string | null;
    balance: number;
    total_earned: number;
    total_spent: number;
  };
  rankPosition: number | null;
  missions: {
    id: string;
    title: string;
    description?: string;
    subject?: string;
    reward_amount: number;
    status?: string;
  }[];
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);

  async function loadData() {
    setLoading(true);
    setDbError(null);
    try {
      const res = await fetch('/api/dashboard/student', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDbError({
          message: json?.message ?? 'Erro ao carregar dados do painel do estudante.',
          code: json?.code,
          hint: json?.hint,
        });
        setData(null);
        return;
      }
      setData(json as StudentDashboardResponse);
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
        Carregando dados reais da sua carteira e missões...
      </div>
    );
  }

  const student = data?.student;
  const wallet = data?.wallet ?? { id: null, balance: 0, total_earned: 0, total_spent: 0 };
  const missions = data?.missions ?? [];

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <Badge variant="default" className="mb-1.5 sm:mb-2">Painel do Estudante</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Olá, {student?.name ?? 'Estudante'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Matrícula:{' '}
            <span className="font-mono font-medium text-slate-700">
              {student?.enrollment_number || 'Não vinculada'}
            </span>{' '}
            · Turma:{' '}
            <strong className="font-semibold text-slate-700">
              {student?.class_name || 'Sem turma'}
            </strong>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link
            href="/wallets"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs tabular-nums"
          >
            <Wallet className="h-4 w-4" />
            Minha Carteira ({wallet.balance.toLocaleString('pt-BR')} JM$)
          </Link>
          <Link
            href="/rewards"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Gift className="h-4 w-4" />
            Catálogo de Recompensas
          </Link>
        </div>
      </div>

      <DatabaseErrorBanner error={dbError} onRetry={loadData} loading={loading} />

      {!dbError && (
        <>
          {/* Wallet KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <CardContent className="p-3.5 sm:p-5">
                <p className="text-[11px] sm:text-xs font-semibold text-blue-100 uppercase tracking-wider">
                  Saldo Disponível
                </p>
                <p className="font-numeric text-xl sm:text-3xl font-extrabold tracking-tight mt-1">
                  {wallet.balance.toLocaleString('pt-BR')} JM$
                </p>
                <p className="text-[11px] text-blue-100/90 mt-1.5 sm:mt-2 truncate">
                  Dados reais do banco
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3.5 sm:p-5">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Recebido
                </p>
                <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-1">
                  +{wallet.total_earned.toLocaleString('pt-BR')} JM$
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">
                  Em atividades e bônus
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3.5 sm:p-5">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Utilizado
                </p>
                <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-1">
                  -{wallet.total_spent.toLocaleString('pt-BR')} JM$
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">
                  Em resgates na loja
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ranking na Turma
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
                    {data?.rankPosition ? `#${data.rankPosition}º Lugar` : '—'}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">
                    {student?.class_name || 'Sem turma'}
                  </p>
                </div>
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 shrink-0" />
              </CardContent>
            </Card>
          </div>

          {/* Real Missions from DB */}
          <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600 shrink-0" />
                  Missões & Atividades Disponíveis ({missions.length})
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
                  Atividades cadastradas no banco de dados pela equipe pedagógica.
                </p>
              </div>
              <Link href="/missions" className="text-xs font-semibold text-blue-600 hover:underline">
                Ver todas →
              </Link>
            </div>

            {missions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-xs sm:text-sm text-slate-500">
                  Nenhuma missão ativa cadastrada no banco de dados no momento.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                {missions.map((m) => (
                  <Card key={m.id} className="flex flex-col justify-between border-slate-200">
                    <CardHeader className="space-y-2.5 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary">{m.subject || 'Missão Escolar'}</Badge>
                        <Badge variant="success">
                          +{Number(m.reward_amount ?? 0).toLocaleString('pt-BR')} JM$
                        </Badge>
                      </div>
                      <CardTitle className="text-sm sm:text-base leading-snug">{m.title}</CardTitle>
                      {m.description && (
                        <CardDescription className="text-xs leading-relaxed">
                          {m.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
