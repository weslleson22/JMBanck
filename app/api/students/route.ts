import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
} from '@/lib/supabase-data';

const createStudentSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo do aluno'),
  email: z.string().trim().email('Informe um e-mail de acesso válido').or(z.literal('')).optional().default(''),
  enrollment_number: z.string().trim().min(1, 'Informe o número da matrícula'),
  class_id: z.string().trim().min(1, 'Selecione a turma'),
  guardian_name: z.string().trim().optional().default(''),
  guardian_contact: z.string().trim().optional().default(''),
  birth_date: z.string().trim().optional().default(''),
  status: z.enum(['active', 'transferred', 'inactive']).optional().default('active'),
  lgpd_consent: z.boolean().optional().default(true),
  password: z.string().optional().default(''),
  access_status: z.enum(['active', 'blocked']).optional().default('active'),
});

export async function GET() {
  try {
    const { db } = await getServerDbContext();
    const [
      { data: students, error: sErr },
      { data: users, error: uErr },
      { data: classes, error: cErr },
    ] = await Promise.all([
      db.from('students').select('*'),
      db.from('users').select('*'),
      db.from('classes').select('id, name'),
    ]);

    if (sErr) return dbErrorResponse(sErr, 'alunos (students)');

    const userMap = new Map<string, any>();
    if (!uErr && Array.isArray(users)) {
      for (const u of users) {
        userMap.set(u.id, u);
        if (u.auth_uid) userMap.set(u.auth_uid, u);
      }
    }

    const classMap = new Map<string, string>();
    if (!cErr && Array.isArray(classes)) {
      for (const c of classes) {
        classMap.set(c.id, c.name);
      }
    }

    const enriched = (students ?? []).map((s: any) => {
      const linkedUser = s.user_id ? userMap.get(s.user_id) : null;
      const hasAccess = Boolean(linkedUser?.auth_uid);
      const isBlocked = linkedUser?.status === 'blocked' || linkedUser?.status === 'inactive';
      return {
        id: s.id,
        user_id: s.user_id ?? undefined,
        name: s.name ?? linkedUser?.name ?? `Aluno #${s.enrollment_number}`,
        email: linkedUser?.email ?? s.email ?? undefined,
        enrollment_number: s.enrollment_number ?? '',
        class_id: s.class_id ?? '',
        class_name: classMap.get(s.class_id) ?? s.class_name ?? s.class_id ?? 'Sem turma',
        guardian_name: s.guardian_name ?? undefined,
        guardian_contact: s.guardian_contact ?? undefined,
        birth_date: s.birth_date ?? undefined,
        status:
          s.status === 'transferred' || s.status === 'inactive' ? s.status : 'active',
        photo_path: s.photo_path ?? null,
        lgpd_consent: s.lgpd_consent ?? true,
        has_access: hasAccess,
        access_status: !hasAccess ? 'none' : isBlocked ? 'blocked' : 'active',
        created_at: s.created_at ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(enriched);
  } catch (e: any) {
    return dbErrorResponse(e, 'alunos (students)');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, adminClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_students', 'enroll_student']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para matricular alunos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const email = parsed.data.email?.trim().toLowerCase() || '';
    const password = parsed.data.password?.trim() || '';

    if (password && !email) {
      return NextResponse.json(
        { message: 'Informe um e-mail de login para definir a senha do aluno.' },
        { status: 400 }
      );
    }
    if (password && password.length < 6) {
      return NextResponse.json(
        { message: 'A senha de acesso deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    let authUid: string | null = null;
    if (password) {
      if (!adminClient) {
        return NextResponse.json(
          {
            message:
              'A variável SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor. Configure-a para criar contas de aluno com senha no Supabase Auth.',
            code: 'MISSING_SERVICE_ROLE_KEY',
          },
          { status: 400 }
        );
      }

      const { data: createdAuth, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: parsed.data.name, role: 'student' },
      });

      if (authErr || !createdAuth?.user) {
        return NextResponse.json(
          { message: authErr?.message ?? 'Erro ao criar login do aluno no Supabase Auth.' },
          { status: 400 }
        );
      }
      authUid = createdAuth.user.id;
      if (parsed.data.access_status === 'blocked') {
        await adminClient.auth.admin.updateUserById(authUid, { ban_duration: '876000h' });
      }
    }

    const { data: matchedClass } = await db
      .from('classes')
      .select('id, name, school_id')
      .eq('id', parsed.data.class_id)
      .maybeSingle();

    let userId: string | undefined;
    if (email || authUid) {
      const userCore: Record<string, any> = {
        email: email || `aluno.${parsed.data.enrollment_number}@pendente.local`,
        name: parsed.data.name,
        role: 'student',
        ...(authUid ? { auth_uid: authUid } : {}),
        ...(matchedClass?.school_id ? { school_id: matchedClass.school_id } : {}),
      };
      const userFull = { ...userCore, status: parsed.data.access_status };
      const { data: createdUser, error: userErr } = await insertWithSchemaFallback(
        db,
        'users',
        userFull,
        userCore
      );
      if (userErr) {
        if (authUid && adminClient) {
          await adminClient.auth.admin.deleteUser(authUid);
        }
        return dbErrorResponse(userErr, 'usuário do aluno (users)');
      }
      userId = createdUser?.id;
    }

    const studentCore: Record<string, any> = {
      ...(userId ? { user_id: userId } : {}),
      enrollment_number: parsed.data.enrollment_number,
      class_id: parsed.data.class_id,
    };

    const studentFull: Record<string, any> = {
      ...studentCore,
      name: parsed.data.name,
      ...(email ? { email } : {}),
      ...(parsed.data.guardian_name ? { guardian_name: parsed.data.guardian_name } : {}),
      ...(parsed.data.guardian_contact ? { guardian_contact: parsed.data.guardian_contact } : {}),
      ...(parsed.data.birth_date ? { birth_date: parsed.data.birth_date } : {}),
      status: parsed.data.status,
      lgpd_consent: parsed.data.lgpd_consent,
    };

    const { data: createdStudent, error: stuErr } = await insertWithSchemaFallback(
      db,
      'students',
      studentFull,
      studentCore
    );

    if (stuErr) {
      return dbErrorResponse(stuErr, 'matrícula de aluno (students)');
    }

    // Initialize real student wallet in `wallets` table (best-effort if not created by trigger)
    try {
      await db.from('wallets').insert({
        student_id: createdStudent.id,
        balance: 0,
        total_earned: 0,
        total_spent: 0,
      });
    } catch {
      // Wallet may already exist via DB trigger
    }

    return NextResponse.json(
      {
        id: createdStudent.id,
        user_id: createdStudent.user_id ?? userId,
        name: createdStudent.name ?? parsed.data.name,
        email: email || undefined,
        enrollment_number: createdStudent.enrollment_number ?? parsed.data.enrollment_number,
        class_id: createdStudent.class_id ?? parsed.data.class_id,
        class_name: matchedClass?.name ?? parsed.data.class_id,
        guardian_name: createdStudent.guardian_name ?? (parsed.data.guardian_name || undefined),
        guardian_contact:
          createdStudent.guardian_contact ?? (parsed.data.guardian_contact || undefined),
        birth_date: createdStudent.birth_date ?? (parsed.data.birth_date || undefined),
        status: createdStudent.status ?? parsed.data.status,
        photo_path: createdStudent.photo_path ?? null,
        lgpd_consent: createdStudent.lgpd_consent ?? parsed.data.lgpd_consent,
        has_access: Boolean(authUid),
        access_status: authUid ? parsed.data.access_status : 'none',
        created_at: createdStudent.created_at ?? new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (e: any) {
    return dbErrorResponse(e, 'matrícula de aluno');
  }
}
