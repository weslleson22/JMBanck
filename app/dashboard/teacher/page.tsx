'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import {
  Users,
  Flag,
  Coins,
  GraduationCap,
  Camera,
  Plus,
  BookOpen,
  Loader2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface TeacherDashboardData {
  totalClasses: number;
  totalStudents: number;
  activeMissionsCount: number;
  totalMissionsCount: number;
  totalCoinsDistributed: number;
  missions: {
    id: string;
    title: string;
    description?: string;
    subject?: string;
    reward_amount: number;
    status?: string;
  }[];
}

export default function TeacherDashboardPage() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Matemática');
  const [newReward, setNewReward] = useState(50);
  const [newDescription, setNewDescription] = useState('');

  async function loadData() {
    setLoading(true);
    setDbError(null);
    try {
      const res = await fetch('/api/dashboard/teacher', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDbError({
          message: json?.message ?? 'Erro ao carregar dados do painel docente.',
          code: json?.code,
          hint: json?.hint,
        });
        setData(null);
        return;
      }
      setData(json as TeacherDashboardData);
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

  async function handleCreateMission(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Informe o título da atividade/missão.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          subject: newSubject.trim(),
          description: newDescription.trim(),
          reward_amount: Number(newReward) || 0,
          status: 'active',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao salvar atividade no banco de dados.');
        return;
      }
      toast.success('Nova atividade salva no banco de dados!');
      setNewTitle('');
      setNewDescription('');
      setShowCreateModal(false);
      await loadData();
    } catch {
      toast.error('Erro de conexão ao publicar atividade.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 sm:p-8 text-slate-600 text-sm">
        <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
        Carregando dados reais do painel docente...
      </div>
    );
  }

  const stats: TeacherDashboardData = data ?? {
    totalClasses: 0,
    totalStudents: 0,
    activeMissionsCount: 0,
    totalMissionsCount: 0,
    totalCoinsDistributed: 0,
    missions: [],
  };

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <Badge variant="default" className="mb-1.5 sm:mb-2">Área Docente & Coordenação</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard do Professor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Acompanhe turmas, alunos, atividades publicadas e moedas distribuídas direto do banco
            de dados.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={Boolean(dbError)}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Atividade / Missão
          </Button>
          <Link
            href="/carometro"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Abrir Carômetro
          </Link>
        </div>
      </div>

      <DatabaseErrorBanner error={dbError} onRetry={loadData} loading={loading} />

      {!dbError && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <Card>
              <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Turmas no Banco
                  </p>
                  <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
                    {stats.totalClasses.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Alunos Matriculados
                  </p>
                  <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
                    {stats.totalStudents.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Missões Ativas
                  </p>
                  <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-1">
                    {stats.activeMissionsCount.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Flag className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Moedas Distribuídas
                  </p>
                  <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-1">
                    {stats.totalCoinsDistributed.toLocaleString('pt-BR')} JM$
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Published Missions from DB */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                  Atividades & Missões no Banco de Dados ({stats.missions.length})
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Registros reais da tabela <code className="font-mono">missions</code>
                </CardDescription>
              </div>
              <Link
                href="/wallets"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Creditar moedas em carteiras →
              </Link>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
              {stats.missions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs sm:text-sm text-slate-500">
                  Nenhuma missão cadastrada no banco ainda. Clique em{' '}
                  <strong>Nova Atividade / Missão</strong> para criar a primeira.
                </div>
              ) : (
                stats.missions.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-slate-900">
                        {m.title}
                      </p>
                      {m.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {m.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={m.status === 'inactive' ? 'secondary' : 'default'}>
                        {m.status === 'inactive' ? 'Inativa' : 'Ativa'}
                      </Badge>
                      <Badge variant="success">
                        +{Number(m.reward_amount ?? 0).toLocaleString('pt-BR')} JM$
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal to Create New Mission in DB */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900">
                Publicar Nova Atividade / Missão
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Fechar"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Título *</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: Exercícios de Frações e Educação Financeira"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Disciplina</label>
                  <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Recompensa (JM$) *
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={newReward}
                    onChange={(e) => setNewReward(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Descrição / Instruções
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Instruções para os alunos..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Salvar no Banco
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
