import { createBrowserClient } from '@supabase/ssr';
import type { Role } from './role';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  roleLabel: string;
}

export const ROLE_HOME_PATH: Record<Role, string> = {
  super_admin: '/dashboard/admin',
  school_admin: '/dashboard/admin',
  coordinator: '/dashboard/teacher',
  teacher: '/dashboard/teacher',
  student: '/dashboard/student',
  guardian: '/dashboard/guardian',
  treasury: '/dashboard/treasury',
};

/**
 * Exact routes allowed for each role.
 */
export const ROLE_ALLOWED_ROUTES: Record<Role, string[]> = {
  super_admin: [
    '/',
    '/dashboard',
    '/dashboard/admin',
    '/dashboard/teacher',
    '/dashboard/student',
    '/dashboard/guardian',
    '/dashboard/treasury',
    '/carometro',
    '/schools',
    '/grade-levels',
    '/classes',
    '/teachers',
    '/students',
    '/wallets',
    '/missions',
    '/rewards',
  ],
  school_admin: [
    '/',
    '/dashboard',
    '/dashboard/admin',
    '/carometro',
    '/schools',
    '/grade-levels',
    '/classes',
    '/teachers',
    '/students',
    '/wallets',
    '/missions',
    '/rewards',
  ],
  coordinator: [
    '/',
    '/dashboard',
    '/dashboard/teacher',
    '/carometro',
    '/classes',
    '/students',
    '/missions',
    '/rewards',
  ],
  teacher: [
    '/',
    '/dashboard',
    '/dashboard/teacher',
    '/carometro',
    '/students',
    '/wallets',
    '/missions',
  ],
  student: [
    '/',
    '/dashboard',
    '/dashboard/student',
    '/wallets',
    '/missions',
    '/rewards',
  ],
  guardian: [
    '/',
    '/dashboard',
    '/dashboard/guardian',
    '/wallets',
    '/missions',
  ],
  treasury: [
    '/',
    '/dashboard',
    '/dashboard/treasury',
    '/rewards',
    '/wallets',
  ],
};

export function canAccessRoute(role: Role | null | undefined, pathname: string): boolean {
  if (pathname === '/login') return true;
  if (!role) return false;
  const allowed = ROLE_ALLOWED_ROUTES[role] ?? [];
  return allowed.includes(pathname);
}

export const DEMO_USERS: Record<string, DemoUser & { password: string; dashboardPath: string }> = {
  'admin@demo.com': {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@demo.com',
    password: 'Admin123!',
    name: 'Carlos Mendes (Super Admin)',
    role: 'super_admin',
    roleLabel: 'Super Administrador',
    dashboardPath: '/dashboard/admin',
  },
  'director@demo.com': {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'director@demo.com',
    password: 'Director123!',
    name: 'Helena Costa (Diretora)',
    role: 'school_admin',
    roleLabel: 'Diretor / Admin Escolar',
    dashboardPath: '/dashboard/admin',
  },
  'coordinator@demo.com': {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'coordinator@demo.com',
    password: 'Coord123!',
    name: 'Marcos Souza (Coordenador)',
    role: 'coordinator',
    roleLabel: 'Coordenador Pedagógico',
    dashboardPath: '/dashboard/teacher',
  },
  'teacher@demo.com': {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'teacher@demo.com',
    password: 'Teach123!',
    name: 'Profª. Ana Paula',
    role: 'teacher',
    roleLabel: 'Professor',
    dashboardPath: '/dashboard/teacher',
  },
  'student@demo.com': {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'student@demo.com',
    password: 'Student123!',
    name: 'Lucas Oliveira (9º Ano A)',
    role: 'student',
    roleLabel: 'Aluno',
    dashboardPath: '/dashboard/student',
  },
  'guardian@demo.com': {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'guardian@demo.com',
    password: 'Guard123!',
    name: 'Roberto Oliveira (Responsável)',
    role: 'guardian',
    roleLabel: 'Responsável',
    dashboardPath: '/dashboard/guardian',
  },
  'treasury@demo.com': {
    id: '00000000-0000-0000-0000-000000000007',
    email: 'treasury@demo.com',
    password: 'Treasury123!',
    name: 'Fernanda Lima (Tesouraria)',
    role: 'treasury',
    roleLabel: 'Operador / Tesouraria',
    dashboardPath: '/dashboard/treasury',
  },
};

const DEMO_STORAGE_KEY = 'jmbank_session_user';

export function getStoredDemoUser(): DemoUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

export function setStoredDemoUser(user: DemoUser | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    document.cookie = 'jmbank_role=; path=/; max-age=0';
    document.cookie = 'jmbank_email=; path=/; max-age=0';
  } else {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(user));
    document.cookie = `jmbank_role=${user.role}; path=/; max-age=86400`;
    document.cookie = `jmbank_email=${encodeURIComponent(user.email)}; path=/; max-age=86400`;
  }
  window.dispatchEvent(new Event('jmbank-auth-change'));
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export const supabaseClient = createClient;
