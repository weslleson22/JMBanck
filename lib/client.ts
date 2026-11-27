import type { Role } from './role';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  roleLabel: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Administrador',
  school_admin: 'Diretor / Admin Escolar',
  coordinator: 'Coordenador Pedagógico',
  teacher: 'Professor',
  student: 'Aluno',
  guardian: 'Responsável',
  treasury: 'Operador / Tesouraria',
};

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
    '/users',
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
    '/users',
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

const SESSION_STORAGE_KEY = 'jmbank_session_user';

export function getStoredDemoUser(): DemoUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

export function setStoredDemoUser(user: DemoUser | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  }
  window.dispatchEvent(new Event('jmbank-auth-change'));
}
