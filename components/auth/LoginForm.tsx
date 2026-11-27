'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { supabaseClient, DEMO_USERS, setStoredDemoUser } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, KeyRound, Mail, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const schema = z.object({
  email: z.string().email({ message: 'Informe um e-mail válido' }),
  password: z.string().min(6, { message: 'A senha deve ter ao menos 6 caracteres' }),
});

type FormData = z.infer<typeof schema>;

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  async function onSubmit(data: FormData) {
    setLoading(true);
    const normalizedEmail = data.email.trim().toLowerCase();
    const demoAccount = DEMO_USERS[normalizedEmail];

    try {
      const supabase = supabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: data.password,
      });

      if (!error) {
        if (demoAccount) {
          setStoredDemoUser(demoAccount);
        } else {
          setStoredDemoUser({
            id: 'auth-user',
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0],
            role: 'super_admin',
            roleLabel: 'Usuário Autenticado',
          });
        }
        toast.success('Login realizado com sucesso!');
        router.push(demoAccount?.dashboardPath ?? '/dashboard');
        return;
      }

      // If demo credentials match, allow instant demo session even if Supabase user isn't seeded yet
      if (demoAccount && data.password === demoAccount.password) {
        setStoredDemoUser(demoAccount);
        toast.success(`Acesso liberado como ${demoAccount.roleLabel}!`);
        router.push(demoAccount.dashboardPath);
        return;
      }

      toast.error(error.message || 'Credenciais inválidas');
    } catch {
      if (demoAccount && data.password === demoAccount.password) {
        setStoredDemoUser(demoAccount);
        toast.success(`Acesso liberado como ${demoAccount.roleLabel}!`);
        router.push(demoAccount.dashboardPath);
        return;
      }
      toast.error('Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickFill(email: string) {
    const acc = DEMO_USERS[email];
    if (!acc) return;
    setValue('email', acc.email, { shouldValidate: true });
    setValue('password', acc.password, { shouldValidate: true });
  }

  function handleInstantDemoLogin(email: string) {
    const acc = DEMO_USERS[email];
    if (!acc) return;
    setStoredDemoUser(acc);
    toast.success(`Conectado como ${acc.name}`);
    router.push(acc.dashboardPath);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            E-mail institucional
          </label>
          <Input {...register('email')} placeholder="exemplo@demo.com" autoComplete="email" />
          {errors.email && <p className="text-xs font-medium text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-slate-500" />
            Senha
          </label>
          <Input
            type="password"
            {...register('password')}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {errors.password && <p className="text-xs font-medium text-red-600">{errors.password.message}</p>}
        </div>

        <Button type="submit" disabled={loading} className="w-full h-11">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Entrar na Plataforma
        </Button>
      </form>

      {/* Quick Demo Accounts Selector */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Contas de Teste (Acesso Rápido)
          </span>
          <span className="text-[11px] font-medium text-slate-500">Clique para entrar</span>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
          {Object.values(DEMO_USERS).map((acc) => (
            <div
              key={acc.email}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 sm:px-3 sm:py-2 text-xs hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-xs truncate">{acc.roleLabel}</p>
                <p className="text-slate-600 font-mono text-[11px] truncate mt-0.5">
                  {acc.email} · <span className="text-slate-500">{acc.password}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleQuickFill(acc.email)}
                  className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Preencher
                </button>
                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin(acc.email)}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  Entrar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
