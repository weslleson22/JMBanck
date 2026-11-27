import { prisma } from './prisma';
import { getSessionFromCookies } from './auth-session';

export type Role =
  | 'super_admin'
  | 'school_admin'
  | 'coordinator'
  | 'teacher'
  | 'student'
  | 'guardian'
  | 'treasury';

export const VALID_ROLES: Role[] = [
  'super_admin',
  'school_admin',
  'coordinator',
  'teacher',
  'student',
  'guardian',
  'treasury',
];

export const SERVER_ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Administrador',
  school_admin: 'Diretor / Admin Escolar',
  coordinator: 'Coordenador Pedagógico',
  teacher: 'Professor',
  student: 'Aluno',
  guardian: 'Responsável',
  treasury: 'Operador / Tesouraria',
};

export const SERVER_ROLE_HOME_PATH: Record<Role, string> = {
  super_admin: '/dashboard/admin',
  school_admin: '/dashboard/admin',
  coordinator: '/dashboard/teacher',
  teacher: '/dashboard/teacher',
  student: '/dashboard/student',
  guardian: '/dashboard/guardian',
  treasury: '/dashboard/treasury',
};

/** Permissions map – each role lists the actions it can perform. */
export const rolePermissions: Record<Role, string[]> = {
  super_admin: [
    'manage_schools',
    'manage_school',
    'manage_admins',
    'manage_users',
    'global_rules',
    'view_indicators',
    'system_config',
    'manage_academic_years',
    'manage_grade_levels',
    'manage_classes',
    'manage_teachers',
    'manage_students',
    'link_teacher_class',
    'view_wallets',
    'view_movements',
    'create_campaigns',
    'view_reports',
    'manage_rewards',
    'manage_shifts',
    'manage_subjects',
    'enroll_student',
    'transfer_student',
    'view_enrollment_history',
    'view_carometro',
    'manage_student_photos',
    'view_teacher_dashboard',
    'view_treasury_dashboard',
    'view_student_dashboard',
    'view_guardian_dashboard',
    'grant_coins',
    'create_activities',
    'create_pedagogical_challenges',
    'manage_rewards_catalog',
  ],
  school_admin: [
    'manage_school',
    'manage_schools',
    'manage_users',
    'manage_grade_levels',
    'manage_classes',
    'manage_teachers',
    'manage_students',
    'link_teacher_class',
    'view_wallets',
    'view_movements',
    'create_campaigns',
    'view_reports',
    'manage_rewards',
    'manage_rewards_catalog',
    'manage_academic_years',
    'manage_shifts',
    'manage_subjects',
    'enroll_student',
    'transfer_student',
    'view_enrollment_history',
    'view_carometro',
    'manage_student_photos',
    'view_teacher_dashboard',
    'view_treasury_dashboard',
    'view_student_dashboard',
    'view_guardian_dashboard',
    'grant_coins',
    'create_activities',
    'create_pedagogical_challenges',
  ],
  coordinator: [
    'view_assigned_classes',
    'view_students',
    'view_carometro',
    'create_pedagogical_challenges',
    'track_performance',
    'view_reports',
    'track_activities_rewards',
    'view_teacher_dashboard',
  ],
  teacher: [
    'view_my_classes',
    'view_students',
    'view_carometro',
    'grant_coins',
    'create_activities',
    'track_participation',
    'view_coin_history',
    'view_class_ranking',
    'record_observations',
    'manage_student_photos',
    'view_teacher_dashboard',
    'view_treasury_dashboard',
  ],
  student: [
    'view_wallet',
    'view_balance',
    'view_statement',
    'view_missions',
    'participate_challenges',
    'view_achievements',
    'view_allowed_ranking',
    'view_rewards_catalog',
    'request_reward_redemption',
    'edit_profile',
    'view_student_dashboard',
  ],
  guardian: [
    'view_linked_students',
    'view_balance',
    'track_achievements',
    'view_history',
    'track_participation',
    'view_student_progress',
    'view_guardian_dashboard',
  ],
  treasury: [
    'manage_rewards_catalog',
    'manage_rewards',
    'control_stock',
    'approve_redemptions',
    'record_deliveries',
    'view_movements',
    'view_wallets',
    'generate_redemption_reports',
    'view_treasury_dashboard',
  ],
};

export interface AuthenticatedDbUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  school_id: string | null;
}

/**
 * Loads and validates the current authenticated user from the signed session cookie
 * AND verifies live status/role in PostgreSQL via Prisma.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedDbUser | null> {
  const session = await getSessionFromCookies();
  if (!session?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      school_id: true,
    },
  });

  if (!user) return null;
  if (user.status === 'blocked' || user.status === 'inactive') {
    throw new Error('Account blocked');
  }

  const role: Role = VALID_ROLES.includes(user.role as Role) ? (user.role as Role) : 'student';
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    status: user.status,
    school_id: user.school_id,
  };
}

/**
 * Verify that the current authenticated Prisma user has at least one required permission.
 */
export async function authorize(requiredPermissions: string[]): Promise<{
  user: AuthenticatedDbUser;
  role: Role;
}> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Unauthenticated');
  }

  if (user.role === 'super_admin' || requiredPermissions.length === 0) {
    return { user, role: user.role };
  }

  const allowed = rolePermissions[user.role] ?? [];
  const has = requiredPermissions.some((p) => allowed.includes(p));
  if (!has) {
    throw new Error('Permission denied');
  }

  return { user, role: user.role };
}
