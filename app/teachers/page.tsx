'use client';

import { createClient as supabaseClient } from '@/lib/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2, UserCheck } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome do professor'),
  subject: z.string().min(2, 'Informe a disciplina principal'),
  classes_linked: z.string().min(2, 'Informe as turmas vinculadas'),
});

type FormData = z.infer<typeof schema>;

const DEMO_TEACHERS = [
  { id: 'prof-1', name: 'Profª. Ana Paula', subject: 'Matemática', classes_linked: '9º Ano A, 8º Ano B' },
  { id: 'prof-2', name: 'Prof. Ricardo Gomes', subject: 'História & Geografia', classes_linked: '9º Ano A, 1º Ano EM' },
  { id: 'prof-3', name: 'Profª. Camila Rocha', subject: 'Língua Portuguesa', classes_linked: '8º Ano B, 1º Ano EM' },
];

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>(DEMO_TEACHERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = supabaseClient();
        const { data } = await supabase.from('teachers').select('*');
        if (data?.length) setTeachers(data);
      } catch {
        // Keep demo teachers
      }
    })();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setTeachers((prev) => [
      ...prev,
      {
        id: `prof-${Date.now()}`,
        name: data.name,
        subject: data.subject,
        classes_linked: data.classes_linked,
      },
    ]);
    toast.success('Professor cadastrado e vinculado às turmas!');
    reset();
    setLoading(false);
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <Badge variant="default" className="mb-2">Corpo Docente</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Professores & Vínculos</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          Um professor pode estar vinculado a várias turmas e conceder moedas conforme regras da escola.
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Professores Cadastrados</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Docentes e suas respectivas turmas</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            <ul className="space-y-3">
              {teachers.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                        {t.name ?? t.user_id}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                        {t.subject ?? 'Docente'} · Turmas: {t.classes_linked ?? 'Vinculadas'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" className="self-start sm:self-auto shrink-0 text-[11px]">Ativo</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-fit overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Cadastrar & Vincular Professor</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Permissão: Diretor / Administrador Escolar</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Nome Completo</label>
                <Input {...register('name')} placeholder="Ex.: Prof. Carlos Alberto" />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Disciplina</label>
                <Input {...register('subject')} placeholder="Ex.: Ciências / Física" />
                {errors.subject && <p className="text-xs text-red-600">{errors.subject.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Turmas Vinculadas</label>
                <Input {...register('classes_linked')} placeholder="Ex.: 9º Ano A, 8º Ano B" />
                {errors.classes_linked && (
                  <p className="text-xs text-red-600">{errors.classes_linked.message}</p>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Salvar Professor
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
