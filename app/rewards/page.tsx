'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { getStoredDemoUser } from '@/lib/client';
import { toast } from 'sonner';
import { Gift, Plus, ShoppingBag, Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome da recompensa'),
  price: z.coerce.number().positive('O preço em moedas deve ser maior que zero'),
  stock: z.coerce.number().int().nonnegative('O estoque não pode ser negativo'),
});

type FormData = z.infer<typeof schema>;

const INITIAL_REWARDS = [
  { id: 'rew-1', name: 'Ingresso Cinema Escolar', price: 80, stock: 25, status: 'active' },
  { id: 'rew-2', name: 'Kit Canetas Coloridas JM', price: 45, stock: 40, status: 'active' },
  { id: 'rew-3', name: 'Vale Lanche Saudável na Cantina', price: 60, stock: 30, status: 'active' },
  { id: 'rew-4', name: 'Caderno Universitário Personalizado', price: 90, stock: 15, status: 'active' },
  { id: 'rew-5', name: 'Fone de Ouvido Bluetooth', price: 350, stock: 5, status: 'active' },
];

export default function RewardsPage() {
  const [rewards, setRewards] = useState<any[]>(INITIAL_REWARDS);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>('student');

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);

    (async () => {
      try {
        const res = await fetch('/api/rewards');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            setRewards(json);
          }
        }
      } catch {
        // Keep demo rewards
      }
    })();
  }, []);

  const canManageCatalog = ['super_admin', 'school_admin', 'treasury'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    if (!canManageCatalog) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setRewards((prev) => [created, ...prev]);
      } else {
        setRewards((prev) => [
          { id: `rew-${Date.now()}`, ...data, status: 'active' },
          ...prev,
        ]);
      }
      toast.success('Recompensa adicionada ao catálogo!');
      reset();
    } catch {
      setRewards((prev) => [
        { id: `rew-${Date.now()}`, ...data, status: 'active' },
        ...prev,
      ]);
      toast.success('Recompensa adicionada!');
      reset();
    } finally {
      setLoading(false);
    }
  }

  function handleRedeem(reward: any) {
    if (reward.stock <= 0) {
      toast.error('Item sem estoque disponível.');
      return;
    }
    setRewards((prev) =>
      prev.map((r) => (r.id === reward.id ? { ...r, stock: r.stock - 1 } : r))
    );
    toast.success(`Solicitação de resgate enviada: "${reward.name}" (${reward.price} JM$)!`);
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <Badge variant="default" className="mb-2">Economia Escolar</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Catálogo de Recompensas</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          {canManageCatalog
            ? 'Gerencie o catálogo de prêmios, controle o estoque e acompanhe os resgates.'
            : 'Consulte os prêmios disponíveis e solicite o resgate utilizando suas moedas JM$.'}
        </p>
      </div>

      <div className={`grid grid-cols-1 ${canManageCatalog ? 'lg:grid-cols-3' : ''} gap-5 sm:gap-6`}>
        {/* Catalog List */}
        <div
          className={`${canManageCatalog ? 'lg:col-span-2 grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            } grid gap-3.5 sm:gap-4`}
        >
          {rewards.map((r) => (
            <Card key={r.id} className="flex flex-col justify-between overflow-hidden">
              <CardHeader className="p-4 sm:p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <Badge variant={r.stock > 0 ? 'success' : 'destructive'} className="text-[11px] sm:text-xs">
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
                    disabled={r.stock <= 0}
                    onClick={() => handleRedeem(r)}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                    Solicitar Resgate
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Form (Only Treasury / School Admin / Super Admin) */}
        {canManageCatalog && (
          <Card className="h-fit overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                Cadastrar Recompensa
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Exclusivo para Diretoria e Tesouraria</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Nome do Item</label>
                  <Input {...register('name')} placeholder="Ex.: Vale Livro na Feira" />
                  {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Custo em Moedas (JM$)</label>
                  <Input type="number" {...register('price')} placeholder="Ex.: 50" />
                  {errors.price && <p className="text-xs text-red-600">{errors.price.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Quantidade em Estoque</label>
                  <Input type="number" {...register('stock')} placeholder="Ex.: 20" />
                  {errors.stock && <p className="text-xs text-red-600">{errors.stock.message}</p>}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  Adicionar ao Catálogo
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
