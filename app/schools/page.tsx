'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredDemoUser } from '@/lib/client';
import type { SchoolRecord } from '@/lib/school-types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DatabaseErrorBanner, type DbErrorState } from '@/components/ui/db-error-banner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { toast } from 'sonner';
import {
  Loader2,
  School,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  MapPin,
  UserCheck,
  Calendar,
  Hash,
  X,
} from 'lucide-react';

const schoolSchema = z.object({
  name: z.string().trim().min(2, 'Nome da escola é obrigatório'),
  code: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  academic_year: z.string().trim().min(4, 'Informe o ano letivo (ex: 2026)'),
  director_name: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<string>('super_admin');

  // Search & filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolRecord | null>(null);
  const [viewingSchool, setViewingSchool] = useState<SchoolRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolRecord | null>(null);

  const canManage = ['super_admin', 'school_admin'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: '',
      code: '',
      city: '',
      academic_year: '2026',
      director_name: '',
      status: 'active',
    },
  });

  async function loadSchools() {
    setLoadingList(true);
    setDbError(null);
    try {
      const res = await fetch('/api/schools', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDbError({
          message: data?.message ?? 'Erro ao carregar escolas do banco de dados.',
          code: data?.code,
          hint: data?.hint,
        });
        setSchools([]);
        return;
      }
      if (Array.isArray(data)) setSchools(data);
    } catch {
      setDbError({
        message: 'Falha de rede ao consultar escolas no banco de dados.',
        code: 'NETWORK_ERROR',
      });
      setSchools([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);
    loadSchools();
  }, []);

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.code ?? '').toLowerCase().includes(q) ||
        (s.city ?? '').toLowerCase().includes(q) ||
        (s.director_name ?? '').toLowerCase().includes(q);
      const matchesStatus = !statusFilter || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [schools, search, statusFilter]);

  const activeCount = schools.filter((s) => s.status === 'active').length;
  const inactiveCount = schools.length - activeCount;

  function openCreateModal() {
    setEditingSchool(null);
    reset({
      name: '',
      code: '',
      city: '',
      academic_year: '2026',
      director_name: '',
      status: 'active',
    });
    setFormOpen(true);
  }

  function openEditModal(school: SchoolRecord) {
    setEditingSchool(school);
    reset({
      name: school.name,
      code: school.code ?? '',
      city: school.city ?? '',
      academic_year: school.academic_year ?? '2026',
      director_name: school.director_name ?? '',
      status: school.status ?? 'active',
    });
    setFormOpen(true);
  }

  async function onSubmit(data: SchoolFormData) {
    if (!canManage) return;
    setSaving(true);
    try {
      if (editingSchool) {
        const res = await fetch(`/api/schools/${editingSchool.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao atualizar escola.');
          return;
        }
        setSchools((prev) => prev.map((s) => (s.id === editingSchool.id ? json : s)));
        toast.success('Escola atualizada com sucesso!');
      } else {
        const res = await fetch('/api/schools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao cadastrar escola.');
          return;
        }
        setSchools((prev) => [json, ...prev]);
        toast.success('Escola cadastrada com sucesso!');
      }
      setFormOpen(false);
      setEditingSchool(null);
    } catch {
      toast.error('Erro de conexão ao salvar escola.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !canManage) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/schools/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao excluir escola.');
        return;
      }
      setSchools((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success(`Escola "${deleteTarget.name}" excluída.`);
      setDeleteTarget(null);
    } catch {
      toast.error('Erro de conexão ao excluir escola.');
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
            Escolas & Unidades
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Gerencie as instituições de ensino, anos letivos, códigos INEP e diretores responsáveis.
          </p>
        </div>

        {canManage && (
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Escola
          </Button>
        )}
      </div>

      {/* KPI Strip */}
      <DatabaseErrorBanner error={dbError} onRetry={loadSchools} loading={loadingList} />

      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Total
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {schools.length}
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
              Inativas
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-slate-600 mt-1">
              {inactiveCount}
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
              placeholder="Buscar por nome, código INEP, cidade ou diretor..."
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-44"
          >
            <option value="">Todas as situações</option>
            <option value="active">Somente Ativas</option>
            <option value="inactive">Somente Inativas</option>
          </select>
          {(search || statusFilter) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
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
            Instituições Cadastradas
          </p>
          <span className="text-xs text-slate-500 tabular-nums">
            Exibindo {filteredSchools.length} de {schools.length}
          </span>
        </div>

        <CardContent className="p-4 sm:p-6">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Carregando escolas...
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
              <School className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma escola encontrada</p>
              <p className="text-xs text-slate-500">
                Ajuste os filtros de busca ou cadastre uma nova unidade escolar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSchools.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:border-blue-200 hover:bg-white p-3.5 sm:p-4 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mt-0.5">
                      <School className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading font-bold text-sm sm:text-[15px] text-slate-900 break-words">
                          {s.name}
                        </h3>
                        <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>
                          {s.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Badge variant="default">Ano Letivo {s.academic_year}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {s.code && (
                          <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                            <Hash className="h-3 w-3 text-slate-400" />
                            {s.code}
                          </span>
                        )}
                        {s.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {s.city}
                          </span>
                        )}
                        {s.director_name && (
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                            Dir.: {s.director_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingSchool(s)}
                      title="Visualizar detalhes"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(s)}
                          title="Editar escola"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(s)}
                          title="Excluir escola"
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
                  {editingSchool ? 'Editar Escola' : 'Cadastrar Nova Escola'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preencha os dados institucionais da unidade escolar.
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
                <label className="text-xs font-semibold text-slate-700">
                  Nome da Instituição *
                </label>
                <Input
                  {...register('name')}
                  placeholder="Ex.: Escola Municipal Monteiro Lobato"
                />
                {errors.name && (
                  <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Código INEP / Unidade
                  </label>
                  <Input {...register('code')} placeholder="Ex.: INEP-21048290" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Ano Letivo *</label>
                  <Input {...register('academic_year')} placeholder="Ex.: 2026" />
                  {errors.academic_year && (
                    <p className="text-xs font-medium text-red-600">
                      {errors.academic_year.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Cidade / UF</label>
                  <Input {...register('city')} placeholder="Ex.: São Luís - MA" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Diretor(a) Responsável
                  </label>
                  <Input {...register('director_name')} placeholder="Ex.: Helena Costa" />
                </div>
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
                  {editingSchool ? 'Salvar Alterações' : 'Cadastrar Escola'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingSchool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <School className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 break-words">
                    {viewingSchool.name}
                  </h3>
                  <Badge variant={viewingSchool.status === 'active' ? 'success' : 'secondary'}>
                    {viewingSchool.status === 'active' ? 'Unidade Ativa' : 'Unidade Inativa'}
                  </Badge>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingSchool(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 space-y-2.5 text-xs sm:text-sm text-slate-700">
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">ID do Registro</span>
                <span className="font-mono text-xs text-slate-800">{viewingSchool.id}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Código INEP</span>
                <span className="font-mono text-xs text-slate-800">
                  {viewingSchool.code || 'Não informado'}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Ano Letivo</span>
                <span className="font-semibold inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  {viewingSchool.academic_year}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Cidade / UF</span>
                <span className="font-medium">{viewingSchool.city || 'Não informada'}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Diretor(a)</span>
                <span className="font-medium">
                  {viewingSchool.director_name || 'Não informado'}
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = viewingSchool;
                    setViewingSchool(null);
                    openEditModal(target);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
              )}
              <Button size="sm" onClick={() => setViewingSchool(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir Escola"
        description="Tem certeza que deseja excluir esta instituição? Esta ação não poderá ser desfeita."
        itemName={deleteTarget?.name}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
