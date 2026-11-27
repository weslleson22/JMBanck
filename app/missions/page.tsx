'use client';

import { getStoredDemoUser } from '@/lib/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Flag, Plus, Loader2 } from 'lucide-react';

interface MissionRow {
  id: string;
  school_id?: string;
  title: string;
  description?: string;
  subject?: string;
  reward_amount: number;
  status?: string;
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);
  const [role, setRole] = useState<string>('student');

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Matemática');
  const [rewardAmount, setRewardAmount] = useState(30);
  const [description, setDescription] = useState('');

  const canCreateMission = ['super_admin', 'school_admin', 'coordinator', 'teacher'].includes(role);

  async function loadMissions() {
    setLoadingList(true);
    setDbError(null);
    try {
      const res = await fetch('/api/missions', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDbError({
          message: json?.message ?? 'Erro ao carregar missões do banco de dados.',
          code: json?.code,
          hint: json?.hint,
        });
        setMissions([]);
        return;
      }
      setMissions(Array.isArray(json) ? json : []);
    } catch {
      setDbError({
        message: 'Falha de rede ao consultar missões no servidor.',
        code: 'NETWORK_ERROR',
      });
      setMissions([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);
    loadMissions();
  }, []);

  async function handleCreateMission(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreateMission) return;
    if (!title.trim()) {
      toast.error('Informe o título da missão.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          description: description.trim(),
          reward_amount: Number(rewardAmount) || 0,
          status: 'active',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao salvar missão no banco de dados.');
        return;
      }
      setMissions((prev) => [json, ...prev]);
      toast.success('Missão salva no banco de dados!');
      setTitle('');
      setDescription('');
    } catch {
      toast.error('Erro de conexão ao salvar missão.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <Badge variant="default" className="mb-2">Gamificação Pedagógica</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Missões, Atividades & Desafios
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          {canCreateMission
            ? 'Cadastre e acompanhe missões pedagógicas salvas diretamente no banco de dados.'
            : 'Consulte as missões pedagógicas ativas registradas pela sua escola.'}
        </p>
      </div>

      <DatabaseErrorBanner error={dbError} onRetry={loadMissions} loading={loadingList} />

      <section className={`grid grid-cols-1 ${canCreateMission ? 'lg:grid-cols-3' : ''} gap-5 sm:gap-6`}>
        {/* Missions List */}
        <div className={`${canCreateMission ? 'lg:col-span-2' : ''} space-y-3.5 sm:space-y-4`}>
          {loadingList ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Carregando missões do banco de dados...
            </div>
          ) : !dbError && missions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <Flag className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma missão cadastrada no banco de dados
                </p>
                <p className="text-xs text-slate-500">
                  {canCreateMission
                    ? 'Use o formulário ao lado para publicar a primeira missão.'
                    : 'Aguarde seu professor publicar novas atividades.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            missions.map((m) => (
              <Card key={m.id} className="overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {m.subject && <Badge variant="secondary">{m.subject}</Badge>}
                      <Badge variant={m.status === 'inactive' ? 'secondary' : 'default'}>
                        {m.status === 'inactive' ? 'Inativa' : 'Ativa'}
                      </Badge>
                      <Badge variant="success">
                        +{Number(m.reward_amount ?? 0).toLocaleString('pt-BR')} JM$
                      </Badge>
                    </div>
                    <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900">
                      {m.title}
                    </h3>
                    {m.description && (
                      <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Form */}
        {canCreateMission && (
          <Card className="h-fit overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                Nova Missão / Atividade
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Salva diretamente na tabela <code className="font-mono">missions</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              <form onSubmit={handleCreateMission} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Título *</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Desafio de Matemática Financeira"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Disciplina</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Recompensa (JM$) *
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Descrição</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Instruções e critérios de avaliação..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <Button type="submit" disabled={saving || Boolean(dbError)} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Publicar no Banco
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
