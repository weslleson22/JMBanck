'use client';

import { getStoredDemoUser } from '@/lib/client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Camera,
  Search,
  ShieldCheck,
  Upload,
  Trash2,
  User,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAllStudentPhotos,
  getCachedStudentPhotos,
  saveStudentPhoto,
  deleteStudentPhoto,
  type StudentPhotoRecord,
} from '@/lib/carometro-store';

interface Student {
  id: string;
  enrollment_number: string;
  name: string;
  class_id: string;
  class_name?: string;
  status: 'active' | 'inactive' | 'transferred';
  photo_path?: string | null;
  lgpd_consent?: boolean;
}

interface ClassOption {
  id: string;
  name: string;
}

const DEMO_CLASSES: ClassOption[] = [
  { id: 'turma-9a', name: '9º Ano A - Matutino' },
  { id: 'turma-8b', name: '8º Ano B - Matutino' },
  { id: 'turma-1em', name: '1º Ano EM - Integral' },
];

const DEMO_STUDENTS: Student[] = [
  {
    id: 'stu-1',
    enrollment_number: '20260014',
    name: 'Lucas Oliveira',
    class_id: 'turma-9a',
    class_name: '9º Ano A - Matutino',
    status: 'active',
    lgpd_consent: true,
  },
  {
    id: 'stu-2',
    enrollment_number: '20260018',
    name: 'Beatriz Santos',
    class_id: 'turma-9a',
    class_name: '9º Ano A - Matutino',
    status: 'active',
    lgpd_consent: true,
  },
  {
    id: 'stu-3',
    enrollment_number: '20260022',
    name: 'Gabriel Ferreira',
    class_id: 'turma-8b',
    class_name: '8º Ano B - Matutino',
    status: 'active',
    lgpd_consent: true,
  },
  {
    id: 'stu-4',
    enrollment_number: '20260029',
    name: 'Mariana Costa',
    class_id: 'turma-8b',
    class_name: '8º Ano B - Matutino',
    status: 'active',
    lgpd_consent: true,
  },
  {
    id: 'stu-5',
    enrollment_number: '20260035',
    name: 'Pedro Henrique Lima',
    class_id: 'turma-1em',
    class_name: '1º Ano EM - Integral',
    status: 'active',
    lgpd_consent: true,
  },
  {
    id: 'stu-6',
    enrollment_number: '20260041',
    name: 'Júlia Almeida',
    class_id: 'turma-1em',
    class_name: '1º Ano EM - Integral',
    status: 'transferred',
    lgpd_consent: true,
  },
];

export default function CarometroPage() {
  const [students, setStudents] = useState<Student[]>(DEMO_STUDENTS);
  const [classes, setClasses] = useState<ClassOption[]>(DEMO_CLASSES);
  const [photosMap, setPhotosMap] = useState<Record<string, StudentPhotoRecord>>({});
  const [loading, setLoading] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [role, setRole] = useState<string>('teacher');

  const canManagePhotos = ['super_admin', 'school_admin', 'teacher'].includes(role);

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);

    // Immediately load cached photos, then sync from backend database
    setPhotosMap(getCachedStudentPhotos());

    (async () => {
      setLoading(true);
      try {
        const [dbPhotos, clsRes, stuRes] = await Promise.all([
          fetchAllStudentPhotos(),
          fetch('/api/classes', { cache: 'no-store' }),
          fetch('/api/students', { cache: 'no-store' }),
        ]);
        setPhotosMap(dbPhotos);

        if (clsRes.ok) {
          const classData = await clsRes.json();
          if (Array.isArray(classData) && classData.length > 0) {
            setClasses(classData);
          }
        }
        if (stuRes.ok) {
          const studentData = await stuRes.json();
          if (Array.isArray(studentData) && studentData.length > 0) {
            setStudents(studentData as Student[]);
          }
        }
      } catch {
        // Keep demo students + saved photos
      } finally {
        setLoading(false);
      }
    })();

    const handleSync = () => setPhotosMap(getCachedStudentPhotos());
    window.addEventListener('jmbank-photos-update', handleSync);
    return () => window.removeEventListener('jmbank-photos-update', handleSync);
  }, []);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.enrollment_number?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = !classFilter || s.class_id === classFilter;
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  async function handlePhotoUpload(studentId: string, file: File | null) {
    if (!file) return;
    if (!canManagePhotos) {
      toast.error('Seu perfil não possui permissão para alterar fotos de alunos.');
      return;
    }

    setSavingStudentId(studentId);
    try {
      const updatedBy = getStoredDemoUser()?.name ?? 'Professor / Admin';
      const savedRecord = await saveStudentPhoto({
        studentId,
        file,
        updatedBy,
      });

      setPhotosMap((prev) => ({
        ...prev,
        [studentId]: savedRecord,
      }));
      toast.success('Fotografia salva no banco de dados com sucesso!');
    } catch {
      toast.error('Erro ao salvar fotografia.');
    } finally {
      setSavingStudentId(null);
    }
  }

  async function handlePhotoRemove(studentId: string) {
    if (!canManagePhotos) return;
    setSavingStudentId(studentId);
    try {
      await deleteStudentPhoto(studentId);
      setPhotosMap((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      toast.success('Fotografia removida do banco de dados.');
    } catch {
      toast.error('Erro ao remover fotografia.');
    } finally {
      setSavingStudentId(null);
    }
  }

  function getStudentPhotoUrl(student: Student): string | null {
    const saved = photosMap[student.id]?.photoDataUrl;
    if (saved) return saved;
    if (
      student.photo_path &&
      (student.photo_path.startsWith('data:image/') || student.photo_path.startsWith('http'))
    ) {
      return student.photo_path;
    }
    return null;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="default">Identificação Visual</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Conforme LGPD (Sem Biometria)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Carômetro Escolar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mt-1">
            As fotografias enviadas são salvas de forma persistente no banco de dados e exibidas
            automaticamente para todos os usuários autorizados.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Pesquisar por nome ou matrícula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <Select onValueChange={setClassFilter} value={classFilter}>
              <SelectTrigger className="w-full sm:w-48 md:w-52">
                <SelectValue placeholder="Todas as turmas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as turmas</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-full sm:w-44 md:w-48">
                <SelectValue placeholder="Todas as situações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as situações</SelectItem>
                <SelectItem value="active">Matrícula Ativa</SelectItem>
                <SelectItem value="transferred">Transferido</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setSearch('');
                setClassFilter('');
                setStatusFilter('');
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center gap-2 p-8 text-slate-600 text-sm">
          <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
          Carregando carômetro e fotos salvas...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {filteredStudents.map((s) => {
            const className =
              s.class_name ?? classes.find((c) => c.id === s.class_id)?.name ?? s.class_id;
            const initials = (s.name || 'AL')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const photoUrl = getStudentPhotoUrl(s);
            const isSaving = savingStudentId === s.id;

            return (
              <Card
                key={s.id}
                className="flex flex-col items-center text-center p-3 sm:p-5 hover:border-blue-300 hover:shadow-md transition-all"
              >
                {/* Avatar / Saved Photo */}
                <div className="relative mb-2.5 sm:mb-3">
                  <div className="w-18 h-18 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                    {isSaving ? (
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-blue-600" />
                    ) : photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={s.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg sm:text-xl font-bold text-blue-700">{initials}</span>
                    )}
                  </div>

                  {canManagePhotos && (
                    <label
                      title="Enviar ou substituir foto no banco de dados"
                      className="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow cursor-pointer hover:bg-blue-700 active:scale-95 transition-transform"
                    >
                      <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(s.id, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>

                {/* Info */}
                <h3 className="font-heading font-bold text-[13px] sm:text-sm text-slate-900 line-clamp-1 w-full" title={s.name}>
                  {s.name}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-mono tabular-nums mt-0.5 truncate w-full">
                  Mat: {s.enrollment_number}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 line-clamp-1 w-full">
                  {className}
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                  <Badge
                    variant={
                      s.status === 'active'
                        ? 'success'
                        : s.status === 'transferred'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="text-[11px] px-2 py-0.5"
                  >
                    {s.status === 'active'
                      ? 'Ativo'
                      : s.status === 'transferred'
                      ? 'Transferido'
                      : 'Inativo'}
                  </Badge>
                  {photoUrl && (
                    <span
                      title="Foto salva no banco de dados"
                      className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Foto Salva
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2.5 sm:mt-3 w-full text-xs text-blue-600 h-8"
                  onClick={() => setSelectedStudent(s)}
                >
                  Ver Perfil
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Student Profile & Photo Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-blue-100 flex items-center justify-center overflow-hidden text-blue-700 font-bold text-lg border border-slate-200 shrink-0">
                  {getStudentPhotoUrl(selectedStudent) ? (
                    <img
                      src={getStudentPhotoUrl(selectedStudent)!}
                      alt={selectedStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 sm:h-7 sm:w-7" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Matrícula: {selectedStudent.enrollment_number}
                  </p>
                  {photosMap[selectedStudent.id] && (
                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5 truncate">
                      ✓ Foto salva no banco em{' '}
                      {new Date(photosMap[selectedStudent.id].updatedAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                aria-label="Fechar"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 sm:p-4 space-y-1.5 sm:space-y-2 text-xs text-slate-600">
              <p>
                <strong>Turma:</strong>{' '}
                {selectedStudent.class_name ?? selectedStudent.class_id}
              </p>
              <p>
                <strong>Status da Matrícula:</strong>{' '}
                {selectedStudent.status === 'active' ? 'Ativa' : selectedStudent.status}
              </p>
              <p className="leading-relaxed">
                <strong>Autorização de Imagem (LGPD):</strong> Consentimento registrado para
                identificação visual interna escolar.
              </p>
            </div>

            {canManagePhotos && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <label className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  {getStudentPhotoUrl(selectedStudent)
                    ? 'Substituir Fotografia'
                    : 'Enviar Fotografia'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handlePhotoUpload(selectedStudent.id, e.target.files?.[0] ?? null)
                    }
                  />
                </label>
                {getStudentPhotoUrl(selectedStudent) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => handlePhotoRemove(selectedStudent.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
