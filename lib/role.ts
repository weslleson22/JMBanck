import { cookies } from 'next/headers';

export type Role =
  | 'super_admin'
  | 'school_admin'
  | 'coordinator'
  | 'teacher'
  | 'student'
  | 'guardian'
  | 'treasury';

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
  ],
  school_admin: [
    'manage_school',
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
    'generate_redemption_reports',
    'view_treasury_dashboard',
  ],
};

/** Verify that the current user has at least one of the required permissions. */
export async function authorize(
  supabase: any,
  requiredPermissions: string[],
): Promise<Role> {
  const { data: { user } } = await supabase.auth.getUser();

  let role: Role | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_uid', user.id)
      .single();
    if (profile?.role) {
      role = profile.role as Role;
    } else if (user.user_metadata?.role) {
      role = user.user_metadata.role as Role;
    }
  }

  // Fallback to demo cookie session if present
  if (!role) {
    try {
      const cookieStore = await cookies();
      const demoRole = cookieStore.get('jmbank_role')?.value as Role | undefined;
      if (demoRole && rolePermissions[demoRole]) {
        role = demoRole;
      }
    } catch {
      // ignore if cookies() not available
    }
  }

  if (!role) {
    throw new Error('Unauthenticated');
  }

  if (role === 'super_admin') {
    return role;
  }

  const allowed = rolePermissions[role] ?? [];
  const has = requiredPermissions.some((p) => allowed.includes(p));
  if (!has) throw new Error('Permission denied');
  return role;
}
