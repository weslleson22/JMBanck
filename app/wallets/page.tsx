'use client';

import { getStoredDemoUser } from '@/lib/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2, ArrowDownLeft, ArrowUpRight, ShieldAlert, Coins } from 'lucide-react';
import {
  getStudentWallet,
  recordWalletTransaction,
  DEFAULT_WALLET,
  type StudentWalletState,
} from '@/lib/activities-store';

const schema = z.object({
  type: z.enum(['credit', 'bonus', 'award', 'reversal']),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  description: z.string().min(3, 'Descreva o motivo pedagógico ou administrativo'),
});

type FormData = z.infer<typeof schema>;

export default function WalletsPage() {
  const [wallet, setWallet] = useState<StudentWalletState>(DEFAULT_WALLET);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>('student');

  const syncWallet = () => {
    setWallet(getStudentWallet());
  };

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);
    syncWallet();
    window.addEventListener('jmbank-store-update', syncWallet);
    return () => window.removeEventListener('jmbank-store-update', syncWallet);
  }, []);

  const canGrantCoins = ['super_admin', 'school_admin', 'teacher', 'coordinator'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'credit',
      amount: 20,
      description: '',
    },
  });

  async function onSubmit(data: FormData) {
    if (!canGrantCoins) {
      toast.error('Alunos não têm permissão para alterar diretamente o próprio saldo.');
      return;
    }
    setLoading(true);
    const isReversal = data.type === 'reversal';
    const signedAmount = isReversal ? -Math.abs(data.amount) : Math.abs(data.amount);

    const typeLabels: Record<string, string> = {
      credit: 'Crédito de Moedas',
      bonus: 'Bonificação',
      award: 'Premiação',
      reversal: 'Estorno Administrativo',
    };

    const updated = recordWalletTransaction({
      type: data.type,
      label: typeLabels[data.type],
      amount: signedAmount,
      description: data.description,
      operator: getStoredDemoUser()?.name ?? 'Operador Autorizado',
    });

    setWallet(updated);
    toast.success('Operação registrada de forma imutável no extrato!');
    reset({ type: 'credit', amount: 20, description: '' });
    setLoading(false);
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Carteira Digital Individual</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Carteira & Extrato Auditável</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Aluno: <strong className="font-semibold text-slate-700">Lucas Oliveira</strong> · Matrícula: <span className="font-mono font-medium text-slate-700">20260014</span> · Turma: <strong className="font-semibold text-slate-700">9º Ano A</strong>
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 overflow-hidden shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <p className="text-[11px] sm:text-xs uppercase font-semibold text-blue-100 tracking-wider">Saldo Atual</p>
            <p className="font-numeric text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              {wallet.balance.toLocaleString('pt-BR')} JM$
            </p>
            <p className="text-[11px] sm:text-xs text-blue-100/90 mt-2">Transações protegidas contra alteração</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <p className="text-[11px] sm:text-xs uppercase font-semibold text-slate-500 tracking-wider">Total de Moedas Recebidas</p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-1">
              +{wallet.totalEarned.toLocaleString('pt-BR')} JM$
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-2">Créditos de atividades, bônus e premiações</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <p className="text-[11px] sm:text-xs uppercase font-semibold text-slate-500 tracking-wider">Total de Moedas Utilizadas</p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-1">
              -{wallet.totalSpent.toLocaleString('pt-BR')} JM$
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-2">Débitos por resgate e estornos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Immutable Statement */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Extrato Completo de Movimentações</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Registro histórico imutável com identificador, responsável, data e hora
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
            {wallet.movements.map((m) => (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4"
              >
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className={`mt-0.5 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full ${
                      m.amount >= 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {m.amount >= 0 ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-mono text-[11px] font-medium text-slate-500">{m.id}</span>
                      <Badge variant="secondary" className="text-[11px]">{m.label}</Badge>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 break-words">{m.description}</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 break-words">
                      Responsável: <strong className="font-semibold text-slate-700">{m.operator}</strong> · {m.timestamp}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-numeric text-sm sm:text-base font-extrabold shrink-0 self-end sm:self-center ${
                    m.amount >= 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {m.amount >= 0 ? `+${m.amount}` : m.amount} JM$
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Authorized Operation Form */}
        <Card className="h-fit overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Coins className="h-4 w-4 text-blue-600" />
              Lançar Movimentação
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Exclusivo para Professores e Administradores
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            {canGrantCoins ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Tipo de Operação</label>
                  <select
                    {...register('type')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="credit">Crédito de Moedas (Atividade)</option>
                    <option value="bonus">Bonificação Pedagógica</option>
                    <option value="award">Premiação Especial</option>
                    <option value="reversal">Estorno Administrativo</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Quantidade de Moedas</label>
                  <Input type="number" {...register('amount')} placeholder="Ex.: 25" />
                  {errors.amount && <p className="text-xs font-medium text-red-600">{errors.amount.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Descrição / Referência</label>
                  <Input
                    {...register('description')}
                    placeholder="Ex.: Participação exemplar na aula"
                  />
                  {errors.description && (
                    <p className="text-xs font-medium text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  Confirmar Transação
                </Button>
              </form>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  Modo Somente Leitura
                </div>
                <p>
                  Conforme as regras de segurança do banco escolar, o seu perfil pode consultar
                  saldo e extrato, mas nunca alterar diretamente o próprio saldo. Os créditos são
                  liberados automaticamente quando o professor valida suas atividades!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
