import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Login – JM Bank Escolar',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-50">
      {/* Left Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur font-heading font-extrabold text-xl tracking-tight">
            JM
          </div>
          <div>
            <span className="block font-heading font-extrabold text-lg leading-tight tracking-tight">
              JM Bank Escolar
            </span>
            <span className="block text-xs font-medium text-blue-100">
              Educação Financeira & Gamificação
            </span>
          </div>
        </div>

        <div className="space-y-6 max-w-lg">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-blue-50">
            <ShieldCheck className="h-4 w-4" /> Controle de Acesso RBAC & LGPD
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight">
            Transforme o engajamento escolar com moedas, missões e carômetro visual.
          </h1>
          <p className="text-blue-100 text-sm sm:text-[15px] leading-relaxed">
            Acesso dedicado para Super Administradores, Diretores, Coordenadores, Professores,
            Alunos, Responsáveis e Tesouraria em um ambiente único e seguro.
          </p>
        </div>

        <p className="text-xs text-blue-200">
          © {new Date().getFullYear()} JM Bank – Plataforma Educacional Gamificada.
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8 lg:p-12 min-w-0">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao início
            </Link>
            <span className="text-[11px] sm:text-xs text-slate-400">Ambiente de Demonstração</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Acesse sua conta
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-500">
                Entre com suas credenciais ou escolha um perfil de teste abaixo.
              </p>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
