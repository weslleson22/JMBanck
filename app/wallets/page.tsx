'use client';

import { getStoredDemoUser } from '@/lib/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2, ShieldAlert, Coins, Wallet } from 'lucide-react';

interface WalletRow {
  wallet_id: string | null;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  class_name: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

const schema = z.object({
  student_id: z.string().min(1, 'Selecione um aluno'),
  type: z.enum(['credit', 'bonus', 'award', 'reversal']),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  description: z.string().trim().min(3, 'Descreva o motivo pedagógico ou administrativo'),
});

type FormData = z.infer<typeof schema>;

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);
  const [role, setRole] = useState<string>('student');

  const canGrantCoins = ['super_admin', 'school_admin', 'teacher', 'coordinator'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      student_id: '',
      type: 'credit',
      amount: 20,
      description: '',
    },
  });

  async function loadWallets() {
    setLoadingList(true);
    setDbError(null);
    try {
      const res = await fetch('/api/wallets', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDbError({
          message: json?.message ?? 'Erro ao carregar carteiras no banco de dados.',
          code: json?.code,
          hint: json?.hint,
        });
        setWallets([]);
        return;
      }
      const list = Array.isArray(json) ? (json as WalletRow[]) : [];
      setWallets(list);
      if (list.length > 0) {
        const currentStillExists = list.some((w) => w.student_id === selectedStudentId);
        const nextId = currentStillExists ? selectedStudentId : list[0].student_id;
        setSelectedStudentId(nextId);
        setValue('student_id', nextId);
      }
    } catch {
      setDbError({
        message: 'Falha de rede ao consultar carteiras no servidor.',
        code: 'NETWORK_ERROR',
      });
      setWallets([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);
    loadWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeWallet =
    wallets.find((w) => w.student_id === selectedStudentId) ?? wallets[0] ?? null;

  async function onSubmit(data: FormData) {
    if (!canGrantCoins) {
      toast.error('Alunos não têm permissão para alterar diretamente o próprio saldo.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao registrar movimentação no banco de dados.');
        return;
      }
      toast.success('Saldo atualizado no banco de dados com sucesso!');
      reset({
        student_id: data.student_id,
        type: 'credit',
        amount: 20,
        description: '',
      });
      await loadWallets();
    } catch {
      toast.error('Erro de conexão ao atualizar carteira.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Carteira Digital Individual</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Carteiras & Saldos no Banco
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {activeWallet ? (
              <>
                Aluno selecionado:{' '}
                <strong className="font-semibold text-slate-700">
                  {activeWallet.student_name}
                </strong>{' '}
                · Matrícula:{' '}
                <span className="font-mono font-medium text-slate-700">
                  {activeWallet.enrollment_number}
                </span>{' '}
                · Turma:{' '}
                <strong className="font-semibold text-slate-700">{activeWallet.class_name}</strong>
              </>
            ) : (
              'Consulte saldos reais da tabela wallets no Supabase.'
            )}
          </p>
        </div>

        {wallets.length > 1 && (
          <select
            value={selectedStudentId}
            onChange={(e) => {
              setSelectedStudentId(e.target.value);
              setValue('student_id', e.target.value);
            }}
            className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-64"
          >
            {wallets.map((w) => (
              <option key={w.student_id} value={w.student_id}>
                {w.student_name} ({w.balance} JM$)
              </option>
            ))}
          </select>
        )}
      </div>

      <DatabaseErrorBanner error={dbError} onRetry={loadWallets} loading={loadingList} />

      {loadingList ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Carregando carteiras do banco de dados...
        </div>
      ) : !dbError && wallets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Wallet className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhuma carteira encontrada no banco de dados
            </p>
            <p className="text-xs text-slate-500">
              Matricule alunos em /students para inicializar suas carteiras digitais no Supabase.
            </p>
          </CardContent>
        </Card>
      ) : !dbError && activeWallet ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 overflow-hidden shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <p className="text-[11px] sm:text-xs uppercase font-semibold text-blue-100 tracking-wider">
                  Saldo Atual
                </p>
                <p className="font-numeric text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                  {activeWallet.balance.toLocaleString('pt-BR')} JM$
                </p>
                <p className="text-[11px] sm:text-xs text-blue-100/90 mt-2">
                  Saldo sincronizado em tempo real no Supabase
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <p className="text-[11px] sm:text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Total de Moedas Recebidas
                </p>
                <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-1">
                  +{activeWallet.total_earned.toLocaleString('pt-BR')} JM$
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-2">
                  Créditos de atividades, bônus e premiações
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <p className="text-[11px] sm:text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Total de Moedas Utilizadas
                </p>
                <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-1">
                  -{activeWallet.total_spent.toLocaleString('pt-BR')} JM$
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-2">
                  Débitos por resgate e estornos
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Wallets Overview List */}
            <Card className="lg:col-span-2 overflow-hidden">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">
                  Carteiras Registradas no Banco ({wallets.length})
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Selecione um estudante para visualizar ou movimentar o saldo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
                {wallets.map((w) => {
                  const isSelected = w.student_id === activeWallet.student_id;
                  return (
                    <button
                      key={w.student_id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(w.student_id);
                        setValue('student_id', w.student_id);
                      }}
                      className={`w-full text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50/60'
                          : 'border-slate-100 bg-slate-50/70 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                          {w.student_name}
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-500">
                          Matrícula:{' '}
                          <span className="font-mono text-slate-700">{w.enrollment_number}</span> ·{' '}
                          {w.class_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="text-xs text-emerald-700 tabular-nums">
                          +{w.total_earned.toLocaleString('pt-BR')}
                        </span>
                        <Badge variant="default" className="font-numeric text-xs">
                          {w.balance.toLocaleString('pt-BR')} JM$
                        </Badge>
                      </div>
                    </button>
                  );
                })}
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
                      <label className="text-xs font-semibold text-slate-700">Aluno</label>
                      <select
                        {...register('student_id')}
                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {wallets.map((w) => (
                          <option key={w.student_id} value={w.student_id}>
                            {w.student_name} ({w.enrollment_number})
                          </option>
                        ))}
                      </select>
                      {errors.student_id && (
                        <p className="text-xs font-medium text-red-600">
                          {errors.student_id.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Tipo de Operação
                      </label>
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
                      <label className="text-xs font-semibold text-slate-700">
                        Quantidade de Moedas
                      </label>
                      <Input type="number" {...register('amount')} placeholder="Ex.: 25" />
                      {errors.amount && (
                        <p className="text-xs font-medium text-red-600">{errors.amount.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Descrição / Referência
                      </label>
                      <Input
                        {...register('description')}
                        placeholder="Ex.: Participação exemplar na aula"
                      />
                      {errors.description && (
                        <p className="text-xs font-medium text-red-600">
                          {errors.description.message}
                        </p>
                      )}
                    </div>

                    <Button type="submit" disabled={saving} className="w-full">
                      {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                      Salvar Movimentação no Banco
                    </Button>
                  </form>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <ShieldAlert className="h-4 w-4" />
                      Modo Somente Leitura
                    </div>
                    <p className="leading-relaxed">
                      Conforme as regras de segurança do banco escolar, o seu perfil pode consultar
                      o saldo real da carteira, mas apenas professores e administradores podem
                      lançar movimentações.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </main>
  );
}
