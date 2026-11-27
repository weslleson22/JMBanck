'use client';

import { createClient as supabaseClient, getStoredDemoUser } from '@/lib/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2, ArrowLeftRight, User } from 'lucide-react';
import {
  fetchAllStudentPhotos,
  getCachedStudentPhotos,
  type StudentPhotoRecord,
} from '@/lib/carometro-store';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome completo do aluno'),
  enrollment_number: z.string().min(1, 'Informe o número da matrícula'),
  class_id: z.string().min(1, 'Informe a turma'),
});

type FormData = z.infer<typeof schema>;

const DEMO_STUDENTS = [
  { id: 'stu-1', name: 'Lucas Oliveira', enrollment_number: '20260014', class_id: '9º Ano A', status: 'active' },
  { id: 'stu-2', name: 'Beatriz Santos', enrollment_number: '20260018', class_id: '9º Ano A', status: 'active' },
  { id: 'stu-3', name: 'Gabriel Ferreira', enrollment_number: '20260022', class_id: '8º Ano B', status: 'active' },
  { id: 'stu-4', name: 'Mariana Costa', enrollment_number: '20260029', class_id: '8º Ano B', status: 'active' },
];

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>(DEMO_STUDENTS);
  const [photosMap, setPhotosMap] = useState<Record<string, StudentPhotoRecord>>({});
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>('teacher');

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);

    setPhotosMap(getCachedStudentPhotos());

    (async () => {
      try {
        const dbPhotos = await fetchAllStudentPhotos();
        setPhotosMap(dbPhotos);

        const supabase = supabaseClient();
        const { data } = await supabase.from('students').select('*');
        if (data?.length) setStudents(data);
      } catch {
        // Keep demo students
      }
    })();

    const handleSync = () => setPhotosMap(getCachedStudentPhotos());
    window.addEventListener('jmbank-photos-update', handleSync);
    return () => window.removeEventListener('jmbank-photos-update', handleSync);
  }, []);

  const canManageStudents = ['super_admin', 'school_admin'].includes(role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    if (!canManageStudents) return;
    setLoading(true);
    setStudents((prev) => [
      ...prev,
      {
        id: `stu-${Date.now()}`,
        name: data.name,
        enrollment_number: data.enrollment_number,
        class_id: data.class_id,
        status: 'active',
      },
    ]);
    toast.success('Aluno matriculado e carteira digital inicializada!');
    reset();
    setLoading(false);
  }

  function handleTransfer(studentId: string) {
    if (!canManageStudents) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, class_id: s.class_id === '9º Ano A' ? '8º Ano B' : '9º Ano A' }
          : s
      )
    );
    toast.success('Transferência de turma registrada no histórico de matrícula!');
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <Badge variant="default" className="mb-2">Secretaria & Consulta Escolar</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Relação de Alunos</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          {canManageStudents
            ? 'Gerencie matrículas, vínculos com turmas e transferências autorizadas.'
            : 'Consulta de estudantes matriculados nas turmas autorizadas.'}
        </p>
      </div>

      <section className={`grid grid-cols-1 ${canManageStudents ? 'lg:grid-cols-3' : ''} gap-5 sm:gap-6`}>
        <Card className={`overflow-hidden ${canManageStudents ? 'lg:col-span-2' : ''}`}>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Alunos Matriculados</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Estudantes com vínculo ativo, foto do carômetro e carteira digital</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            <div className="space-y-2.5">
              {students.map((s) => {
                const photoUrl = photosMap[s.id]?.photoDataUrl ?? s.photo_path;
                return (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center shrink-0 text-blue-700 font-bold text-xs border border-white shadow-sm">
                        {photoUrl ? (
                          <img src={photoUrl} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                          {s.name ?? `Matrícula ${s.enrollment_number}`}
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                          Matrícula: <span className="font-mono tabular-nums font-medium text-slate-700">{s.enrollment_number}</span> · Turma:{' '}
                          <strong className="font-semibold text-slate-700">{s.class_id}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                      <Badge variant="success" className="text-[11px]">Matrícula Ativa</Badge>
                      {canManageStudents && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTransfer(s.id)}
                          className="text-xs py-1 px-2.5 h-8"
                          title="Transferir entre turmas"
                        >
                          <ArrowLeftRight className="h-3 w-3 mr-1" />
                          Transferir
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {canManageStudents && (
          <Card className="h-fit overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">Matricular Novo Aluno</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Exclusivo para Diretoria / Administração Escolar</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Nome Completo</label>
                  <Input {...register('name')} placeholder="Ex.: Sofia Rodrigues" />
                  {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Número de Matrícula</label>
                  <Input {...register('enrollment_number')} placeholder="Ex.: 20260055" />
                  {errors.enrollment_number && (
                    <p className="text-xs text-red-600">{errors.enrollment_number.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Turma</label>
                  <Input {...register('class_id')} placeholder="Ex.: 9º Ano A" />
                  {errors.class_id && (
                    <p className="text-xs text-red-600">{errors.class_id.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  Confirmar Matrícula
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
