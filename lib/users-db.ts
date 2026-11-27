import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import type { Role } from './role';
import type {
  PublicSystemUser,
  SystemUserRecord,
  UserAccessStatus,
} from './school-types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_DB_FILE = path.join(DATA_DIR, 'users.json');

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

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

export function toPublicUser(user: SystemUserRecord): PublicSystemUser {
  const { password_hash, ...safe } = user;
  return {
    ...safe,
    roleLabel: SERVER_ROLE_LABELS[user.role] ?? user.role,
    has_password: Boolean(password_hash),
  };
}

function buildDefaultUsers(): SystemUserRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@demo.com',
      name: 'Carlos Mendes (Super Admin)',
      role: 'super_admin',
      status: 'active',
      password_hash: hashPassword('Admin123!'),
      linked_entity_type: null,
      linked_entity_id: null,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'director@demo.com',
      name: 'Helena Costa (Diretora)',
      role: 'school_admin',
      status: 'active',
      password_hash: hashPassword('Director123!'),
      linked_entity_type: null,
      linked_entity_id: null,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'coordinator@demo.com',
      name: 'Marcos Souza (Coordenador)',
      role: 'coordinator',
      status: 'active',
      password_hash: hashPassword('Coord123!'),
      linked_entity_type: null,
      linked_entity_id: null,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      email: 'teacher@demo.com',
      name: 'Profª. Ana Paula',
      role: 'teacher',
      status: 'active',
      password_hash: hashPassword('Teach123!'),
      linked_entity_type: 'teacher',
      linked_entity_id: 'prof-1',
      last_login_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      email: 'student@demo.com',
      name: 'Lucas Oliveira',
      role: 'student',
      status: 'active',
      password_hash: hashPassword('Student123!'),
      linked_entity_type: 'student',
      linked_entity_id: 'stu-1',
      last_login_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      email: 'guardian@demo.com',
      name: 'Roberto Oliveira (Responsável)',
      role: 'guardian',
      status: 'active',
      password_hash: hashPassword('Guard123!'),
      linked_entity_type: null,
      linked_entity_id: null,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000007',
      email: 'treasury@demo.com',
      name: 'Fernanda Lima (Tesouraria)',
      role: 'treasury',
      status: 'active',
      password_hash: hashPassword('Treasury123!'),
      linked_entity_type: null,
      linked_entity_id: null,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

export async function readUsersDb(): Promise<SystemUserRecord[]> {
  try {
    const raw = await fs.readFile(USERS_DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as SystemUserRecord[];
    }
    const defaults = buildDefaultUsers();
    await writeUsersDb(defaults);
    return defaults;
  } catch {
    const defaults = buildDefaultUsers();
    await writeUsersDb(defaults);
    return defaults;
  }
}

export async function writeUsersDb(users: SystemUserRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_DB_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function syncSupabaseAuthUser(params: {
  existingUid?: string;
  email: string;
  password?: string;
  name: string;
  role: Role;
  status: UserAccessStatus;
}): Promise<string | undefined> {
  try {
    const admin = getSupabaseAdminClient();
    if (!admin) return params.existingUid;

    if (params.existingUid) {
      await admin.auth.admin.updateUserById(params.existingUid, {
        email: params.email,
        ...(params.password ? { password: params.password } : {}),
        ban_duration: params.status === 'blocked' ? '876000h' : 'none',
        user_metadata: { name: params.name, role: params.role },
      });
      return params.existingUid;
    }

    if (!params.password) return undefined;

    const { data, error } = await admin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: { name: params.name, role: params.role },
    });

    if (!error && data?.user?.id) {
      if (params.status === 'blocked') {
        await admin.auth.admin.updateUserById(data.user.id, {
          ban_duration: '876000h',
        });
      }
      return data.user.id;
    }
    return undefined;
  } catch {
    return params.existingUid;
  }
}

export async function deleteSupabaseAuthUser(uid?: string): Promise<void> {
  if (!uid) return;
  try {
    const admin = getSupabaseAdminClient();
    if (!admin) return;
    await admin.auth.admin.deleteUser(uid);
  } catch {
    // Best-effort sync
  }
}

/**
 * Create or update a linked login account for a Teacher or Student.
 * Validates email uniqueness and password policy.
 */
export async function upsertLinkedUserAccount(params: {
  entityType: 'teacher' | 'student';
  entityId: string;
  name: string;
  email?: string;
  password?: string;
  accessStatus?: UserAccessStatus;
}): Promise<{ user: SystemUserRecord | null; error?: string; status?: number }> {
  const users = await readUsersDb();
  const normalizedEmail = (params.email ?? '').trim().toLowerCase();
  const trimmedPassword = (params.password ?? '').trim();

  const existingIdx = users.findIndex(
    (u) =>
      u.linked_entity_type === params.entityType && u.linked_entity_id === params.entityId
  );

  // If no existing linked user and no password provided, nothing to create
  if (existingIdx === -1) {
    if (!trimmedPassword) {
      return { user: null };
    }
    if (!normalizedEmail) {
      return {
        user: null,
        error: 'Informe um e-mail de acesso para definir uma senha.',
        status: 400,
      };
    }
    if (trimmedPassword.length < 6) {
      return {
        user: null,
        error: 'A senha de acesso deve ter pelo menos 6 caracteres.',
        status: 400,
      };
    }

    const emailInUse = users.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (emailInUse) {
      return {
        user: null,
        error: `O e-mail "${normalizedEmail}" já está em uso por outro usuário do sistema.`,
        status: 409,
      };
    }

    const now = new Date().toISOString();
    const role: Role = params.entityType === 'teacher' ? 'teacher' : 'student';
    const userStatus: UserAccessStatus = params.accessStatus ?? 'active';

    const supabaseUid = await syncSupabaseAuthUser({
      email: normalizedEmail,
      password: trimmedPassword,
      name: params.name,
      role,
      status: userStatus,
    });

    const newUser: SystemUserRecord = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: normalizedEmail,
      name: params.name,
      role,
      status: userStatus,
      password_hash: hashPassword(trimmedPassword),
      supabase_uid: supabaseUid,
      linked_entity_type: params.entityType,
      linked_entity_id: params.entityId,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    };

    users.unshift(newUser);
    await writeUsersDb(users);
    return { user: newUser };
  }

  // Update existing linked user
  const current = users[existingIdx];
  const nextEmail = normalizedEmail || current.email;

  if (trimmedPassword && trimmedPassword.length < 6) {
    return {
      user: null,
      error: 'A nova senha deve ter pelo menos 6 caracteres.',
      status: 400,
    };
  }

  const emailInUse = users.some(
    (u, idx) => idx !== existingIdx && u.email.toLowerCase() === nextEmail.toLowerCase()
  );
  if (emailInUse) {
    return {
      user: null,
      error: `O e-mail "${nextEmail}" já está em uso por outro usuário do sistema.`,
      status: 409,
    };
  }

  const nextStatus: UserAccessStatus = params.accessStatus ?? current.status;
  const supabaseUid = await syncSupabaseAuthUser({
    existingUid: current.supabase_uid,
    email: nextEmail,
    password: trimmedPassword || undefined,
    name: params.name,
    role: current.role,
    status: nextStatus,
  });

  const updated: SystemUserRecord = {
    ...current,
    name: params.name,
    email: nextEmail,
    status: nextStatus,
    supabase_uid: supabaseUid,
    password_hash: trimmedPassword ? hashPassword(trimmedPassword) : current.password_hash,
    updated_at: new Date().toISOString(),
  };

  users[existingIdx] = updated;
  await writeUsersDb(users);
  return { user: updated };
}

export async function deleteLinkedUserAccount(
  entityType: 'teacher' | 'student',
  entityId: string
): Promise<void> {
  const users = await readUsersDb();
  const target = users.find(
    (u) => u.linked_entity_type === entityType && u.linked_entity_id === entityId
  );
  if (!target) return;

  await deleteSupabaseAuthUser(target.supabase_uid);
  const next = users.filter((u) => u.id !== target.id);
  await writeUsersDb(next);
}

