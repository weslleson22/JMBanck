import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/role';
import {
  dbErrorResponse,
  getServerDbContext,
  insertWithSchemaFallback,
} from '@/lib/supabase-data';

const createTeacherSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do professor'),
  email: z.string().trim().email('Informe um e-mail válido').or(z.literal('')).optional().default(''),
  subject: z.string().trim().min(2, 'Informe a disciplina principal'),
  classes_linked: z.string().trim().optional().default(''),
  school_id: z.string().trim().optional().default(''),
  phone: z.string().trim().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  password: z.string().optional().default(''),
  access_status: z.enum(['active', 'blocked']).optional().default('active'),
});

export async function GET() {
  try {
    const { db } = await getServerDbContext();
    const [{ data: teachers, error: tErr }, { data: users, error: uErr }] = await Promise.all([
      db.from('teachers').select('*'),
      db.from('users').select('*'),
    ]);

    if (tErr) return dbErrorResponse(tErr, 'professores (teachers)');

    const userMap = new Map<string, any>();
    if (!uErr && Array.isArray(users)) {
      for (const u of users) {
        userMap.set(u.id, u);
        if (u.auth_uid) userMap.set(u.auth_uid, u);
      }
    }

    const enriched = (teachers ?? []).map((t: any) => {
      const linkedUser = t.user_id ? userMap.get(t.user_id) : null;
      const isBlocked = linkedUser?.status === 'blocked' || linkedUser?.status === 'inactive';
      const hasAccess = Boolean(linkedUser?.auth_uid);
      return {
        id: t.id,
        user_id: t.user_id ?? undefined,
        name: t.name ?? linkedUser?.name ?? 'Professor',
        email: linkedUser?.email ?? t.email ?? undefined,
        subject: t.subject ?? 'Docente',
        classes_linked: t.classes_linked ?? 'Não informado',
        school_id: t.school_id ?? linkedUser?.school_id ?? undefined,
        phone: t.phone ?? undefined,
        status: t.status === 'inactive' ? 'inactive' : 'active',
        has_access: hasAccess,
        access_status: !hasAccess ? 'none' : isBlocked ? 'blocked' : 'active',
        created_at: t.created_at ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(enriched);
  } catch (e: any) {
    return dbErrorResponse(e, 'professores (teachers)');
  }
}

export async function POST(req: Request) {
  try {
    const { authClient, adminClient, db } = await getServerDbContext();
    try {
      await authorize(authClient, ['manage_teachers']);
    } catch (authErr: any) {
      return NextResponse.json(
        { message: authErr?.message ?? 'Sem permissão para cadastrar professores' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createTeacherSchema.safeParse(body);
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
        { message: 'Informe um e-mail de login para definir a senha do professor.' },
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
              'A variável SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor. Configure-a para criar usuários com senha no Supabase Auth.',
            code: 'MISSING_SERVICE_ROLE_KEY',
          },
          { status: 400 }
        );
      }

      const { data: createdAuth, error: createAuthErr } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: parsed.data.name, role: 'teacher' },
        });

      if (createAuthErr || !createdAuth?.user) {
        return NextResponse.json(
          { message: createAuthErr?.message ?? 'Erro ao criar conta de acesso no Supabase Auth.' },
          { status: 400 }
        );
      }
      authUid = createdAuth.user.id;
      if (parsed.data.access_status === 'blocked') {
        await adminClient.auth.admin.updateUserById(authUid, { ban_duration: '876000h' });
      }
    }

    let schoolId = parsed.data.school_id || undefined;
    if (!schoolId) {
      const { data: firstSchool } = await db.from('schools').select('id').limit(1).maybeSingle();
      schoolId = firstSchool?.id;
    }

    // Create linked row in `users` table if email or authUid present
    let userId: string | undefined;
    if (email || authUid) {
      const userCore: Record<string, any> = {
        email: email || `prof.${Date.now()}@pendente.local`,
        name: parsed.data.name,
        role: 'teacher',
        ...(authUid ? { auth_uid: authUid } : {}),
        ...(schoolId ? { school_id: schoolId } : {}),
      };
      const userFull: Record<string, any> = {
        ...userCore,
        status: parsed.data.access_status,
      };
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
        return dbErrorResponse(userErr, 'usuário do professor (users)');
      }
      userId = createdUser?.id;
    }

    const teacherCore: Record<string, any> = {
      ...(userId ? { user_id: userId } : {}),
    };
    const teacherFull: Record<string, any> = {
      ...teacherCore,
      name: parsed.data.name,
      ...(email ? { email } : {}),
      subject: parsed.data.subject,
      classes_linked: parsed.data.classes_linked || 'Sem turma vinculada',
      ...(schoolId ? { school_id: schoolId } : {}),
      ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      status: parsed.data.status,
    };

    const { data: createdTeacher, error: teacherErr } = await insertWithSchemaFallback(
      db,
      'teachers',
      teacherFull,
      Object.keys(teacherCore).length > 0 ? teacherCore : { name: parsed.data.name }
    );

    if (teacherErr) {
      return dbErrorResponse(teacherErr, 'criação de professor (teachers)');
    }

    return NextResponse.json(
      {
        id: createdTeacher.id,
        user_id: createdTeacher.user_id ?? userId,
        name: createdTeacher.name ?? parsed.data.name,
        email: email || undefined,
        subject: createdTeacher.subject ?? parsed.data.subject,
        classes_linked: createdTeacher.classes_linked ?? (parsed.data.classes_linked || 'Sem turma vinculada'),
        school_id: createdTeacher.school_id ?? schoolId,
        phone: createdTeacher.phone ?? (parsed.data.phone || undefined),
        status: createdTeacher.status ?? parsed.data.status,
        has_access: Boolean(authUid),
        access_status: authUid ? parsed.data.access_status : 'none',
        created_at: createdTeacher.created_at ?? new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (e: any) {
    return dbErrorResponse(e, 'criação de professor');
  }
}
