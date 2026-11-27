'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet,
  Flag,
  Award,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
  Trophy,
  BookOpen,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  getActivities,
  getSubmissions,
  getStudentWallet,
  submitStudentActivity,
  type TeacherActivity,
  type ActivitySubmission,
  type StudentWalletState,
  DEFAULT_WALLET,
} from '@/lib/activities-store';

const STUDENT_INFO = {
  id: 'stu-1',
  name: 'Lucas Oliveira',
  enrollment: '20260014',
  className: '9º Ano A',
  rankPosition: 2,
  achievements: [
    'Poupador Ouro',
    '10 Missões Concluídas',
    'Frequência Exemplar',
    'Destaque em Ciências',
  ],
};

export default function StudentDashboardPage() {
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [wallet, setWallet] = useState<StudentWalletState>(DEFAULT_WALLET);

  // Active activity being answered or viewed
  const [activeActivity, setActiveActivity] = useState<TeacherActivity | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [studentNotes, setStudentNotes] = useState('');

  const syncData = () => {
    setActivities(getActivities());
    setSubmissions(getSubmissions());
    setWallet(getStudentWallet());
  };

  useEffect(() => {
    syncData();
    window.addEventListener('jmbank-store-update', syncData);
    return () => window.removeEventListener('jmbank-store-update', syncData);
  }, []);

  function openActivityModal(act: TeacherActivity) {
    const existing = submissions.find(
      (s) => s.activityId === act.id && s.studentId === STUDENT_INFO.id
    );
    const initialAnswers: Record<string, string> = {};
    if (existing) {
      existing.answers.forEach((a) => {
        initialAnswers[a.questionId] = a.answer;
      });
      setStudentNotes(existing.studentNotes ?? '');
    } else {
      setStudentNotes('');
    }
    setAnswers(initialAnswers);
    setActiveActivity(act);
  }

  function handleAnswerChange(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmitActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activeActivity) return;

    for (const q of activeActivity.questions) {
      if (!answers[q.id] || !answers[q.id].trim()) {
        toast.error('Por favor, responda todas as questões antes de enviar.');
        return;
      }
    }

    const formattedAnswers = activeActivity.questions.map((q) => ({
      questionId: q.id,
      questionText: q.question,
      answer: answers[q.id].trim(),
    }));

    submitStudentActivity({
      activityId: activeActivity.id,
      activityTitle: activeActivity.title,
      subject: activeActivity.subject,
      rewardAmount: activeActivity.rewardAmount,
      studentId: STUDENT_INFO.id,
      studentName: STUDENT_INFO.name,
      studentEnrollment: STUDENT_INFO.enrollment,
      studentClass: STUDENT_INFO.className,
      answers: formattedAnswers,
      studentNotes: studentNotes.trim() || undefined,
    });

    toast.success(
      'Atividade enviada com sucesso! Assim que o professor validar, suas moedas serão creditadas.'
    );
    setActiveActivity(null);
    syncData();
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <Badge variant="default" className="mb-1.5 sm:mb-2">Painel do Estudante</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Olá, {STUDENT_INFO.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Matrícula: <span className="font-mono font-medium text-slate-700">{STUDENT_INFO.enrollment}</span> · Turma: <strong className="font-semibold text-slate-700">{STUDENT_INFO.className}</strong>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link
            href="/wallets"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs tabular-nums"
          >
            <Wallet className="h-4 w-4" />
            Minha Carteira ({wallet.balance.toLocaleString('pt-BR')} JM$)
          </Link>
          <Link
            href="/rewards"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Gift className="h-4 w-4" />
            Catálogo de Recompensas
          </Link>
        </div>
      </div>

      {/* Wallet KPIs - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold text-blue-100 uppercase tracking-wider">
              Saldo Disponível
            </p>
            <p className="font-numeric text-xl sm:text-3xl font-extrabold tracking-tight mt-1">
              {wallet.balance.toLocaleString('pt-BR')} JM$
            </p>
            <p className="text-[11px] text-blue-100/90 mt-1.5 sm:mt-2 truncate">
              Atualizado automaticamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Recebido
            </p>
            <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-600 mt-1">
              +{wallet.totalEarned.toLocaleString('pt-BR')} JM$
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">
              Em atividades e bônus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Utilizado
            </p>
            <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-amber-600 mt-1">
              -{wallet.totalSpent.toLocaleString('pt-BR')} JM$
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">
              Em resgates na loja
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ranking na Turma
              </p>
              <p className="font-numeric text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
                #{STUDENT_INFO.rankPosition}º Lugar
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 truncate">
                {STUDENT_INFO.className}
              </p>
            </div>
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Teacher Activities & Questionnaires Section */}
      <section className="space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 shrink-0" />
            Atividades & Questões dos Professores
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            Responda às questões e envie sua submissão. Após a validação do professor, o crédito cai
            direto na sua carteira!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {activities.map((act) => {
            const mySub = submissions.find(
              (s) => s.activityId === act.id && s.studentId === STUDENT_INFO.id
            );

            return (
              <Card
                key={act.id}
                className="flex flex-col justify-between border-slate-200 hover:border-blue-300 transition-all"
              >
                <CardHeader className="space-y-2.5 sm:space-y-3 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{act.subject}</Badge>
                    <Badge variant="success">+{act.rewardAmount} JM$</Badge>
                  </div>

                  <CardTitle className="text-sm sm:text-base leading-snug">{act.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed line-clamp-3">
                    {act.description}
                  </CardDescription>

                  <div className="pt-2 text-xs text-slate-500 space-y-1 border-t border-slate-100">
                    <p className="truncate">
                      <strong>Professor(a):</strong> {act.teacherName}
                    </p>
                    <p>
                      <strong>Prazo:</strong> {act.deadline} ·{' '}
                      <strong>{act.questions.length} questões</strong>
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5">
                  {mySub ? (
                    <div className="space-y-2">
                      {mySub.status === 'pending' && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <span className="leading-snug">
                            <strong>Submetida!</strong> Aguardando validação do professor para liberar{' '}
                            <strong>+{act.rewardAmount} JM$</strong>.
                          </span>
                        </div>
                      )}
                      {mySub.status === 'approved' && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>Validada! +{act.rewardAmount} JM$ creditados</span>
                          </div>
                          {mySub.teacherFeedback && (
                            <p className="text-[11px] text-emerald-700 leading-snug">{mySub.teacherFeedback}</p>
                          )}
                        </div>
                      )}
                      {mySub.status === 'rejected' && (
                        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                            <span>Revisão solicitada pelo professor</span>
                          </div>
                          {mySub.teacherFeedback && (
                            <p className="text-[11px] text-red-700 leading-snug">{mySub.teacherFeedback}</p>
                          )}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => openActivityModal(act)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        {mySub.status === 'rejected' ? 'Corrigir e Reenviar' : 'Ver Minhas Respostas'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openActivityModal(act)}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Responder Questões & Submeter
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Bottom Grid: Statement & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base sm:text-lg">Extrato Recente da Carteira</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Histórico auditável de créditos e resgates
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5 sm:space-y-3">
            {wallet.movements.slice(0, 6).map((tx) => (
              <div
                key={tx.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full shrink-0 ${
                      tx.amount >= 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {tx.amount >= 0 ? (
                      <ArrowDownLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                      {tx.description}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      {tx.operator} · {tx.timestamp}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-numeric text-xs sm:text-sm font-bold shrink-0 self-end sm:self-center ${
                    tx.amount >= 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} JM$
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
              Minhas Conquistas
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Medalhas desbloqueadas pelo seu engajamento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 flex flex-wrap gap-1.5 sm:gap-2">
            {STUDENT_INFO.achievements.map((ach) => (
              <Badge key={ach} variant="default" className="px-2.5 sm:px-3 py-1 text-xs">
                🏅 {ach}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Modal for Answering Activity Questions */}
      {activeActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4 sm:p-6 sm:p-8 shadow-xl space-y-4 sm:space-y-6 my-4 sm:my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                  <Badge variant="secondary">{activeActivity.subject}</Badge>
                  <Badge variant="success">+{activeActivity.rewardAmount} JM$</Badge>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {activeActivity.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Professor(a): {activeActivity.teacherName} · Turma: {activeActivity.className}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveActivity(null)}
                aria-label="Fechar"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitActivity} className="space-y-4 sm:space-y-5">
              {activeActivity.questions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 space-y-2.5 sm:space-y-3"
                >
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                    {q.question}
                  </p>

                  {q.options && q.options.length > 0 ? (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors ${
                            answers[q.id] === opt
                              ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-medium'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => handleAnswerChange(q.id, opt)}
                            className="h-4 w-4 text-blue-600 shrink-0"
                          />
                          <span className="leading-snug">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Digite sua resposta aqui..."
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-base sm:text-sm text-slate-900 leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}
                </div>
              ))}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Observações ou comentários adicionais (opcional)
                </label>
                <Input
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="Ex.: Realizei os cálculos e anotei no caderno."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveActivity(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  <Send className="h-4 w-4 mr-1.5" />
                  Enviar Submissão para Validação
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
