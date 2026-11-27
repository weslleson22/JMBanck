'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredDemoUser } from '@/lib/client';
import type {
  ClassRecord,
  ClassShift,
  GradeLevelRecord,
  SchoolRecord,
} from '@/lib/school-types';
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
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  School,
  Clock,
  DoorOpen,
  X,
} from 'lucide-react';

const SHIFTS: ClassShift[] = ['Matutino', 'Vespertino', 'Noturno', 'Integral'];

const classSchema = z.object({
  name: z.string().trim().min(2, 'Nome da turma é obrigatório'),
  grade_level_id: z.string().trim().min(1, 'Selecione a série'),
  school_id: z.string().trim().min(1, 'Selecione a escola'),
  shift: z.enum(['Matutino', 'Vespertino', 'Noturno', 'Integral']),
  academic_year: z.string().trim().min(4, 'Informe o ano letivo'),
  room: z.string().trim().optional().default(''),
  capacity: z.coerce.number().int().min(1, 'Capacidade mínima: 1').max(200, 'Máximo: 200'),
  status: z.enum(['active', 'inactive']),
});

type ClassFormData = z.infer<typeof classSchema>;

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [grades, setGrades] = useState<GradeLevelRecord[]>([]);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<string>('coordinator');

  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassRecord | null>(null);
  const [viewingItem, setViewingItem] = useState<ClassRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassRecord | null>(null);

  const canManageClasses = ['super_admin', 'school_admin'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      grade_level_id: '',
      school_id: '',
      shift: 'Matutino',
      academic_year: '2026',
      room: '',
      capacity: 35,
      status: 'active',
    },
  });

  async function loadAll() {
    setLoadingList(true);
    try {
      const [clsRes, grdRes, schRes] = await Promise.all([
        fetch('/api/classes', { cache: 'no-store' }),
        fetch('/api/grade-levels', { cache: 'no-store' }),
        fetch('/api/schools', { cache: 'no-store' }),
      ]);
      if (clsRes.ok) setClasses(await clsRes.json());
      if (grdRes.ok) setGrades(await grdRes.json());
      if (schRes.ok) setSchools(await schRes.json());
    } catch {
      toast.error('Erro ao carregar dados das turmas.');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);
    loadAll();
  }, []);

  const schoolMap = useMemo(
    () => new Map(schools.map((s) => [s.id, s.name])),
    [schools]
  );
  const gradeMap = useMemo(
    () => new Map(grades.map((g) => [g.id, g.name])),
    [grades]
  );

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const q = search.trim().toLowerCase();
      const sName = schoolMap.get(c.school_id) ?? '';
      const gName = gradeMap.get(c.grade_level_id) ?? '';
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        sName.toLowerCase().includes(q) ||
        gName.toLowerCase().includes(q) ||
        (c.room ?? '').toLowerCase().includes(q);
      const matchesSchool = !schoolFilter || c.school_id === schoolFilter;
      const matchesShift = !shiftFilter || c.shift === shiftFilter;
      return matchesSearch && matchesSchool && matchesShift;
    });
  }, [classes, search, schoolFilter, shiftFilter, schoolMap, gradeMap]);

  const totalCapacity = classes.reduce((acc, c) => acc + (c.capacity ?? 0), 0);
  const activeCount = classes.filter((c) => c.status === 'active').length;

  function openCreateModal() {
    setEditingItem(null);
    reset({
      name: '',
      grade_level_id: grades[0]?.id ?? '',
      school_id: schools[0]?.id ?? '',
      shift: 'Matutino',
      academic_year: '2026',
      room: '',
      capacity: 35,
      status: 'active',
    });
    setFormOpen(true);
  }

  function openEditModal(item: ClassRecord) {
    setEditingItem(item);
    reset({
      name: item.name,
      grade_level_id: item.grade_level_id,
      school_id: item.school_id,
      shift: item.shift ?? 'Matutino',
      academic_year: item.academic_year ?? '2026',
      room: item.room ?? '',
      capacity: item.capacity ?? 35,
      status: item.status ?? 'active',
    });
    setFormOpen(true);
  }

  async function onSubmit(data: ClassFormData) {
    if (!canManageClasses) return;
    setSaving(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/classes/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao atualizar turma.');
          return;
        }
        setClasses((prev) => prev.map((c) => (c.id === editingItem.id ? json : c)));
        toast.success('Turma atualizada com sucesso!');
      } else {
        const res = await fetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao criar turma.');
          return;
        }
        setClasses((prev) => [json, ...prev]);
        toast.success('Turma criada com sucesso!');
      }
      setFormOpen(false);
      setEditingItem(null);
    } catch {
      toast.error('Erro de conexão ao salvar turma.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !canManageClasses) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/classes/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao excluir turma.');
        return;
      }
      setClasses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success(`Turma "${deleteTarget.name}" excluída.`);
      setDeleteTarget(null);
    } catch {
      toast.error('Erro de conexão ao excluir turma.');
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
            Turmas Escolares
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            {canManageClasses
              ? 'Vincule turmas às respectivas séries, turnos, salas e unidades escolares.'
              : 'Visualização das turmas autorizadas da instituição.'}
          </p>
        </div>

        {canManageClasses && (
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Turma
          </Button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Total de Turmas
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {classes.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Turmas Ativas
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Capacidade Total
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-blue-600 mt-1">
              {totalCapacity} vagas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar turma por nome, série, sala ou escola..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-52"
            >
              <option value="">Todas as escolas</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-40"
            >
              <option value="">Todos os turnos</option>
              {SHIFTS.map((sh) => (
                <option key={sh} value={sh}>
                  {sh}
                </option>
              ))}
            </select>
            {(search || schoolFilter || shiftFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setSchoolFilter('');
                  setShiftFilter('');
                }}
                className="w-full sm:w-auto"
              >
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Listing */}
      <Card className="overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs sm:text-sm font-semibold text-slate-700">Turmas Cadastradas</p>
          <span className="text-xs text-slate-500 tabular-nums">
            Exibindo {filteredClasses.length} de {classes.length}
          </span>
        </div>

        <CardContent className="p-4 sm:p-6">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Carregando turmas...
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
              <Users className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma turma encontrada</p>
              <p className="text-xs text-slate-500">
                Ajuste os filtros ou cadastre uma nova turma escolar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClasses.map((c) => {
                const schoolName = schoolMap.get(c.school_id) ?? c.school_id;
                const gradeName = gradeMap.get(c.grade_level_id) ?? c.grade_level_id;
                return (
                  <div
                    key={c.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:border-blue-200 hover:bg-white p-3.5 sm:p-4 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mt-0.5">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-heading font-bold text-sm sm:text-[15px] text-slate-900">
                            {c.name}
                          </h3>
                          <Badge variant={c.status === 'active' ? 'success' : 'secondary'}>
                            {c.status === 'active' ? 'Ativa' : 'Inativa'}
                          </Badge>
                          <Badge variant="default">{c.shift}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{gradeName}</span>
                          <span className="inline-flex items-center gap-1">
                            <School className="h-3.5 w-3.5 text-slate-400" />
                            {schoolName}
                          </span>
                          {c.room && (
                            <span className="inline-flex items-center gap-1">
                              <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                              {c.room}
                            </span>
                          )}
                          {c.capacity && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {c.capacity} vagas · {c.academic_year}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <Button variant="ghost" size="sm" onClick={() => setViewingItem(c)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver
                      </Button>
                      {canManageClasses && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openEditModal(c)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Excluir
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
                  {editingItem ? 'Editar Turma' : 'Criar Nova Turma'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina a série, escola, turno, sala e limite de alunos da turma.
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
                  Nome / Código da Turma *
                </label>
                <Input {...register('name')} placeholder="Ex.: 9º Ano B - Vespertino" />
                {errors.name && (
                  <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Série *</label>
                  <select
                    {...register('grade_level_id')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Selecione a série</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  {errors.grade_level_id && (
                    <p className="text-xs font-medium text-red-600">
                      {errors.grade_level_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Escola *</label>
                  <select
                    {...register('school_id')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Selecione a escola</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {errors.school_id && (
                    <p className="text-xs font-medium text-red-600">
                      {errors.school_id.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Turno *</label>
                  <select
                    {...register('shift')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {SHIFTS.map((sh) => (
                      <option key={sh} value={sh}>
                        {sh}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Sala</label>
                  <Input {...register('room')} placeholder="Ex.: Sala 105" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Vagas *</label>
                  <Input type="number" min={1} max={200} {...register('capacity')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Ano Letivo *</label>
                  <Input {...register('academic_year')} placeholder="2026" />
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
                  {editingItem ? 'Salvar Alterações' : 'Criar Turma'}
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
                <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900">
                  {viewingItem.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="default">{viewingItem.shift}</Badge>
                  <Badge variant={viewingItem.status === 'active' ? 'success' : 'secondary'}>
                    {viewingItem.status === 'active' ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
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
                <span className="text-slate-500">Escola</span>
                <span className="font-semibold text-right">
                  {schoolMap.get(viewingItem.school_id) ?? viewingItem.school_id}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Série</span>
                <span className="font-semibold text-right">
                  {gradeMap.get(viewingItem.grade_level_id) ?? viewingItem.grade_level_id}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Sala</span>
                <span className="font-medium">{viewingItem.room || 'Não definida'}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Capacidade</span>
                <span className="font-semibold tabular-nums">
                  {viewingItem.capacity ?? 35} alunos
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Ano Letivo</span>
                <span className="font-semibold">{viewingItem.academic_year}</span>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {canManageClasses && (
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
        title="Excluir Turma"
        description="Tem certeza que deseja excluir esta turma? Esta ação não poderá ser desfeita."
        itemName={deleteTarget?.name}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
