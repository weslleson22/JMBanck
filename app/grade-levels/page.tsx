'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredDemoUser } from '@/lib/client';
import type { GradeLevelRecord } from '@/lib/school-types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { toast } from 'sonner';
import {
  Loader2,
  GraduationCap,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
} from 'lucide-react';

const STAGES = [
  'Educação Infantil',
  'Ensino Fundamental I',
  'Ensino Fundamental II',
  'Ensino Médio',
];

const gradeLevelSchema = z.object({
  name: z.string().trim().min(2, 'Nome da série é obrigatório'),
  stage: z.string().trim().min(2, 'Selecione a etapa de ensino'),
  order_index: z.coerce.number().int().min(1, 'Informe uma ordem a partir de 1'),
  description: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']),
});

type GradeLevelFormData = z.infer<typeof gradeLevelSchema>;

export default function GradeLevelsPage() {
  const [levels, setLevels] = useState<GradeLevelRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<string>('super_admin');

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GradeLevelRecord | null>(null);
  const [viewingItem, setViewingItem] = useState<GradeLevelRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradeLevelRecord | null>(null);

  const canManage = ['super_admin', 'school_admin'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GradeLevelFormData>({
    resolver: zodResolver(gradeLevelSchema),
    defaultValues: {
      name: '',
      stage: 'Ensino Fundamental II',
      order_index: 1,
      description: '',
      status: 'active',
    },
  });

  async function loadLevels() {
    setLoadingList(true);
    try {
      const res = await fetch('/api/grade-levels', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setLevels(data);
      }
    } catch {
      toast.error('Não foi possível carregar as séries.');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);
    loadLevels();
  }, []);

  const filteredLevels = useMemo(() => {
    return levels
      .filter((l) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          l.name.toLowerCase().includes(q) ||
          l.stage.toLowerCase().includes(q) ||
          String(l.order_index).includes(q);
        const matchesStage = !stageFilter || l.stage === stageFilter;
        return matchesSearch && matchesStage;
      })
      .sort((a, b) => a.order_index - b.order_index);
  }, [levels, search, stageFilter]);

  const activeCount = levels.filter((l) => l.status === 'active').length;
  const stagesUsedCount = new Set(levels.map((l) => l.stage)).size;

  function openCreateModal() {
    setEditingItem(null);
    const nextOrder =
      levels.length > 0 ? Math.max(...levels.map((l) => l.order_index)) + 1 : 1;
    reset({
      name: '',
      stage: 'Ensino Fundamental II',
      order_index: nextOrder,
      description: '',
      status: 'active',
    });
    setFormOpen(true);
  }

  function openEditModal(item: GradeLevelRecord) {
    setEditingItem(item);
    reset({
      name: item.name,
      stage: item.stage ?? 'Ensino Fundamental II',
      order_index: item.order_index,
      description: item.description ?? '',
      status: item.status ?? 'active',
    });
    setFormOpen(true);
  }

  async function onSubmit(data: GradeLevelFormData) {
    if (!canManage) return;
    setSaving(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/grade-levels/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao atualizar série.');
          return;
        }
        setLevels((prev) =>
          prev
            .map((l) => (l.id === editingItem.id ? json : l))
            .sort((a, b) => a.order_index - b.order_index)
        );
        toast.success('Série atualizada com sucesso!');
      } else {
        const res = await fetch('/api/grade-levels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao cadastrar série.');
          return;
        }
        setLevels((prev) =>
          [...prev, json].sort((a, b) => a.order_index - b.order_index)
        );
        toast.success('Série cadastrada com sucesso!');
      }
      setFormOpen(false);
      setEditingItem(null);
    } catch {
      toast.error('Erro de conexão ao salvar série.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !canManage) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/grade-levels/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao excluir série.');
        return;
      }
      setLevels((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      toast.success(`Série "${deleteTarget.name}" excluída.`);
      setDeleteTarget(null);
    } catch {
      toast.error('Erro de conexão ao excluir série.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Estrutura Organizacional</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Séries & Anos Escolares
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Organização hierárquica: Escola → Ano Letivo → Série → Turma → Alunos.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Série / Ano
          </Button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Séries Cadastradas
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {levels.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Ativas
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Etapas de Ensino
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-blue-600 mt-1">
              {stagesUsedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar série por nome, etapa ou ordem..."
              className="pl-9"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-56"
          >
            <option value="">Todas as etapas</option>
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          {(search || stageFilter) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setStageFilter('');
              }}
              className="w-full sm:w-auto"
            >
              Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Listing */}
      <Card className="overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs sm:text-sm font-semibold text-slate-700">
            Séries Ordenadas por Progressão
          </p>
          <span className="text-xs text-slate-500 tabular-nums">
            Exibindo {filteredLevels.length} de {levels.length}
          </span>
        </div>

        <CardContent className="p-4 sm:p-6">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Carregando séries...
            </div>
          ) : filteredLevels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
              <GraduationCap className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma série encontrada</p>
              <p className="text-xs text-slate-500">
                Cadastre uma nova série escolar ou ajuste o filtro de etapa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLevels.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:border-blue-200 hover:bg-white p-3.5 sm:p-4 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="font-numeric flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-sm">
                      #{l.order_index}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading font-bold text-sm sm:text-[15px] text-slate-900">
                          {l.name}
                        </h3>
                        <Badge variant="secondary">{l.stage}</Badge>
                        <Badge variant={l.status === 'active' ? 'success' : 'secondary'}>
                          {l.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      {l.description && (
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {l.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <Button variant="ghost" size="sm" onClick={() => setViewingItem(l)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver
                    </Button>
                    {canManage && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openEditModal(l)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(l)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">
                  {editingItem ? 'Editar Série / Ano' : 'Cadastrar Nova Série / Ano'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure o nível de ensino e sua ordem na grade curricular.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nome da Série *</label>
                <Input {...register('name')} placeholder="Ex.: 7º Ano - Ensino Fundamental II" />
                {errors.name && (
                  <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Etapa de Ensino *
                  </label>
                  <select
                    {...register('stage')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Ordem Sequencial *
                  </label>
                  <Input type="number" min={1} {...register('order_index')} placeholder="Ex.: 7" />
                  {errors.order_index && (
                    <p className="text-xs font-medium text-red-600">
                      {errors.order_index.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Descrição Pedagógica (opcional)
                </label>
                <textarea
                  rows={3}
                  {...register('description')}
                  placeholder="Observações sobre esta etapa de ensino..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-base sm:text-sm text-slate-900 leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Situação</label>
                <select
                  {...register('status')}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  {editingItem ? 'Salvar Alterações' : 'Criar Série'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <Badge variant="secondary" className="mb-1">
                  Ordem #{viewingItem.order_index}
                </Badge>
                <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900">
                  {viewingItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 space-y-2.5 text-xs sm:text-sm text-slate-700">
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">ID</span>
                <span className="font-mono text-xs">{viewingItem.id}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Etapa de Ensino</span>
                <span className="font-semibold">{viewingItem.stage}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Situação</span>
                <Badge variant={viewingItem.status === 'active' ? 'success' : 'secondary'}>
                  {viewingItem.status === 'active' ? 'Ativa' : 'Inativa'}
                </Badge>
              </p>
              {viewingItem.description && (
                <div className="pt-2 border-t border-slate-200/70">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Descrição</p>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
                    {viewingItem.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = viewingItem;
                    setViewingItem(null);
                    openEditModal(target);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
              )}
              <Button size="sm" onClick={() => setViewingItem(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir Série / Ano"
        description="Tem certeza que deseja excluir esta série escolar? Esta ação não poderá ser desfeita."
        itemName={deleteTarget?.name}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
