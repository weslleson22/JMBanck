export interface StudentPhotoRecord {
  studentId: string;
  photoDataUrl: string;
  updatedAt: string;
  updatedBy?: string;
}

const LOCAL_PHOTOS_KEY = 'jmbank_carometro_photos_v1';

export function getCachedStudentPhotos(): Record<string, StudentPhotoRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_PHOTOS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function setCachedStudentPhotos(photos: Record<string, StudentPhotoRecord>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(photos));
    window.dispatchEvent(new Event('jmbank-photos-update'));
  } catch {
    // ignore quota errors
  }
}

/**
 * Fetches all saved student photos from the backend database and merges with local cache.
 */
export async function fetchAllStudentPhotos(): Promise<Record<string, StudentPhotoRecord>> {
  try {
    // Usa `no-cache` (em vez de `no-store`) para permitir revalidação por ETag -> HTTP 304
    // evitando transferir novamente todas as fotos base64 na Vercel (Fast Origin Transfer).
    const res = await fetch('/api/carometro/photos', { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      const serverPhotos = (json.photos ?? {}) as Record<string, StudentPhotoRecord>;
      setCachedStudentPhotos(serverPhotos);
      return serverPhotos;
    }
  } catch {
    // Handled by caller via API status
  }
  return getCachedStudentPhotos();
}

/**
 * Compresses and resizes an uploaded image file into a compact JPEG Data URL (max 320x320)
 * so it saves fast and minimizes database & Fast Origin Transfer bandwidth.
 */
export function fileToCompressedDataUrl(file: File, maxSize = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result as string);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        resolve(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Saves a student's photo both in the backend database (`/api/carometro/photos`) and in localStorage.
 */
export async function saveStudentPhoto(params: {
  studentId: string;
  file: File;
  updatedBy?: string;
}): Promise<StudentPhotoRecord> {
  const photoDataUrl = await fileToCompressedDataUrl(params.file);

  const res = await fetch('/api/carometro/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: params.studentId,
      photoDataUrl,
      updatedBy: params.updatedBy,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message ?? 'Erro ao persistir foto no banco de dados');
  }

  const record: StudentPhotoRecord = json.photo ?? {
    studentId: params.studentId,
    photoDataUrl,
    updatedAt: new Date().toISOString(),
    updatedBy: params.updatedBy ?? 'Usuário Autorizado',
  };

  const cached = getCachedStudentPhotos();
  cached[params.studentId] = record;
  setCachedStudentPhotos(cached);

  return record;
}

/**
 * Removes a student's photo from the backend database and updates local cache.
 */
export async function deleteStudentPhoto(studentId: string): Promise<void> {
  const res = await fetch(`/api/carometro/photos?studentId=${encodeURIComponent(studentId)}`, {
    method: 'DELETE',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message ?? 'Erro ao remover foto do banco de dados');
  }

  const cached = getCachedStudentPhotos();
  delete cached[studentId];
  setCachedStudentPhotos(cached);
}
