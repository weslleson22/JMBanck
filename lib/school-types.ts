export type EntityStatus = 'active' | 'inactive';
export type StudentStatus = 'active' | 'transferred' | 'inactive';
export type ClassShift = 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral';

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
  created_at: string;
}

export interface StudentRecord {
  id: string;
  name: string;
  enrollment_number: string;
  class_id: string;
  class_name?: string;
  guardian_name?: string;
  guardian_contact?: string;
  birth_date?: string;
  status: StudentStatus;
  photo_path?: string | null;
  lgpd_consent?: boolean;
  created_at: string;
}

export interface SchoolStructureDb {
  schools: SchoolRecord[];
  gradeLevels: GradeLevelRecord[];
  classes: ClassRecord[];
  teachers: TeacherRecord[];
  students: StudentRecord[];
}

