'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { getStoredDemoUser } from '@/lib/client';
import { toast } from 'sonner';
import { Gift, Plus, ShoppingBag, Loader2 } from 'lucide-react';

interface RewardRow {
  id: string;
  name: string;
  price: number;
  stock: number;
  status?: string;
}

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da recompensa'),
  price: z.coerce.number().positive('O preço em moedas deve ser maior que zero'),
  stock: z.coerce.number().int().nonnegative('O estoque não pode ser negativo'),
});

type FormData = z.infer<typeof schema>;

export default function RewardsPage() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);
  const [role, setRole] = useState<string>('student');

  const canManageCatalog = ['super_admin', 'school_admin', 'treasury'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function loadRewards() {
    setLoadingList(true);
    setDbError(null);
    try {
      const res = await fetch('/api/rewards', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDbError({
          message: json?.message ?? 'Erro ao carregar catálogo de recompensas do banco.',
          code: json?.code,
          hint: json?.hint,
        });
        setRewards([]);
        return;
      }
      setRewards(Array.isArray(json) ? json : []);
    } catch {
      setDbError({
        message: 'Falha de rede ao consultar recompensas no servidor.',
        code: 'NETWORK_ERROR',
      });
      setRewards([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);
    loadRewards();
  }, []);

  async function onSubmit(data: FormData) {
    if (!canManageCatalog) return;
    setSaving(true);
    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao salvar recompensa no banco de dados.');
        return;
      }
      setRewards((prev) => [json, ...prev]);
      toast.success('Recompensa salva no banco de dados!');
      reset();
    } catch {
      toast.error('Erro de conexão ao salvar recompensa.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRedeem(reward: RewardRow) {
    if (reward.stock <= 0) {
      toast.error('Item sem estoque disponível.');
      return;
    }
    setRedeemingId(reward.id);
    try {
      const res = await fetch('/api/rewards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: reward.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao registrar resgate no banco.');
        return;
      }
      setRewards((prev) => prev.map((r) => (r.id === reward.id ? json : r)));
      toast.success(`Resgate registrado no banco: "${reward.name}" (${reward.price} JM$)!`);
    } catch {
      toast.error('Erro de conexão ao registrar resgate.');
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <Badge variant="default" className="mb-2">Economia Escolar</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Catálogo de Recompensas
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          {canManageCatalog
            ? 'Gerencie o catálogo real de prêmios e estoque salvo no banco de dados.'
            : 'Consulte os prêmios disponíveis e solicite o resgate utilizando suas moedas JM$.'}
        </p>
      </div>

      <DatabaseErrorBanner error={dbError} onRetry={loadRewards} loading={loadingList} />

      <div className={`grid grid-cols-1 ${canManageCatalog ? 'lg:grid-cols-3' : ''} gap-5 sm:gap-6`}>
        {/* Catalog List */}
        <div className={canManageCatalog ? 'lg:col-span-2' : ''}>
          {loadingList ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Carregando recompensas do banco de dados...
            </div>
          ) : !dbError && rewards.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <Gift className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma recompensa cadastrada no banco
                </p>
                <p className="text-xs text-slate-500">
                  {canManageCatalog
                    ? 'Adicione o primeiro item ao catálogo usando o formulário ao lado.'
                    : 'Novos prêmios aparecerão aqui assim que forem cadastrados pela tesouraria.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div
              className={`${
                canManageCatalog
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              } grid gap-3.5 sm:gap-4`}
            >
              {rewards.map((r) => (
                <Card key={r.id} className="flex flex-col justify-between overflow-hidden">
                  <CardHeader className="p-4 sm:p-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <Badge
                        variant={Number(r.stock) > 0 ? 'success' : 'destructive'}
                        className="text-[11px] sm:text-xs"
                      >
                        Estoque: {r.stock} un.
                      </Badge>
                    </div>
                    <CardTitle className="text-sm sm:text-base">{r.name}</CardTitle>
                    <CardDescription className="font-numeric text-base sm:text-lg font-extrabold tracking-tight text-blue-600">
                      {Number(r.price).toLocaleString('pt-BR')} JM$
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    {role === 'student' && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full text-xs"
                        disabled={Number(r.stock) <= 0 || redeemingId === r.id}
                        onClick={() => handleRedeem(r)}
                      >
                        {redeemingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Solicitar Resgate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Form (Only Treasury / School Admin / Super Admin) */}
        {canManageCatalog && (
          <Card className="h-fit overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                Cadastrar Recompensa
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Exclusivo para Diretoria e Tesouraria
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nome do Item</label>
                  <Input {...register('name')} placeholder="Ex.: Vale Livro na Feira" />
                  {errors.name && (
                    <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Custo em Moedas (JM$)
                  </label>
                  <Input type="number" {...register('price')} placeholder="Ex.: 50" />
                  {errors.price && (
                    <p className="text-xs font-medium text-red-600">{errors.price.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Quantidade em Estoque
                  </label>
                  <Input type="number" {...register('stock')} placeholder="Ex.: 20" />
                  {errors.stock && (
                    <p className="text-xs font-medium text-red-600">{errors.stock.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={saving || Boolean(dbError)} className="w-full">
                  {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  Salvar no Banco
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
