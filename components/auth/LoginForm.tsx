'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { canAccessRoute, ROLE_LABELS, setStoredDemoUser } from '@/lib/client';
import type { Role } from '@/lib/role';
import type { DatabaseHealthReport } from '@/lib/db-health';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Loader2,
  KeyRound,
  Mail,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const schema = z.object({
  email: z.string().email({ message: 'Informe um e-mail válido' }),
  password: z.string().min(6, { message: 'A senha deve ter ao menos 6 caracteres' }),
});

type FormData = z.infer<typeof schema>;

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Real-time DB & Env health state
  const [health, setHealth] = useState<DatabaseHealthReport | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [showEnvDetails, setShowEnvDetails] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function verifyDatabaseConnection() {
    setCheckingHealth(true);
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const data = (await res.json()) as DatabaseHealthReport;
      setHealth(data);
      if (!data.ok) {
        setShowEnvDetails(true);
      }
    } catch (err: any) {
      setHealth({
        ok: false,
        checkedAt: new Date().toISOString(),
        environment: 'unknown',
        isProduction: true,
        latencyMs: 0,
        databaseHost: null,
        supabaseHost: null,
        envVars: [],
        warnings: [],
        tables: [],
        missingTables: [],
        errorCode: 'API_HEALTH_UNREACHABLE',
        errorMessage:
          'Não foi possível consultar a rota de diagnóstico do servidor (/api/health).',
        hint: err?.message ?? 'Verifique se o servidor Next.js está em execução e acessível.',
      });
      setShowEnvDetails(true);
    } finally {
      setCheckingHealth(false);
    }
  }

  useEffect(() => {
    verifyDatabaseConnection();
  }, []);

  const dbBlocked = checkingHealth || !health || !health.ok;

  async function onSubmit(data: FormData) {
    if (dbBlocked) {
      toast.error(
        health?.errorMessage ??
        'Login bloqueado: não há conexão válida com o banco de dados.'
      );
      return;
    }

    setLoading(true);
    const normalizedEmail = data.email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: data.password,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 503 || json?.code === 'DB_CONNECTION_ERROR') {
        if (json?.health) {
          setHealth(json.health);
          setShowEnvDetails(true);
        } else {
          await verifyDatabaseConnection();
        }
        toast.error(
          json?.message ?? 'Falha na conexão com o banco de dados. Login não autorizado.'
        );
        return;
      }

      if (res.ok && json?.user) {
        setStoredDemoUser({
          id: json.user.id,
          email: json.user.email,
          name: json.user.name,
          role: json.user.role,
          roleLabel: json.user.roleLabel,
        });
        toast.success(`Bem-vindo(a), ${json.user.name}!`);
        const params = new URLSearchParams(window.location.search);
        const rawNext = params.get('next');
        const safeNext =
          rawNext &&
            rawNext.startsWith('/') &&
            !rawNext.startsWith('//') &&
            canAccessRoute(json.user.role, rawNext)
            ? rawNext
            : json.user.dashboardPath ?? '/dashboard';
        router.push(safeNext);
        return;
      }

      toast.error(json?.message || 'E-mail ou senha incorretos no banco de dados.');
    } catch {
      toast.error('Erro de rede ao tentar autenticar. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  function handleFillEmail(email: string) {
    setValue('email', email, { shouldValidate: true });
  }

  return (
    <div className="space-y-5">
      {/* Database & Environment Validation Status Panel */}
      {checkingHealth ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center gap-2.5 text-xs text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
          <span>Validando variáveis de ambiente e conexão com o banco de dados...</span>
        </div>
      ) : health && !health.ok ? (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3 text-red-950"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-heading text-sm font-bold text-red-900">
                    Falha na Conexão com o Banco de Dados
                  </p>
                  {health.errorCode && (
                    <span className="font-mono text-[10px] font-semibold rounded bg-red-100 border border-red-200 px-1.5 py-0.5 text-red-800">
                      {health.errorCode}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-red-900 leading-relaxed break-words">
                  {health.errorMessage}
                </p>
                {health.hint && (
                  <p className="text-[11px] text-red-800 leading-relaxed break-words">
                    <strong>Motivo / Ação:</strong> {health.hint}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Environment Variables Checklist */}
          {health.envVars.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-white/90 p-3 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Validação das Variáveis de Ambiente ({health.environment})
              </p>
              <ul className="space-y-1.5">
                {health.envVars.map((envItem) => (
                  <li key={envItem.name} className="text-xs flex items-start gap-2">
                    {envItem.valid ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : envItem.required ? (
                      <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-slate-900 break-all">
                        {envItem.name}
                      </span>{' '}
                      <span
                        className={`text-[11px] font-semibold ${envItem.valid
                            ? 'text-emerald-700'
                            : envItem.required
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                      >
                        {envItem.valid
                          ? '— OK'
                          : envItem.configured
                            ? '— Inválida'
                            : envItem.required
                              ? '— Ausente (Obrigatória)'
                              : '— Ausente (Opcional/Admin)'}
                      </span>
                      {envItem.issue && (
                        <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                          {envItem.issue}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Tables Warning */}
          {health.missingTables.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-white/90 p-2.5 text-xs">
              <p className="font-semibold text-red-800 mb-1">
                Tabelas não encontradas no PostgreSQL:
              </p>
              <div className="flex flex-wrap gap-1">
                {health.missingTables.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[11px] rounded bg-red-100 px-1.5 py-0.5 text-red-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <p className="text-[11px] font-semibold text-red-800 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Login bloqueado até a conexão ser restabelecida.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={verifyDatabaseConnection}
              className="border-red-300 bg-white text-red-800 hover:bg-red-100 w-full sm:w-auto"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Testar Novamente
            </Button>
          </div>
        </div>
      ) : health && health.ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="h-4 w-4 text-emerald-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-900 truncate">
                  Banco de dados conectado ({health.latencyMs}ms)
                </p>
                {(health.databaseHost || health.supabaseHost) && (
                  <p className="font-mono text-[11px] text-emerald-700/90 truncate">
                    {health.databaseHost || health.supabaseHost} · {health.environment}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowEnvDetails((v) => !v)}
                className="rounded px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
              >
                {showEnvDetails ? 'Ocultar' : 'Detalhes'}
              </button>
              <button
                type="button"
                onClick={verifyDatabaseConnection}
                title="Revalidar conexão"
                className="rounded p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {showEnvDetails && (
            <div className="rounded-lg border border-emerald-200/80 bg-white p-2.5 space-y-1.5 text-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Variáveis de Ambiente
              </p>
              {health.envVars.map((envItem) => (
                <div key={envItem.name} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono text-slate-700 truncate">{envItem.name}</span>
                  <span
                    className={`font-semibold shrink-0 ${envItem.valid ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                  >
                    {envItem.valid ? '✓ OK' : '⚠ Ausente'}
                  </span>
                </div>
              ))}
              {health.warnings.length > 0 && (
                <div className="pt-1.5 border-t border-slate-100 space-y-1">
                  {health.warnings.map((w, idx) => (
                    <p key={idx} className="text-[11px] text-amber-800 leading-snug">
                      ⚠ {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            E-mail institucional
          </label>
          <Input
            {...register('email')}
            disabled={dbBlocked || loading}
            placeholder="seu.email@escola.edu.br"
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs font-medium text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-slate-500" />
            Senha
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              disabled={dbBlocked || loading}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              disabled={dbBlocked}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-2.5 p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-40"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs font-medium text-red-600">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" disabled={dbBlocked || loading} className="w-full h-11">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          {dbBlocked && !checkingHealth
            ? 'Login Indisponível (Erro no Banco)'
            : 'Entrar na Plataforma'}
        </Button>
      </form>

      {/* Real Database Users List — ONLY visible in local development AND only with real rows from Supabase */}
      {health && health.ok && !health.isProduction && (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Usuários no Banco (Desenvolvimento)
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {health.devUsers?.length ?? 0} encontrado(s)
            </span>
          </div>

          {health.devUsers && health.devUsers.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {health.devUsers.map((acc) => {
                const roleLabel =
                  ROLE_LABELS[acc.role as Role] ?? acc.role;
                return (
                  <div
                    key={acc.email}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 sm:px-3 sm:py-2 text-xs hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs truncate">
                        {acc.name} · <span className="text-blue-700">{roleLabel}</span>
                      </p>
                      <p className="text-slate-600 font-mono text-[11px] truncate mt-0.5">
                        {acc.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleFillEmail(acc.email)}
                      className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors self-end sm:self-auto shrink-0"
                    >
                      Usar e-mail
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900 space-y-1.5 leading-relaxed">
              <p className="font-semibold">
                Nenhum usuário encontrado na tabela <code className="font-mono">users</code>.
              </p>
              <p>
                Execute <code className="font-mono">npm run db:seed</code> (ou{' '}
                <code className="font-mono">node prisma/seed.mjs</code>) para criar os 7 usuários
                iniciais no PostgreSQL via Prisma.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
