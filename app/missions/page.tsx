'use client';

import { getStoredDemoUser } from '@/lib/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import {
  Flag,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  BookOpen,
  XCircle,
} from 'lucide-react';
import {
  getActivities,
  getSubmissions,
  addActivity,
  submitStudentActivity,
  validateStudentSubmission,
  type TeacherActivity,
  type ActivitySubmission,
} from '@/lib/activities-store';

const CURRENT_STUDENT = {
  id: 'stu-1',
  name: 'Lucas Oliveira',
  enrollment: '20260014',
  className: '9º Ano A',
};

export default function MissionsPage() {
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [role, setRole] = useState<string>('student');

  // Student answering modal state
  const [activeActivity, setActiveActivity] = useState<TeacherActivity | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [studentNotes, setStudentNotes] = useState('');

  // Teacher create form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Matemática');
  const [className, setClassName] = useState('9º Ano A');
  const [rewardAmount, setRewardAmount] = useState(40);
  const [deadline, setDeadline] = useState('Até Sexta-feira');
  const [description, setDescription] = useState('');
  const [q1Text, setQ1Text] = useState('');
  const [q1Options, setQ1Options] = useState('');
  const [q2Text, setQ2Text] = useState('');

  const syncData = () => {
    setActivities(getActivities());
    setSubmissions(getSubmissions());
  };

  useEffect(() => {
    const demo = getStoredDemoUser();
    if (demo) setRole(demo.role);
    syncData();
    window.addEventListener('jmbank-store-update', syncData);
    return () => window.removeEventListener('jmbank-store-update', syncData);
  }, []);

  const canCreateMission = ['super_admin', 'school_admin', 'coordinator', 'teacher'].includes(role);

  function openAnswerModal(act: TeacherActivity) {
    const existing = submissions.find(
      (s) => s.activityId === act.id && s.studentId === CURRENT_STUDENT.id
    );
    const init: Record<string, string> = {};
    if (existing) {
      existing.answers.forEach((a) => {
        init[a.questionId] = a.answer;
      });
      setStudentNotes(existing.studentNotes ?? '');
    } else {
      setStudentNotes('');
    }
    setAnswers(init);
    setActiveActivity(act);
  }

  function handleStudentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeActivity) return;

    for (const q of activeActivity.questions) {
      if (!answers[q.id] || !answers[q.id].trim()) {
        toast.error('Responda todas as questões antes de submeter.');
        return;
      }
    }

    submitStudentActivity({
      activityId: activeActivity.id,
      activityTitle: activeActivity.title,
      subject: activeActivity.subject,
      rewardAmount: activeActivity.rewardAmount,
      studentId: CURRENT_STUDENT.id,
      studentName: CURRENT_STUDENT.name,
      studentEnrollment: CURRENT_STUDENT.enrollment,
      studentClass: CURRENT_STUDENT.className,
      answers: activeActivity.questions.map((q) => ({
        questionId: q.id,
        questionText: q.question,
        answer: answers[q.id].trim(),
      })),
      studentNotes: studentNotes.trim() || undefined,
    });

    toast.success('Respostas enviadas! Aguardando validação do professor para crédito das moedas.');
    setActiveActivity(null);
    syncData();
  }

  function handleCreateMission(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !q1Text.trim()) {
      toast.error('Informe o título e ao menos a 1ª questão da atividade.');
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

    addActivity({
      title: title.trim(),
      subject: subject.trim(),
      teacherName: getStoredDemoUser()?.name ?? 'Profª. Ana Paula',
      className: className.trim(),
      description:
        description.trim() ||
        'Responda às questões propostas e envie para validação do professor.',
      rewardAmount: Number(rewardAmount) || 30,
      deadline: deadline.trim() || 'Próxima aula',
      questions,
    });

    toast.success('Atividade / Missão publicada para os alunos!');
    setTitle('');
    setDescription('');
    setQ1Text('');
    setQ1Options('');
    setQ2Text('');
    syncData();
  }

  function handleQuickValidate(sub: ActivitySubmission, approve: boolean) {
    validateStudentSubmission({
      submissionId: sub.id,
      approve,
      teacherName: getStoredDemoUser()?.name ?? 'Profª. Ana Paula',
    });
    if (approve) {
      toast.success(`Validado! +${sub.rewardAmount} JM$ creditados para ${sub.studentName}.`);
    } else {
      toast.info(`Revisão solicitada para ${sub.studentName}.`);
    }
    syncData();
  }

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <Badge variant="default" className="mb-2">Gamificação Pedagógica</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Missões, Atividades & Desafios</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          {canCreateMission
            ? 'Crie atividades com questões e valide as submissões dos alunos para liberar moedas JM$.'
            : 'Responda às questões das atividades dos seus professores e acumule moedas JM$ após a validação.'}
        </p>
      </div>

      {/* Teacher Validation Banner if there are pending submissions */}
      {canCreateMission && pendingSubmissions.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/40 overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Submissões Pendentes de Validação ({pendingSubmissions.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Aprove as respostas dos alunos para creditar automaticamente as moedas na carteira.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-3">
            {pendingSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-slate-900">
                      {sub.studentName} ({sub.studentClass}) — {sub.activityTitle}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500">Enviado em: {sub.submittedAt}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5 px-3"
                      onClick={() => handleQuickValidate(sub, true)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Validar & Creditar +{sub.rewardAmount} JM$
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 text-xs py-1.5 px-3"
                      onClick={() => handleQuickValidate(sub, false)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Recusar
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  {sub.answers.map((a) => (
                    <div key={a.questionId} className="text-xs bg-slate-50 rounded p-2">
                      <span className="font-semibold text-slate-700">{a.questionText}</span>
                      <p className="text-blue-800 font-medium mt-0.5 break-words">Resposta: {a.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section className={`grid grid-cols-1 ${canCreateMission ? 'lg:grid-cols-3' : ''} gap-5 sm:gap-6`}>
        {/* Activities List */}
        <div className={`${canCreateMission ? 'lg:col-span-2' : ''} space-y-3.5 sm:space-y-4`}>
          {activities.map((act) => {
            const mySub = submissions.find(
              (s) => s.activityId === act.id && s.studentId === CURRENT_STUDENT.id
            );

            return (
              <Card key={act.id} className="overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <Badge variant="secondary" className="text-[11px] sm:text-xs">{act.subject}</Badge>
                      <span className="text-[11px] sm:text-xs text-slate-500">
                        {act.teacherName} · {act.className}
                      </span>
                      <Badge variant="success" className="text-[11px] sm:text-xs">+{act.rewardAmount} JM$</Badge>
                    </div>
                    <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900">{act.title}</h3>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">{act.description}</p>
                    <p className="text-[11px] sm:text-xs font-medium text-slate-500">
                      {act.questions.length} questões · Prazo: {act.deadline}
                    </p>
                  </div>

                  {role === 'student' && (
                    <div className="shrink-0 flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      {mySub?.status === 'pending' && (
                        <Badge variant="warning" className="self-start sm:self-auto text-[11px]">Aguardando Validação</Badge>
                      )}
                      {mySub?.status === 'approved' && (
                        <Badge variant="success" className="self-start sm:self-auto text-[11px]">Validada (+{act.rewardAmount} JM$)</Badge>
                      )}
                      {mySub?.status === 'rejected' && (
                        <Badge variant="destructive" className="self-start sm:self-auto text-[11px]">Revisão Solicitada</Badge>
                      )}
                      <Button
                        size="sm"
                        variant={mySub ? 'outline' : 'default'}
                        onClick={() => openAnswerModal(act)}
                        className="w-full sm:w-auto text-xs"
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {mySub ? 'Ver / Editar Respostas' : 'Responder Questões'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Create Activity Form for Teacher / Coordinator / Admin */}
        {canCreateMission && (
          <Card className="h-fit overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                Criar Atividade com Questões
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Exclusivo para Professores, Coordenação e Diretoria</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              <form onSubmit={handleCreateMission} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Título da Atividade</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Desafio de Matemática Financeira"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Disciplina</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Recompensa (JM$)</label>
                    <Input
                      type="number"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">1ª Questão (Obrigatória)</label>
                  <Input
                    value={q1Text}
                    onChange={(e) => setQ1Text(e.target.value)}
                    placeholder="Digite a pergunta..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Alternativas da 1ª Questão (separadas por vírgula ou vazio para aberta)
                  </label>
                  <Input
                    value={q1Options}
                    onChange={(e) => setQ1Options(e.target.value)}
                    placeholder="Ex.: 10 JM$, 20 JM$, 30 JM$"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    2ª Questão Discursiva (Opcional)
                  </label>
                  <Input
                    value={q2Text}
                    onChange={(e) => setQ2Text(e.target.value)}
                    placeholder="Digite uma pergunta aberta..."
                  />
                </div>

                <Button type="submit" className="w-full">
                  Publicar Atividade
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Student Questionnaire Modal */}
      {activeActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4 sm:p-6 shadow-xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
              <div className="min-w-0">
                <Badge variant="secondary" className="mb-1 text-[11px] sm:text-xs">
                  {activeActivity.subject} · +{activeActivity.rewardAmount} JM$
                </Badge>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 break-words">{activeActivity.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveActivity(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-4">
              {activeActivity.questions.map((q) => (
                <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4 space-y-2.5">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900">{q.question}</p>
                  {q.options && q.options.length > 0 ? (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm cursor-pointer hover:border-blue-400 transition-colors"
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          />
                          <span className="text-slate-800">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Escreva sua resposta..."
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-base sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  )}
                </div>
              ))}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Observação (opcional)</label>
                <Input
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="Comentário opcional sobre sua resolução"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setActiveActivity(null)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-1.5" />
                  Enviar Submissão
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
