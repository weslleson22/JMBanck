'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Flag,
  Coins,
  Clock,
  Camera,
  Award,
  CheckCircle2,
  XCircle,
  Plus,
  FileCheck2,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getStoredDemoUser } from '@/lib/client';
import {
  getActivities,
  getSubmissions,
  addActivity,
  validateStudentSubmission,
  type TeacherActivity,
  type ActivitySubmission,
} from '@/lib/activities-store';

export default function TeacherDashboardPage() {
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Activity Form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Matemática');
  const [newClass, setNewClass] = useState('9º Ano A');
  const [newReward, setNewReward] = useState(50);
  const [newDeadline, setNewDeadline] = useState('Até Sexta-feira');
  const [newDescription, setNewDescription] = useState('');
  const [q1Text, setQ1Text] = useState('');
  const [q1Options, setQ1Options] = useState('');
  const [q2Text, setQ2Text] = useState('');

  const syncData = () => {
    setActivities(getActivities());
    setSubmissions(getSubmissions());
  };

  useEffect(() => {
    syncData();
    window.addEventListener('jmbank-store-update', syncData);
    return () => window.removeEventListener('jmbank-store-update', syncData);
  }, []);

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');
  const validatedSubmissions = submissions.filter((s) => s.status !== 'pending');

  const approvedCoinsTotal =
    2450 +
    submissions
      .filter((s) => s.status === 'approved')
      .reduce((acc, s) => acc + s.rewardAmount, 0);

  function handleValidate(sub: ActivitySubmission, approve: boolean) {
    const teacherName = getStoredDemoUser()?.name ?? 'Profª. Ana Paula';
    const feedback = feedbackMap[sub.id]?.trim();

    validateStudentSubmission({
      submissionId: sub.id,
      approve,
      teacherName,
      feedback,
    });

    if (approve) {
      toast.success(
        `Atividade validada! +${sub.rewardAmount} JM$ foram creditados na carteira de ${sub.studentName}.`
      );
    } else {
      toast.info(`Revisão solicitada para a submissão de ${sub.studentName}.`);
    }
    syncData();
  }

  function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !q1Text.trim()) {
      toast.error('Preencha o título da atividade e ao menos a 1ª questão.');
      return;
    }

    const questions = [
      {
        id: 'q1',
        question: `1. ${q1Text.trim()}`,
        options: q1Options.trim()
          ? q1Options
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
      },
    ];

    if (q2Text.trim()) {
      questions.push({
        id: 'q2',
        question: `2. ${q2Text.trim()}`,
        options: undefined,
      });
    }

    const teacherName = getStoredDemoUser()?.name ?? 'Profª. Ana Paula';
    addActivity({
      title: newTitle.trim(),
      subject: newSubject.trim(),
      teacherName,
      className: newClass.trim(),
      description:
        newDescription.trim() ||
        'Responda às questões propostas e envie para validação do professor.',
      rewardAmount: Number(newReward) || 30,
      deadline: newDeadline.trim() || 'Próxima aula',
      questions,
    });

    toast.success('Nova atividade publicada! Os alunos já podem responder no Painel do Aluno.');
    setNewTitle('');
    setNewDescription('');
    setQ1Text('');
    setQ1Options('');
    setQ2Text('');
    setShowCreateModal(false);
    syncData();
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <Badge variant="default" className="mb-1.5 sm:mb-2">Área Docente & Coordenação</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard do Professor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Crie atividades com questões, valide submissões dos alunos e libere créditos de moedas JM$.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Criar Atividade com Questões
          </Button>
          <Link
            href="/carometro"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Abrir Carômetro
          </Link>
        </div>
      </div>

      {/* KPIs - 2 columns on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card>
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Minhas Turmas
              </p>
              <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
                4
              </p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Atividades Criadas
              </p>
              <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
                {activities.length}
              </p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Flag className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Moedas Concedidas
              </p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-1">
                {approvedCoinsTotal.toLocaleString('pt-BR')} JM$
              </p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={pendingSubmissions.length > 0 ? 'border-amber-300 bg-amber-50/40' : ''}>
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Para Validar
              </p>
              <p className="font-numeric text-xl sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-1">
                {pendingSubmissions.length}
              </p>
            </div>
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Student Submissions Queue */}
      <Card className="border-blue-200">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileCheck2 className="h-5 w-5 text-blue-600 shrink-0" />
            Submissões de Alunos Aguardando Validação ({pendingSubmissions.length})
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Confira as respostas enviadas e clique em <strong>Validar & Creditar</strong>{' '}
            para liberar as moedas JM$ na carteira do estudante.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0 space-y-3 sm:space-y-4">
          {pendingSubmissions.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-6 text-center text-xs sm:text-sm text-slate-500">
              Nenhuma submissão pendente no momento. Quando um aluno responder uma atividade em{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-[11px]">/dashboard/student</code>,
              ela aparecerá aqui para validação!
            </div>
          ) : (
            pendingSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-5 space-y-3 sm:space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5 sm:pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-bold text-sm sm:text-base text-slate-900">{sub.studentName}</span>
                      <Badge variant="secondary">{sub.studentClass}</Badge>
                      <Badge variant="warning">Pendente</Badge>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Atividade: <strong>{sub.activityTitle}</strong> ({sub.subject}) · Enviado em:{' '}
                      {sub.submittedAt}
                    </p>
                  </div>
                  <Badge variant="success" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1 self-start sm:self-center">
                    Valor: +{sub.rewardAmount} JM$
                  </Badge>
                </div>

                {/* Student Answers */}
                <div className="space-y-2">
                  <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Respostas Enviadas pelo Aluno:
                  </p>
                  {sub.answers.map((ans) => (
                    <div
                      key={ans.questionId}
                      className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 text-xs space-y-1"
                    >
                      <p className="font-semibold text-slate-700 leading-snug">{ans.questionText}</p>
                      <p className="text-slate-900 bg-blue-50/70 rounded px-2.5 py-1.5 font-medium leading-relaxed">
                        R: {ans.answer}
                      </p>
                    </div>
                  ))}
                  {sub.studentNotes && (
                    <p className="text-xs text-slate-600 italic">
                      Observação do aluno: &ldquo;{sub.studentNotes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Teacher Feedback & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-1">
                  <Input
                    placeholder="Feedback opcional para o aluno..."
                    value={feedbackMap[sub.id] ?? ''}
                    onChange={(e) =>
                      setFeedbackMap((prev) => ({ ...prev, [sub.id]: e.target.value }))
                    }
                    className="flex-1 bg-white text-xs sm:text-sm"
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleValidate(sub, true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs w-full sm:w-auto"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Validar & Creditar +{sub.rewardAmount} JM$
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleValidate(sub, false)}
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs w-full sm:w-auto"
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Recusar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Validated History & Published Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
              Atividades Publicadas
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Questionários disponíveis no Painel do Aluno
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5 sm:space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-slate-900 truncate">{act.title}</p>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    {act.subject} · {act.className} · {act.questions.length} questões
                  </p>
                </div>
                <Badge variant="success" className="shrink-0 text-xs">+{act.rewardAmount} JM$</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
              Histórico de Avaliações
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Atividades validadas e créditos liberados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5 sm:space-y-3">
            {validatedSubmissions.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhuma atividade avaliada ainda nesta sessão.</p>
            ) : (
              validatedSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                      {sub.studentName} — {sub.activityTitle}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Avaliado em {sub.validatedAt} por {sub.validatedBy}
                    </p>
                  </div>
                  <Badge
                    variant={sub.status === 'approved' ? 'success' : 'destructive'}
                    className="self-start sm:self-center shrink-0 text-[11px] sm:text-xs"
                  >
                    {sub.status === 'approved'
                      ? `Creditado +${sub.rewardAmount} JM$`
                      : 'Correção Solicitada'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal to Create New Activity with Questions */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 sm:p-6 sm:p-8 shadow-xl space-y-4 sm:space-y-5 my-4 sm:my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Criar Nova Atividade / Questionário
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Fechar"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-3.5 sm:space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Título da Atividade</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: Exercícios de Frações e Educação Financeira"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Disciplina</label>
                  <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Turma</label>
                  <Input value={newClass} onChange={(e) => setNewClass(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Crédito (JM$)</label>
                  <Input
                    type="number"
                    value={newReward}
                    onChange={(e) => setNewReward(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Instruções para o Aluno</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descrição breve da atividade"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Questão 1 (Múltipla Escolha ou Discursiva)
                </p>
                <Input
                  value={q1Text}
                  onChange={(e) => setQ1Text(e.target.value)}
                  placeholder="Enunciado da 1ª questão..."
                  className="bg-white"
                />
                <Input
                  value={q1Options}
                  onChange={(e) => setQ1Options(e.target.value)}
                  placeholder="Alternativas separadas por vírgula (deixe vazio para aberta)"
                  className="bg-white text-xs"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Questão 2 (Discursiva – Opcional)
                </p>
                <Input
                  value={q2Text}
                  onChange={(e) => setQ2Text(e.target.value)}
                  placeholder="Enunciado da 2ª questão aberta..."
                  className="bg-white"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Publicar Atividade</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
