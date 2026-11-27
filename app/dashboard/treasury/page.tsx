'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import { Loader2, Gift, Package, Coins, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface TreasuryDashboardData {
  totalRewards: number;
  totalStock: number;
  outOfStockCount: number;
  totalCoinsRedeemed: number;
  rewards: {
    id: string;
    name: string;
    price: number;
    stock: number;
    status: string;
  }[];
}

export default function TreasuryDashboardPage() {
  const [data, setData] = useState<TreasuryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);

  async function loadData() {
    setLoading(true);
    setDbError(null);
    try {
      const res = await fetch('/api/dashboard/treasury', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDbError({
          message: json?.message ?? 'Erro ao carregar dados da tesouraria no banco.',
          code: json?.code,
          hint: json?.hint,
        });
        setData(null);
        return;
      }
      setData(json as TreasuryDashboardData);
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
        Carregando dados reais da tesouraria...
      </div>
    );
  }

  const stats: TreasuryDashboardData = data ?? {
    totalRewards: 0,
    totalStock: 0,
    outOfStockCount: 0,
    totalCoinsRedeemed: 0,
    rewards: [],
  };

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Operador / Tesouraria</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Painel de Tesouraria & Estoque
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Inventário de recompensas e circulação de resgates carregados em tempo real do banco de
            dados.
          </p>
        </div>
        <Link
          href="/rewards"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors w-full sm:w-auto"
        >
          <Gift className="h-4 w-4" />
          Gerenciar Catálogo de Recompensas
        </Link>
      </div>

      <DatabaseErrorBanner error={dbError} onRetry={loadData} loading={loading} />

      {!dbError && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <Card className="overflow-hidden">
              <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Itens no Catálogo
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-0.5 sm:mt-1">
                    {Number(stats.totalRewards ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-600">
                  <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Unidades em Estoque
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-0.5 sm:mt-1">
                    {Number(stats.totalStock ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Sem Estoque
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-0.5 sm:mt-1">
                    {Number(stats.outOfStockCount ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-500">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Moedas Resgatadas
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-0.5 sm:mt-1">
                    {Number(stats.totalCoinsRedeemed ?? 0).toLocaleString('pt-BR')} JM$
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600">
                  <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">
                Inventário de Recompensas no Banco ({stats.rewards.length})
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Itens cadastrados na tabela <code className="font-mono">rewards</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
              {stats.rewards.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-500 text-center py-6">
                  Nenhuma recompensa cadastrada no banco de dados ainda.
                </p>
              ) : (
                stats.rewards.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 truncate">{item.id}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <Badge variant={item.stock > 0 ? 'success' : 'destructive'}>
                        Estoque: {item.stock} un.
                      </Badge>
                      <span className="font-numeric text-xs sm:text-sm font-bold text-slate-900">
                        {item.price.toLocaleString('pt-BR')} JM$
                      </span>
                    </div>
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
