'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredDemoUser } from '@/lib/client';
import type { ClassRecord, StudentRecord, StudentStatus } from '@/lib/school-types';
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
  ArrowLeftRight,
  User,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  ShieldCheck,
  Phone,
  Users,
  X,
} from 'lucide-react';
import {
  fetchAllStudentPhotos,
  getCachedStudentPhotos,
  type StudentPhotoRecord,
} from '@/lib/carometro-store';

const studentSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo do aluno'),
  enrollment_number: z.string().trim().min(1, 'Informe o número da matrícula'),
  class_id: z.string().trim().min(1, 'Selecione a turma'),
  guardian_name: z.string().trim().optional().default(''),
  guardian_contact: z.string().trim().optional().default(''),
  birth_date: z.string().trim().optional().default(''),
  status: z.enum(['active', 'transferred', 'inactive']),
  lgpd_consent: z.boolean().optional().default(true),
});

type StudentFormData = z.infer<typeof studentSchema>;

function statusLabel(status: StudentStatus) {
  if (status === 'active') return 'Matrícula Ativa';
  if (status === 'transferred') return 'Transferido';
  return 'Inativo';
}

function statusBadgeVariant(status: StudentStatus) {
  if (status === 'active') return 'success' as const;
  if (status === 'transferred') return 'warning' as const;
  return 'secondary' as const;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [photosMap, setPhotosMap] = useState<Record<string, StudentPhotoRecord>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<string>('teacher');

  // Search & filters
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StudentRecord | null>(null);
  const [viewingItem, setViewingItem] = useState<StudentRecord | null>(null);
  const [transferTarget, setTransferTarget] = useState<StudentRecord | null>(null);
  const [transferClassId, setTransferClassId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);

  const canManageStudents = ['super_admin', 'school_admin'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      enrollment_number: '',
      class_id: '',
      guardian_name: '',
      guardian_contact: '',
      birth_date: '',
      status: 'active',
      lgpd_consent: true,
    },
  });

  async function loadAll() {
    setLoadingList(true);
    try {
      const [stuRes, clsRes, dbPhotos] = await Promise.all([
        fetch('/api/students', { cache: 'no-store' }),
        fetch('/api/classes', { cache: 'no-store' }),
        fetchAllStudentPhotos(),
      ]);
      if (stuRes.ok) setStudents(await stuRes.json());
      if (clsRes.ok) setClasses(await clsRes.json());
      setPhotosMap(dbPhotos);
    } catch {
      toast.error('Erro ao carregar alunos.');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);
    setPhotosMap(getCachedStudentPhotos());
    loadAll();

    const handleSync = () => setPhotosMap(getCachedStudentPhotos());
    window.addEventListener('jmbank-photos-update', handleSync);
    return () => window.removeEventListener('jmbank-photos-update', handleSync);
  }, []);

  const classMap = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.trim().toLowerCase();
      const clsName = classMap.get(s.class_id) ?? s.class_name ?? s.class_id;
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.enrollment_number.toLowerCase().includes(q) ||
        (s.guardian_name ?? '').toLowerCase().includes(q) ||
        clsName.toLowerCase().includes(q);
      const matchesClass = !classFilter || s.class_id === classFilter;
      const matchesStatus = !statusFilter || s.status === statusFilter;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, search, classFilter, statusFilter, classMap]);

  const activeCount = students.filter((s) => s.status === 'active').length;
  const transferredCount = students.filter((s) => s.status === 'transferred').length;

  function openCreateModal() {
    setEditingItem(null);
    const nextEnrollment = `2026${String(students.length + 50).padStart(4, '0')}`;
    reset({
      name: '',
      enrollment_number: nextEnrollment,
      class_id: classes[0]?.id ?? '',
      guardian_name: '',
      guardian_contact: '',
      birth_date: '',
      status: 'active',
      lgpd_consent: true,
    });
    setFormOpen(true);
  }

  function openEditModal(item: StudentRecord) {
    setEditingItem(item);
    reset({
      name: item.name,
      enrollment_number: item.enrollment_number,
      class_id: item.class_id,
      guardian_name: item.guardian_name ?? '',
      guardian_contact: item.guardian_contact ?? '',
      birth_date: item.birth_date ?? '',
      status: item.status ?? 'active',
      lgpd_consent: item.lgpd_consent ?? true,
    });
    setFormOpen(true);
  }

  function openTransferModal(item: StudentRecord) {
    setTransferTarget(item);
    const otherClass = classes.find((c) => c.id !== item.class_id);
    setTransferClassId(otherClass?.id ?? item.class_id);
  }

  async function onSubmit(data: StudentFormData) {
    if (!canManageStudents) return;
    setSaving(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/students/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao atualizar aluno.');
          return;
        }
        setStudents((prev) => prev.map((s) => (s.id === editingItem.id ? json : s)));
        toast.success('Cadastro do aluno atualizado com sucesso!');
      } else {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao matricular aluno.');
          return;
        }
        setStudents((prev) => [json, ...prev]);
        toast.success('Aluno matriculado e carteira digital inicializada!');
      }
      setFormOpen(false);
      setEditingItem(null);
    } catch {
      toast.error('Erro de conexão ao salvar aluno.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmTransfer() {
    if (!transferTarget || !transferClassId || !canManageStudents) return;
    setTransferring(true);
    try {
      const res = await fetch(`/api/students/${transferTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: transferClassId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao transferir aluno.');
        return;
      }
      setStudents((prev) => prev.map((s) => (s.id === transferTarget.id ? json : s)));
      const newClassName = classMap.get(transferClassId) ?? transferClassId;
      toast.success(`${transferTarget.name} transferido(a) para ${newClassName}!`);
      setTransferTarget(null);
    } catch {
      toast.error('Erro de conexão ao transferir aluno.');
    } finally {
      setTransferring(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !canManageStudents) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/students/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao excluir aluno.');
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success(`Aluno "${deleteTarget.name}" removido do sistema.`);
      setDeleteTarget(null);
    } catch {
      toast.error('Erro de conexão ao excluir aluno.');
    } finally {
      setDeleting(false);
    }
  }

  function getPhotoUrl(s: StudentRecord) {
    return photosMap[s.id]?.photoDataUrl ?? s.photo_path ?? null;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Secretaria & Consulta Escolar</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Relação de Alunos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            {canManageStudents
              ? 'Gerencie matrículas, dados cadastrais, responsáveis, transferências de turma e desligamentos.'
              : 'Consulta de estudantes matriculados nas turmas autorizadas.'}
          </p>
        </div>

        {canManageStudents && (
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" />
            Matricular Aluno
          </Button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Total Alunos
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {students.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Matrículas Ativas
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Transferidos
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">
              {transferredCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, matrícula, turma ou responsável..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-48"
            >
              <option value="">Todas as turmas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-44"
            >
              <option value="">Todas as situações</option>
              <option value="active">Matrícula Ativa</option>
              <option value="transferred">Transferido</option>
              <option value="inactive">Inativo</option>
            </select>
            {(search || classFilter || statusFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setClassFilter('');
                  setStatusFilter('');
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
          <p className="text-xs sm:text-sm font-semibold text-slate-700">Alunos Matriculados</p>
          <span className="text-xs text-slate-500 tabular-nums">
            Exibindo {filteredStudents.length} de {students.length}
          </span>
        </div>

        <CardContent className="p-4 sm:p-6">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Carregando relação de alunos...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
              <Users className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhum aluno encontrado</p>
              <p className="text-xs text-slate-500">
                Ajuste os filtros ou realize uma nova matrícula.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((s) => {
                const photoUrl = getPhotoUrl(s);
                const resolvedClass = classMap.get(s.class_id) ?? s.class_name ?? s.class_id;
                return (
                  <div
                    key={s.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:border-blue-200 hover:bg-white p-3.5 sm:p-4 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center shrink-0 text-blue-700 font-bold text-xs border-2 border-white shadow-sm">
                        {photoUrl ? (
                          <img src={photoUrl} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-heading font-bold text-sm sm:text-[15px] text-slate-900 truncate">
                            {s.name}
                          </h3>
                          <Badge variant={statusBadgeVariant(s.status)}>
                            {statusLabel(s.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          Matrícula:{' '}
                          <span className="font-mono tabular-nums font-medium text-slate-700">
                            {s.enrollment_number}
                          </span>{' '}
                          · Turma:{' '}
                          <strong className="font-semibold text-slate-700">{resolvedClass}</strong>
                          {s.guardian_name ? ` · Resp.: ${s.guardian_name}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <Button variant="ghost" size="sm" onClick={() => setViewingItem(s)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver
                      </Button>
                      {canManageStudents && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTransferModal(s)}
                            title="Transferir aluno de turma"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
                            Transferir
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditModal(s)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setDeleteTarget(s)}
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
                  {editingItem ? 'Editar Cadastro do Aluno' : 'Matricular Novo Aluno'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Os dados ficam sincronizados com a Carteira Digital e o Carômetro Escolar.
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
                <Input {...register('name')} placeholder="Ex.: Sofia Rodrigues" />
                {errors.name && (
                  <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Número de Matrícula *
                  </label>
                  <Input {...register('enrollment_number')} placeholder="Ex.: 20260055" />
                  {errors.enrollment_number && (
                    <p className="text-xs font-medium text-red-600">
                      {errors.enrollment_number.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Turma *</label>
                  <select
                    {...register('class_id')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Selecione a turma</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.class_id && (
                    <p className="text-xs font-medium text-red-600">{errors.class_id.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Nome do Responsável
                  </label>
                  <Input {...register('guardian_name')} placeholder="Ex.: Maria Rodrigues" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Contato do Responsável
                  </label>
                  <Input {...register('guardian_contact')} placeholder="(98) 99123-4567" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Data de Nascimento
                  </label>
                  <Input type="date" {...register('birth_date')} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Situação da Matrícula
                  </label>
                  <select
                    {...register('status')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="active">Matrícula Ativa</option>
                    <option value="transferred">Transferido</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('lgpd_consent')}
                  className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600"
                />
                <span className="leading-relaxed">
                  <strong>Consentimento LGPD (Carômetro Visual):</strong> Autorização de imagem
                  registrada exclusivamente para identificação visual escolar interna (sem
                  biometria).
                </span>
              </label>

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
                  {editingItem ? 'Salvar Alterações' : 'Confirmar Matrícula'}
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
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center overflow-hidden text-blue-700 border border-slate-200 shrink-0">
                  {getPhotoUrl(viewingItem) ? (
                    <img
                      src={getPhotoUrl(viewingItem)!}
                      alt={viewingItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 truncate">
                    {viewingItem.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 tabular-nums">
                    Matrícula: {viewingItem.enrollment_number}
                  </p>
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
                <span className="text-slate-500">Turma Atual</span>
                <span className="font-semibold text-right">
                  {classMap.get(viewingItem.class_id) ??
                    viewingItem.class_name ??
                    viewingItem.class_id}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Situação</span>
                <Badge variant={statusBadgeVariant(viewingItem.status)}>
                  {statusLabel(viewingItem.status)}
                </Badge>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Responsável</span>
                <span className="font-medium">{viewingItem.guardian_name || 'Não informado'}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Contato</span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {viewingItem.guardian_contact || 'Não informado'}
                </span>
              </p>
              {viewingItem.birth_date && (
                <p className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Nascimento</span>
                  <span className="font-mono text-xs">{viewingItem.birth_date}</span>
                </p>
              )}
              <p className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70">
                <span className="text-slate-500 inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Consentimento LGPD
                </span>
                <Badge variant={viewingItem.lgpd_consent !== false ? 'success' : 'secondary'}>
                  {viewingItem.lgpd_consent !== false ? 'Autorizado' : 'Pendente'}
                </Badge>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {canManageStudents && (
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

      {/* Transfer Class Modal */}
      {transferTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900">
                  Transferir Aluno de Turma
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aluno: <strong className="text-slate-700">{transferTarget.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Selecione a Turma de Destino
              </label>
              <select
                value={transferClassId}
                onChange={(e) => setTransferClassId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.id === transferTarget.class_id ? ' (Turma atual)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransferTarget(null)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={transferring || !transferClassId || transferClassId === transferTarget.class_id}
                onClick={confirmTransfer}
                className="w-full sm:w-auto"
              >
                {transferring && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                <ArrowLeftRight className="h-4 w-4 mr-1.5" />
                Confirmar Transferência
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir Aluno"
        description="Tem certeza que deseja excluir o cadastro deste aluno? Esta ação não poderá ser desfeita."
        itemName={
          deleteTarget
            ? `${deleteTarget.name} (Matrícula: ${deleteTarget.enrollment_number})`
            : undefined
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
