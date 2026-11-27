import type { Role } from './role';

export type EntityStatus = 'active' | 'inactive';
export type StudentStatus = 'active' | 'transferred' | 'inactive';
export type ClassShift = 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral';
export type UserAccessStatus = 'active' | 'blocked';
export type LinkedAccessState = 'active' | 'blocked' | 'none';

export interface SchoolRecord {
  id: string;
  name: string;
  code?: string;
  city?: string;
  academic_year: string;
  director_name?: string;
  status: EntityStatus;
  created_at: string;
}

export interface GradeLevelRecord {
  id: string;
  name: string;
  stage: string;
  order_index: number;
  description?: string;
  status: EntityStatus;
  created_at: string;
}

export interface ClassRecord {
  id: string;
  name: string;
  grade_level_id: string;
  school_id: string;
  shift: ClassShift;
  academic_year: string;
  room?: string;
  capacity?: number;
  status: EntityStatus;
  created_at: string;
}

export interface TeacherRecord {
  id: string;
  name: string;
  email?: string;
  subject: string;
  classes_linked: string;
  school_id?: string;
  phone?: string;
  status: EntityStatus;
  user_id?: string;
  has_access?: boolean;
  access_status?: LinkedAccessState;
  created_at: string;
}

export interface StudentRecord {
  id: string;
  name: string;
  email?: string;
  enrollment_number: string;
  class_id: string;
  class_name?: string;
  guardian_name?: string;
  guardian_contact?: string;
  birth_date?: string;
  status: StudentStatus;
  photo_path?: string | null;
  lgpd_consent?: boolean;
  user_id?: string;
  has_access?: boolean;
  access_status?: LinkedAccessState;
  created_at: string;
}

export interface SystemUserRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserAccessStatus;
  password_hash: string;
  supabase_uid?: string;
  linked_entity_type?: 'teacher' | 'student' | null;
  linked_entity_id?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicSystemUser = Omit<SystemUserRecord, 'password_hash'> & {
  roleLabel: string;
  has_password: boolean;
};

export interface SchoolStructureDb {
  schools: SchoolRecord[];
  gradeLevels: GradeLevelRecord[];
  classes: ClassRecord[];
  teachers: TeacherRecord[];
  students: StudentRecord[];
}
