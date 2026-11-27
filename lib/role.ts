import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './env';

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

/** Verify that the current Supabase Auth user has at least one of the required permissions. */
export async function authorize(
  supabase: any,
  requiredPermissions: string[],
): Promise<Role> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthenticated');
  }

  let role: Role | null = null;

  // Prefer service role client for reading `users` table if configured so RLS never hides own role
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  const lookupClient =
    url && serviceKey
      ? createSupabaseAdmin(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

  const { data: profileByUid } = await lookupClient
    .from('users')
    .select('role, status')
    .eq('auth_uid', user.id)
    .maybeSingle();

  let profile = profileByUid;
  if (!profile && user.email) {
    const { data: profileByEmail } = await lookupClient
      .from('users')
      .select('role, status')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();
    profile = profileByEmail;
  }

  if (profile?.status === 'blocked' || profile?.status === 'inactive') {
    throw new Error('Account blocked');
  }

  if (profile?.role) {
    role = profile.role as Role;
  } else if (user.user_metadata?.role) {
    role = user.user_metadata.role as Role;
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
