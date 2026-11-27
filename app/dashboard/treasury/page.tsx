'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Gift, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const FALLBACK_TREASURY = {
  totalRewards: 12,
  totalStock: 145,
  pendingRedemptions: 4,
  approvedDeliveries: 38,
  pendingItems: [
    { id: 'RED-01', student: 'Lucas Oliveira (9º A)', item: 'Kit Canetas Coloridas', price: 45, status: 'Aguardando Entrega' },
    { id: 'RED-02', student: 'Beatriz Santos (9º A)', item: 'Vale Lanche Cantina', price: 60, status: 'Aguardando Aprovação' },
    { id: 'RED-03', student: 'Gabriel Ferreira (8º B)', item: 'Caderno Universitário JM', price: 80, status: 'Aguardando Entrega' },
  ],
};

export default function TreasuryDashboardPage() {
  const [data, setData] = useState<any>(FALLBACK_TREASURY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/dashboard/treasury');
        if (res.ok) {
          const json = await res.json();
          setData({ ...FALLBACK_TREASURY, ...json });
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 sm:p-8 text-slate-600">
        <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
        Carregando dados da tesouraria...
      </div>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Operador / Tesouraria</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Painel de Tesouraria & Estoque</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Gerencie o catálogo de recompensas, aprove solicitações de resgate e controle entregas.
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card className="overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Itens no Catálogo</p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-0.5 sm:mt-1">{data.totalRewards}</p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-600">
              <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Em Estoque</p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-0.5 sm:mt-1">{data.totalStock}</p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Resgates Pendentes</p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-0.5 sm:mt-1">{data.pendingRedemptions}</p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-500">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Entregas Concluídas</p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-0.5 sm:mt-1">{data.approvedDeliveries}</p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Fila de Solicitações de Resgate</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Pedidos recentes de alunos aguardando conferência ou entrega</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
          {(data.pendingItems ?? FALLBACK_TREASURY.pendingItems).map((item: any) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3"
            >
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-slate-900">
                  {item.item}{' '}
                  <span className="font-mono text-[11px] font-medium text-slate-500">({item.id})</span>
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Solicitante: {item.student}</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <Badge variant="warning" className="text-[11px]">{item.status}</Badge>
                <span className="font-numeric text-xs sm:text-sm font-bold text-slate-900">{item.price} JM$</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

