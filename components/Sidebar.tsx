'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Home,
  School,
  GraduationCap,
  Users,
  UserCheck,
  Wallet,
  Flag,
  Gift,
  Camera,
  LogIn,
  LogOut,
  ShieldCheck,
  BookOpen,
  UserCircle,
  HeartHandshake,
  Landmark,
  Menu,
  X,
  KeyRound,
} from 'lucide-react';
import {
  getStoredDemoUser,
  setStoredDemoUser,
  canAccessRoute,
  type DemoUser,
} from '@/lib/client';
import type { Role } from '@/lib/role';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  roles?: Role[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { href: '/', label: 'Início', icon: Home },
      {
        href: '/carometro',
        label: 'Carômetro Visual',
        icon: Camera,
        roles: ['super_admin', 'school_admin', 'coordinator', 'teacher'],
      },
    ],
  },
  {
    title: 'Meu Painel',
    items: [
      {
        href: '/dashboard/admin',
        label: 'Painel Administrativo',
        icon: ShieldCheck,
        roles: ['super_admin', 'school_admin'],
      },
      {
        href: '/dashboard/teacher',
        label: 'Painel Pedagógico',
        icon: BookOpen,
        roles: ['coordinator', 'teacher'],
      },
      {
        href: '/dashboard/student',
        label: 'Painel do Aluno',
        icon: UserCircle,
        roles: ['student'],
      },
      {
        href: '/dashboard/guardian',
        label: 'Painel do Responsável',
        icon: HeartHandshake,
        roles: ['guardian'],
      },
      {
        href: '/dashboard/treasury',
        label: 'Painel da Tesouraria',
        icon: Landmark,
        roles: ['treasury'],
      },
    ],
  },
  {
    title: 'Estrutura Escolar',
    items: [
      {
        href: '/schools',
        label: 'Escolas',
        icon: School,
        roles: ['super_admin', 'school_admin'],
      },
      {
        href: '/grade-levels',
        label: 'Séries / Anos',
        icon: GraduationCap,
        roles: ['super_admin', 'school_admin'],
      },
      {
        href: '/classes',
        label: 'Turmas',
        icon: Users,
        roles: ['super_admin', 'school_admin', 'coordinator'],
      },
      {
        href: '/teachers',
        label: 'Professores',
        icon: UserCheck,
        roles: ['super_admin', 'school_admin'],
      },
      {
        href: '/students',
        label: 'Alunos',
        icon: Users,
        roles: ['super_admin', 'school_admin', 'coordinator', 'teacher'],
      },
      {
        href: '/users',
        label: 'Usuários & Acessos',
        icon: KeyRound,
        roles: ['super_admin', 'school_admin'],
      },
    ],
  },
  {
    title: 'Banco & Gamificação',
    items: [
      {
        href: '/wallets',
        label: 'Carteira Digital',
        icon: Wallet,
        roles: ['super_admin', 'school_admin', 'teacher', 'student', 'guardian', 'treasury'],
      },
      {
        href: '/missions',
        label: 'Missões & Desafios',
        icon: Flag,
        roles: ['super_admin', 'school_admin', 'coordinator', 'teacher', 'student', 'guardian'],
      },
      {
        href: '/rewards',
        label: 'Loja de Recompensas',
        icon: Gift,
        roles: ['super_admin', 'school_admin', 'coordinator', 'student', 'treasury'],
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // RoleGuard performs the single authoritative /api/auth/me check and dispatches jmbank-auth-change
    const syncUser = () => {
      setCurrentUser(getStoredDemoUser());
    };

    syncUser();
    window.addEventListener('jmbank-auth-change', syncUser);
    return () => window.removeEventListener('jmbank-auth-change', syncUser);
  }, [pathname]);

  // Close mobile drawer when pathname changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    setStoredDemoUser(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setMobileOpen(false);
    router.push('/login');
  };

  const userRole = currentUser?.role ?? null;

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!userRole) return false;
        if (item.roles && !item.roles.includes(userRole)) return false;
        return canAccessRoute(userRole, item.href);
      }),
    }))
    .filter((section) => section.items.length > 0);

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full">
      <div className="p-4 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 py-1">
          <Link
            href="/"
            prefetch={false}
            onClick={() => isMobile && setMobileOpen(false)}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-heading font-extrabold text-base tracking-tight shadow-sm">
              JM
            </div>
            <div>
              <span className="block font-heading font-extrabold text-slate-900 text-[15px] leading-tight tracking-tight">
                JM Bank
              </span>
              <span className="block text-[11px] font-medium text-slate-500 mt-0.5">
                Banco Digital Escolar
              </span>
            </div>
          </Link>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Role-Filtered Navigation Sections */}
        {currentUser ? (
          <nav className="space-y-5">
            {visibleSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => isMobile && setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] leading-snug font-medium transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-blue-600' : 'text-slate-400'
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Sessão não iniciada</p>
            <p>Faça login para visualizar os menus autorizados para o seu perfil.</p>
          </div>
        )}
      </div>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/60">
        {currentUser ? (
          <div className="space-y-3">
            <div className="px-1">
              <p className="text-[13px] font-semibold text-slate-900 truncate leading-snug">
                {currentUser.name}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">{currentUser.email}</p>
              <span className="mt-1.5 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                {currentUser.roleLabel}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Trocar Conta / Sair
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            prefetch={false}
            onClick={() => isMobile && setMobileOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-blue-700 shadow-sm"
          >
            <LogIn className="h-4 w-4" />
            Entrar na Conta
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navigation Bar (visible only below lg breakpoint) */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200 px-3 sm:px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu de navegação"
            className="p-2 -ml-1 rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-heading font-extrabold text-xs tracking-tight shadow-xs">
              JM
            </div>
            <span className="font-heading font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
              JM Bank
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700 truncate max-w-[130px]">
                {currentUser.roleLabel}
              </span>
              <button
                onClick={() => setMobileOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 cursor-pointer"
                title={currentUser.name}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <LogIn className="h-3.5 w-3.5" />
              Entrar
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Overlay & Slide-in Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <aside className="relative w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between overflow-y-auto z-50">
            {renderNavContent(true)}
          </aside>
        </div>
      )}

      {/* Desktop Persistent Sidebar (visible on lg and above) */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-200 bg-white flex-col justify-between sticky top-0 h-screen overflow-y-auto">
        {renderNavContent(false)}
      </aside>
    </>
  );
}
