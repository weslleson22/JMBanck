import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PHOTOS_DB_FILE = path.join(DATA_DIR, 'carometro-photos.json');

export interface StoredStudentPhoto {
  studentId: string;
  photoDataUrl: string;
  updatedAt: string;
  updatedBy?: string;
}

async function readPhotosDb(): Promise<Record<string, StoredStudentPhoto>> {
  try {
    const content = await fs.readFile(PHOTOS_DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writePhotosDb(data: Record<string, StoredStudentPhoto>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PHOTOS_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const localDb = await readPhotosDb();

    // Also check Supabase students table if available
    try {
      const supabase = await supabaseServer();
      const { data: students } = await supabase
        .from('students')
        .select('id, photo_path')
        .not('photo_path', 'is', null);

      if (students?.length) {
        for (const s of students) {
          if (s.photo_path && !localDb[s.id]) {
            if (s.photo_path.startsWith('data:image/') || s.photo_path.startsWith('http')) {
              localDb[s.id] = {
                studentId: s.id,
                photoDataUrl: s.photo_path,
                updatedAt: new Date().toISOString(),
              };
            } else {
              const { data: signed } = await supabase.storage
                .from('student-photos')
                .createSignedUrl(s.photo_path, 3600);
              if (signed?.signedUrl) {
                localDb[s.id] = {
                  studentId: s.id,
                  photoDataUrl: signed.signedUrl,
                  updatedAt: new Date().toISOString(),
                };
              }
            }
          }
        }
      }
    } catch {
      // Fallback to local persistent DB file
    }

    return NextResponse.json({ photos: localDb });
  } catch (e: any) {
    return NextResponse.json({ photos: {}, message: e?.message }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, photoDataUrl, updatedBy } = body as {
      studentId?: string;
      photoDataUrl?: string;
      updatedBy?: string;
    };

    if (!studentId || !photoDataUrl) {
      return NextResponse.json(
        { message: 'studentId e photoDataUrl são obrigatórios' },
        { status: 400 }
      );
    }

    // 1. Persist in server-side JSON database so it survives restarts and works across all sessions
    const db = await readPhotosDb();
    db[studentId] = {
      studentId,
      photoDataUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy ?? 'Usuário Autorizado',
    };
    await writePhotosDb(db);

    // 2. Also persist in Supabase `students` table / `student-photos` bucket if configured
    try {
      const supabase = await supabaseServer();
      await supabase
        .from('students')
        .update({ photo_path: photoDataUrl })
        .eq('id', studentId);
    } catch {
      // Local JSON DB already saved it
    }

    return NextResponse.json({
      ok: true,
      photo: db[studentId],
    });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao salvar foto no banco' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ message: 'studentId é obrigatório' }, { status: 400 });
    }

    const db = await readPhotosDb();
    delete db[studentId];
    await writePhotosDb(db);

    try {
      const supabase = await supabaseServer();
      await supabase.from('students').update({ photo_path: null }).eq('id', studentId);
    } catch {
      // Ignore if table not present
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Erro ao remover foto' },
      { status: 500 }
    );
  }
}
