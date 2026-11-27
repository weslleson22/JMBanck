'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredDemoUser } from '@/lib/client';
import type { ClassRecord, SchoolRecord, TeacherRecord } from '@/lib/school-types';
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
  UserCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Mail,
  Phone,
  BookOpen,
  School,
  X,
} from 'lucide-react';

const teacherSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo do professor'),
  email: z.string().trim().email('Informe um e-mail válido').or(z.literal('')).optional().default(''),
  subject: z.string().trim().min(2, 'Informe a disciplina principal'),
  school_id: z.string().trim().optional().default(''),
  phone: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<string>('super_admin');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Multi-select linked classes in form
  const [selectedClassNames, setSelectedClassNames] = useState<string[]>([]);
  const [customClassesText, setCustomClassesText] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TeacherRecord | null>(null);
  const [viewingItem, setViewingItem] = useState<TeacherRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherRecord | null>(null);

  const canManage = ['super_admin', 'school_admin'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      school_id: '',
      phone: '',
      status: 'active',
    },
  });

  async function loadAll() {
    setLoadingList(true);
    try {
      const [tRes, cRes, sRes] = await Promise.all([
        fetch('/api/teachers', { cache: 'no-store' }),
        fetch('/api/classes', { cache: 'no-store' }),
        fetch('/api/schools', { cache: 'no-store' }),
      ]);
      if (tRes.ok) setTeachers(await tRes.json());
      if (cRes.ok) setClasses(await cRes.json());
      if (sRes.ok) setSchools(await sRes.json());
    } catch {
      toast.error('Erro ao carregar professores.');
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

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.email ?? '').toLowerCase().includes(q) ||
        (t.classes_linked ?? '').toLowerCase().includes(q);
      const matchesStatus = !statusFilter || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [teachers, search, statusFilter]);

  const activeCount = teachers.filter((t) => t.status === 'active').length;
  const subjectsCount = new Set(teachers.map((t) => t.subject.toLowerCase())).size;

  function toggleClassName(name: string) {
    setSelectedClassNames((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  }

  function openCreateModal() {
    setEditingItem(null);
    setSelectedClassNames([]);
    setCustomClassesText('');
    reset({
      name: '',
      email: '',
      subject: '',
      school_id: schools[0]?.id ?? '',
      phone: '',
      status: 'active',
    });
    setFormOpen(true);
  }

  function openEditModal(item: TeacherRecord) {
    setEditingItem(item);
    const knownClassNames = new Set(classes.map((c) => c.name));
    const parsedList = (item.classes_linked ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'Sem turma vinculada');
    const matched = parsedList.filter((name) => knownClassNames.has(name));
    const extras = parsedList.filter((name) => !knownClassNames.has(name));
    setSelectedClassNames(matched);
    setCustomClassesText(extras.join(', '));

    reset({
      name: item.name,
      email: item.email ?? '',
      subject: item.subject,
      school_id: item.school_id ?? '',
      phone: item.phone ?? '',
      status: item.status ?? 'active',
    });
    setFormOpen(true);
  }

  async function onSubmit(data: TeacherFormData) {
    if (!canManage) return;
    setSaving(true);

    const extras = customClassesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const combinedClasses = Array.from(new Set([...selectedClassNames, ...extras])).join(', ');

    const payload = {
      ...data,
      classes_linked: combinedClasses || 'Sem turma vinculada',
    };

    try {
      if (editingItem) {
        const res = await fetch(`/api/teachers/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao atualizar professor.');
          return;
        }
        setTeachers((prev) => prev.map((t) => (t.id === editingItem.id ? json : t)));
        toast.success('Professor atualizado com sucesso!');
      } else {
        const res = await fetch('/api/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao cadastrar professor.');
          return;
        }
        setTeachers((prev) => [json, ...prev]);
        toast.success('Professor cadastrado e vinculado às turmas!');
      }
      setFormOpen(false);
      setEditingItem(null);
    } catch {
      toast.error('Erro de conexão ao salvar professor.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !canManage) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/teachers/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao excluir professor.');
        return;
      }
      setTeachers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success(`Professor "${deleteTarget.name}" excluído.`);
      setDeleteTarget(null);
    } catch {
      toast.error('Erro de conexão ao excluir professor.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Corpo Docente</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Professores & Vínculos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Cadastre docentes, gerencie disciplinas, contatos e vínculos com turmas escolares.
          </p>
        </div>

        {canManage && (
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Professor
          </Button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Total Docentes
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {teachers.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Ativos
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Disciplinas
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-blue-600 mt-1">
              {subjectsCount}
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
              placeholder="Buscar por nome, disciplina, e-mail ou turma..."
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-44"
          >
            <option value="">Todas as situações</option>
            <option value="active">Somente Ativos</option>
            <option value="inactive">Somente Inativos</option>
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
            Professores Cadastrados
          </p>
          <span className="text-xs text-slate-500 tabular-nums">
            Exibindo {filteredTeachers.length} de {teachers.length}
          </span>
        </div>

        <CardContent className="p-4 sm:p-6">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Carregando professores...
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
              <UserCheck className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhum professor encontrado</p>
              <p className="text-xs text-slate-500">
                Cadastre um docente ou ajuste os filtros da busca.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTeachers.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:border-blue-200 hover:bg-white p-3.5 sm:p-4 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mt-0.5">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading font-bold text-sm sm:text-[15px] text-slate-900">
                          {t.name}
                        </h3>
                        <Badge variant={t.status === 'active' ? 'success' : 'secondary'}>
                          {t.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="default">{t.subject}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                          Turmas: <strong className="font-medium text-slate-700">{t.classes_linked}</strong>
                        </span>
                        {t.email && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {t.email}
                          </span>
                        )}
                        {t.school_id && schoolMap.get(t.school_id) && (
                          <span className="inline-flex items-center gap-1">
                            <School className="h-3.5 w-3.5 text-slate-400" />
                            {schoolMap.get(t.school_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <Button variant="ghost" size="sm" onClick={() => setViewingItem(t)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver
                    </Button>
                    {canManage && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openEditModal(t)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(t)}
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
                  {editingItem ? 'Editar Professor' : 'Cadastrar Novo Professor'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informe os dados do docente e selecione as turmas vinculadas.
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
                <label className="text-xs font-semibold text-slate-700">Nome Completo *</label>
                <Input {...register('name')} placeholder="Ex.: Prof. Carlos Alberto" />
                {errors.name && (
                  <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Disciplina Principal *
                  </label>
                  <Input {...register('subject')} placeholder="Ex.: Ciências / Física" />
                  {errors.subject && (
                    <p className="text-xs font-medium text-red-600">{errors.subject.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Escola</label>
                  <select
                    {...register('school_id')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Sem vínculo fixo</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    E-mail Institucional
                  </label>
                  <Input
                    type="email"
                    {...register('email')}
                    placeholder="professor@jmbank.edu.br"
                  />
                  {errors.email && (
                    <p className="text-xs font-medium text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Telefone</label>
                  <Input {...register('phone')} placeholder="(98) 99999-0000" />
                </div>
              </div>

              {/* Dynamic Class Multi-select */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Turmas Vinculadas (selecione uma ou mais)
                </label>
                {classes.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    {classes.map((cls) => {
                      const active = selectedClassNames.includes(cls.name);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleClassName(cls.name)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}
                          {cls.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <Input
                  value={customClassesText}
                  onChange={(e) => setCustomClassesText(e.target.value)}
                  placeholder="Outras turmas (opcional, separadas por vírgula)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Situação</label>
                <select
                  {...register('status')}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
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
                  {editingItem ? 'Salvar Alterações' : 'Salvar Professor'}
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
                  <Badge variant="default">{viewingItem.subject}</Badge>
                  <Badge variant={viewingItem.status === 'active' ? 'success' : 'secondary'}>
                    {viewingItem.status === 'active' ? 'Ativo' : 'Inativo'}
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
                <span className="text-slate-500">E-mail</span>
                <span className="font-mono text-xs">{viewingItem.email || 'Não informado'}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Telefone</span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {viewingItem.phone || 'Não informado'}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Escola</span>
                <span className="font-medium text-right">
                  {viewingItem.school_id
                    ? schoolMap.get(viewingItem.school_id) ?? viewingItem.school_id
                    : 'Não vinculada'}
                </span>
              </p>
              <div className="pt-2 border-t border-slate-200/70">
                <p className="text-xs font-semibold text-slate-500 mb-1">Turmas Vinculadas</p>
                <p className="text-xs sm:text-sm font-medium text-slate-800">
                  {viewingItem.classes_linked}
                </p>
              </div>
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
        title="Excluir Professor"
        description="Tem certeza que deseja excluir este docente? Esta ação não poderá ser desfeita."
        itemName={deleteTarget?.name}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
