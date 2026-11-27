'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredDemoUser, ROLE_LABELS } from '@/lib/client';
import type { Role } from '@/lib/role';
import type { PublicSystemUser, UserAccessStatus } from '@/lib/school-types';
import { generateReadablePassword } from '@/lib/password-utils';
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
  KeyRound,
  Plus,
  Search,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
  Clock,
  Link2,
  Users,
  X,
} from 'lucide-react';

const ALL_ROLES: Role[] = [
  'super_admin',
  'school_admin',
  'coordinator',
  'teacher',
  'student',
  'guardian',
  'treasury',
];

const userSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo'),
  email: z.string().trim().email('Informe um e-mail válido'),
  role: z.enum([
    'super_admin',
    'school_admin',
    'coordinator',
    'teacher',
    'student',
    'guardian',
    'treasury',
  ]),
  status: z.enum(['active', 'blocked']),
  password: z.string().optional().default(''),
});

type UserFormData = z.infer<typeof userSchema>;

export default function UsersManagementPage() {
  const [users, setUsers] = useState<PublicSystemUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [dbError, setDbError] = useState<DbErrorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [callerRole, setCallerRole] = useState<Role>('school_admin');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PublicSystemUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PublicSystemUser | null>(null);

  const isSuperAdmin = callerRole === 'super_admin';
  const selectableRoles = useMemo(
    () => (isSuperAdmin ? ALL_ROLES : ALL_ROLES.filter((r) => r !== 'super_admin')),
    [isSuperAdmin]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'teacher',
      status: 'active',
      password: '',
    },
  });

  async function loadUsers() {
    setLoadingList(true);
    setDbError(null);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data)) {
        setUsers(data);
      } else {
        setDbError({
          message: data?.message ?? 'Não foi possível carregar os usuários do banco de dados.',
          code: data?.code,
          hint: data?.hint,
        });
        setUsers([]);
      }
    } catch {
      setDbError({
        message: 'Falha de rede ao consultar usuários no banco de dados.',
        code: 'NETWORK_ERROR',
      });
      setUsers([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setCallerRole(demo.role);
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleLabel.toLowerCase().includes(q);
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus = !statusFilter || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const activeCount = users.filter((u) => u.status === 'active').length;
  const blockedCount = users.filter((u) => u.status === 'blocked').length;
  const academicCount = users.filter(
    (u) => u.role === 'teacher' || u.role === 'student'
  ).length;

  function canEditUser(target: PublicSystemUser) {
    if (isSuperAdmin) return true;
    return target.role !== 'super_admin';
  }

  function openCreateModal() {
    setEditingUser(null);
    setShowPassword(true);
    reset({
      name: '',
      email: '',
      role: 'teacher',
      status: 'active',
      password: '',
    });
    setFormOpen(true);
  }

  function openEditModal(target: PublicSystemUser) {
    setEditingUser(target);
    setShowPassword(false);
    reset({
      name: target.name,
      email: target.email,
      role: target.role,
      status: target.status,
      password: '',
    });
    setFormOpen(true);
  }

  function handleGeneratePassword() {
    const generated = generateReadablePassword();
    setValue('password', generated, { shouldValidate: true });
    setShowPassword(true);
    toast.info(`Senha sugerida preenchida: ${generated}`);
  }

  async function onSubmit(data: UserFormData) {
    const trimmedPassword = (data.password ?? '').trim();

    if (!editingUser && trimmedPassword.length < 6) {
      toast.error('Defina uma senha inicial com pelo menos 6 caracteres.');
      return;
    }
    if (editingUser && trimmedPassword.length > 0 && trimmedPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            ...(trimmedPassword ? { password: trimmedPassword } : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao atualizar usuário.');
          return;
        }
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? json : u)));
        toast.success(
          trimmedPassword
            ? 'Usuário e nova senha atualizados com sucesso!'
            : 'Usuário atualizado com sucesso!'
        );
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            password: trimmedPassword,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.message ?? 'Erro ao criar usuário.');
          return;
        }
        setUsers((prev) => [json, ...prev]);
        toast.success('Usuário criado! Ele já pode fazer login na plataforma.');
      }
      setFormOpen(false);
      setEditingUser(null);
    } catch {
      toast.error('Erro de conexão ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAccess(target: PublicSystemUser) {
    if (!canEditUser(target)) return;
    const nextStatus: UserAccessStatus = target.status === 'active' ? 'blocked' : 'active';
    setTogglingId(target.id);
    try {
      const res = await fetch(`/api/users/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? 'Não foi possível alterar o status de acesso.');
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === target.id ? json : u)));
      toast.success(
        nextStatus === 'active'
          ? `Acesso liberado para ${target.name}.`
          : `Acesso bloqueado para ${target.name}.`
      );
    } catch {
      toast.error('Erro de conexão ao atualizar status.');
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? 'Erro ao excluir usuário.');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success(`Conta de "${deleteTarget.name}" removida do sistema.`);
      setDeleteTarget(null);
    } catch {
      toast.error('Erro de conexão ao excluir usuário.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">Segurança & Controle de Acessos</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Usuários & Credenciais do Sistema
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Crie contas, altere senhas, gerencie perfis RBAC e libere ou bloqueie o acesso de
            qualquer usuário à plataforma.
          </p>
        </div>

        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Usuário
        </Button>
      </div>

      <DatabaseErrorBanner error={dbError} onRetry={loadUsers} loading={loadingList} />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Total de Contas
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {users.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Acessos Ativos
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Bloqueados
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-red-600 mt-1">
              {blockedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Professores & Alunos
            </p>
            <p className="font-numeric text-xl sm:text-2xl font-extrabold text-blue-600 mt-1">
              {academicCount}
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
              placeholder="Buscar usuário por nome, e-mail ou perfil..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-52"
            >
              <option value="">Todos os perfis</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-44"
            >
              <option value="">Todas as situações</option>
              <option value="active">Acesso Ativo</option>
              <option value="blocked">Bloqueados</option>
            </select>
            {(search || roleFilter || statusFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
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
          <p className="text-xs sm:text-sm font-semibold text-slate-700">
            Contas de Acesso Cadastradas
          </p>
          <span className="text-xs text-slate-500 tabular-nums">
            Exibindo {filteredUsers.length} de {users.length}
          </span>
        </div>

        <CardContent className="p-4 sm:p-6">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Carregando usuários do sistema...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
              <Users className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhum usuário encontrado</p>
              <p className="text-xs text-slate-500">
                Ajuste os filtros ou clique em &ldquo;Novo Usuário&rdquo; para criar uma conta.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const editable = canEditUser(u);
                const initials = u.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={u.id}
                    className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-colors ${
                      u.status === 'blocked'
                        ? 'border-red-200/80 bg-red-50/30'
                        : 'border-slate-200/80 bg-slate-50/60 hover:border-blue-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-heading font-bold text-xs mt-0.5 ${
                          u.status === 'blocked'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="font-heading font-bold text-sm sm:text-[15px] text-slate-900">
                            {u.name}
                          </h3>
                          <Badge variant="default">{u.roleLabel}</Badge>
                          <Badge variant={u.status === 'active' ? 'success' : 'destructive'}>
                            {u.status === 'active' ? 'Acesso Ativo' : 'Bloqueado'}
                          </Badge>
                          {u.linked_entity_type && (
                            <Badge variant="secondary" className="gap-1">
                              <Link2 className="h-3 w-3" />
                              {u.linked_entity_type === 'teacher'
                                ? 'Cadastro Professor'
                                : 'Cadastro Aluno'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] sm:text-xs text-slate-700">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {u.email}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {u.last_login_at
                              ? `Último login: ${new Date(u.last_login_at).toLocaleString('pt-BR')}`
                              : 'Nunca acessou'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {editable && (
                      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={togglingId === u.id}
                          onClick={() => handleToggleAccess(u)}
                          className={
                            u.status === 'active'
                              ? 'text-amber-700 border-amber-200 hover:bg-amber-50'
                              : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                          }
                          title={
                            u.status === 'active'
                              ? 'Bloquear acesso ao sistema'
                              : 'Liberar acesso ao sistema'
                          }
                        >
                          {togglingId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : u.status === 'active' ? (
                            <ShieldOff className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          )}
                          {u.status === 'active' ? 'Bloquear' : 'Liberar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(u)}
                          title="Editar dados e redefinir senha"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar / Senha
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(u)}
                          title="Excluir conta de acesso"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit User & Password Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-blue-600" />
                  {editingUser ? 'Editar Usuário & Senha' : 'Criar Novo Usuário de Acesso'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingUser
                    ? 'Atualize perfil, e-mail, permissão de entrada ou redefina a senha.'
                    : 'Defina e-mail, perfil RBAC e senha inicial para liberar login imediato.'}
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
                <Input {...register('name')} placeholder="Ex.: Prof. Ricardo Gomes" />
                {errors.name && (
                  <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  E-mail de Login *
                </label>
                <Input
                  type="email"
                  {...register('email')}
                  placeholder="usuario@jmbank.edu.br"
                  autoComplete="off"
                />
                {errors.email && (
                  <p className="text-xs font-medium text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Perfil de Acesso (RBAC) *
                  </label>
                  <select
                    {...register('role')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {selectableRoles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Status do Acesso
                  </label>
                  <select
                    {...register('status')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="active">Ativo (Login Liberado)</option>
                    <option value="blocked">Bloqueado (Login Impedido)</option>
                  </select>
                </div>
              </div>

              {/* Password Field */}
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                    {editingUser ? 'Redefinir Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Gerar senha
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder={
                      editingUser
                        ? 'Deixe em branco para manter a senha atual'
                        : 'Mínimo de 6 caracteres'
                    }
                    autoComplete="new-password"
                    className="bg-white pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-2.5 p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  A senha é gerenciada diretamente pelo Supabase Auth (requer{' '}
                  <code className="font-mono bg-white px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
                  configurada no servidor) e permite login imediato em{' '}
                  <code className="font-mono bg-white px-1 rounded">/login</code>.
                </p>
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
                  {editingUser ? 'Salvar Alterações' : 'Criar Conta de Acesso'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir Conta de Usuário"
        description="Esta conta perderá imediatamente o acesso ao sistema. Tem certeza que deseja excluir?"
        itemName={
          deleteTarget ? `${deleteTarget.name} (${deleteTarget.email})` : undefined
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}

