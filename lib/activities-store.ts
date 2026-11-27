export interface ActivityQuestion {
  id: string;
  question: string;
  options?: string[];
  correctOption?: string;
}

export interface TeacherActivity {
  id: string;
  title: string;
  subject: string;
  teacherName: string;
  className: string;
  description: string;
  rewardAmount: number;
  deadline: string;
  questions: ActivityQuestion[];
  createdAt: string;
}

export interface ActivitySubmission {
  id: string;
  activityId: string;
  activityTitle: string;
  subject: string;
  rewardAmount: number;
  studentId: string;
  studentName: string;
  studentEnrollment: string;
  studentClass: string;
  answers: { questionId: string; questionText: string; answer: string }[];
  studentNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  validatedAt?: string;
  validatedBy?: string;
  teacherFeedback?: string;
}

export interface WalletMovement {
  id: string;
  type: 'credit' | 'bonus' | 'award' | 'debit' | 'reversal';
  label: string;
  amount: number;
  description: string;
  operator: string;
  timestamp: string;
}

export interface StudentWalletState {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  movements: WalletMovement[];
}

const ACTIVITIES_KEY = 'jmbank_activities_v1';
const SUBMISSIONS_KEY = 'jmbank_submissions_v1';
const WALLET_KEY = 'jmbank_student_wallet_v1';

export const DEFAULT_ACTIVITIES: TeacherActivity[] = [
  {
    id: 'act-101',
    title: 'Quiz de Educação Financeira & Juros Simples',
    subject: 'Matemática',
    teacherName: 'Profª. Ana Paula',
    className: '9º Ano A',
    description:
      'Responda às questões sobre planejamento financeiro e cálculo de porcentagem para conquistar moedas JM$.',
    rewardAmount: 50,
    deadline: 'Até Sexta-feira',
    createdAt: '07/11/2026',
    questions: [
      {
        id: 'q1',
        question: '1. Se você poupar 20 JM$ por semana durante 4 semanas, qual será o total acumulado?',
        options: ['40 JM$', '60 JM$', '80 JM$', '100 JM$'],
        correctOption: '80 JM$',
      },
      {
        id: 'q2',
        question: '2. Um caderno na loja escolar custa 100 JM$ e está com 15% de desconto à vista. Qual o valor final?',
        options: ['75 JM$', '85 JM$', '90 JM$', '95 JM$'],
        correctOption: '85 JM$',
      },
      {
        id: 'q3',
        question: '3. Explique com suas palavras por que é importante guardar parte das moedas antes de realizar um resgate:',
      },
    ],
  },
  {
    id: 'act-102',
    title: 'Atividade de Interpretação: Consumo Consciente',
    subject: 'Língua Portuguesa',
    teacherName: 'Profª. Camila Rocha',
    className: '9º Ano A',
    description:
      'Analise a diferença entre necessidade e desejo de consumo no cotidiano escolar.',
    rewardAmount: 40,
    deadline: 'Até dia 15/11',
    createdAt: '06/11/2026',
    questions: [
      {
        id: 'q1',
        question: '1. Qual das opções abaixo representa um item de necessidade escolar prioritária?',
        options: [
          'Material didático para estudo',
          'Adesivos colecionáveis',
          'Chaveiro decorativo',
        ],
        correctOption: 'Material didático para estudo',
      },
      {
        id: 'q2',
        question: '2. Escreva um exemplo de meta que você deseja alcançar economizando suas moedas JM$:',
      },
    ],
  },
  {
    id: 'act-103',
    title: 'Desafio de Ciências: Sustentabilidade na Escola',
    subject: 'Ciências',
    teacherName: 'Prof. Ricardo Gomes',
    className: '9º Ano A',
    description:
      'Proponha ações práticas para reduzir o desperdício de materiais e energia na nossa turma.',
    rewardAmount: 60,
    deadline: 'Até dia 20/11',
    createdAt: '05/11/2026',
    questions: [
      {
        id: 'q1',
        question: '1. Qual atitude contribui diretamente para a sustentabilidade na sala de aula?',
        options: [
          'Deixar luzes acesas no recreio',
          'Separar papel e plástico para reciclagem',
          'Desperdiçar folhas do caderno',
        ],
        correctOption: 'Separar papel e plástico para reciclagem',
      },
      {
        id: 'q2',
        question: '2. Descreva uma ideia ecológica para implementarmos na turma:',
      },
    ],
  },
];

export const DEFAULT_SUBMISSIONS: ActivitySubmission[] = [
  {
    id: 'sub-201',
    activityId: 'act-102',
    activityTitle: 'Atividade de Interpretação: Consumo Consciente',
    subject: 'Língua Portuguesa',
    rewardAmount: 40,
    studentId: 'stu-2',
    studentName: 'Beatriz Santos',
    studentEnrollment: '20260018',
    studentClass: '9º Ano A',
    answers: [
      {
        questionId: 'q1',
        questionText: '1. Qual das opções abaixo representa um item de necessidade escolar prioritária?',
        answer: 'Material didático para estudo',
      },
      {
        questionId: 'q2',
        questionText: '2. Escreva um exemplo de meta que você deseja alcançar economizando suas moedas JM$:',
        answer: 'Quero juntar moedas para resgatar o Caderno Universitário Personalizado e o Kit de Canetas.',
      },
    ],
    studentNotes: 'Atividade concluída após leitura do texto em sala.',
    status: 'pending',
    submittedAt: 'Hoje, 11:20',
  },
];

export const DEFAULT_WALLET: StudentWalletState = {
  balance: 340,
  totalEarned: 520,
  totalSpent: 180,
  movements: [
    {
      id: 'MOV-904',
      type: 'credit',
      label: 'Crédito de Moedas',
      amount: 50,
      description: 'Missão concluída: Desafio de Matemática',
      operator: 'Profª. Ana Paula',
      timestamp: '07/11/2026 10:30',
    },
    {
      id: 'MOV-903',
      type: 'bonus',
      label: 'Bonificação',
      amount: 30,
      description: 'Frequência 100% na semana',
      operator: 'Coord. Marcos Souza',
      timestamp: '06/11/2026 16:00',
    },
    {
      id: 'MOV-902',
      type: 'debit',
      label: 'Débito por Resgate',
      amount: -80,
      description: 'Resgate: Ingresso Cinema Escolar',
      operator: 'Tesouraria',
      timestamp: '04/11/2026 14:15',
    },
    {
      id: 'MOV-901',
      type: 'award',
      label: 'Premiação',
      amount: 100,
      description: '1º Lugar na Feira de Ciências',
      operator: 'Diretora Helena Costa',
      timestamp: '01/11/2026 11:00',
    },
  ],
};

function notifyStoreUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('jmbank-store-update'));
  }
}

export function getActivities(): TeacherActivity[] {
  if (typeof window === 'undefined') return DEFAULT_ACTIVITIES;
  try {
    const raw = localStorage.getItem(ACTIVITIES_KEY);
    if (!raw) {
      localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(DEFAULT_ACTIVITIES));
      return DEFAULT_ACTIVITIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ACTIVITIES;
  }
}

export function addActivity(activity: Omit<TeacherActivity, 'id' | 'createdAt'>): TeacherActivity {
  const current = getActivities();
  const created: TeacherActivity = {
    ...activity,
    id: `act-${Date.now()}`,
    createdAt: new Date().toLocaleDateString('pt-BR'),
  };
  const updated = [created, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(updated));
    notifyStoreUpdate();
  }
  return created;
}

export function getSubmissions(): ActivitySubmission[] {
  if (typeof window === 'undefined') return DEFAULT_SUBMISSIONS;
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    if (!raw) {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(DEFAULT_SUBMISSIONS));
      return DEFAULT_SUBMISSIONS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SUBMISSIONS;
  }
}

export function submitStudentActivity(
  payload: Omit<ActivitySubmission, 'id' | 'status' | 'submittedAt'>
): ActivitySubmission {
  const current = getSubmissions();
  const submission: ActivitySubmission = {
    ...payload,
    id: `sub-${Date.now()}`,
    status: 'pending',
    submittedAt: new Date().toLocaleString('pt-BR'),
  };
  const updated = [submission, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
    notifyStoreUpdate();
  }
  return submission;
}

export function getStudentWallet(): StudentWalletState {
  if (typeof window === 'undefined') return DEFAULT_WALLET;
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (!raw) {
      localStorage.setItem(WALLET_KEY, JSON.stringify(DEFAULT_WALLET));
      return DEFAULT_WALLET;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_WALLET;
  }
}

export function recordWalletTransaction(params: {
  type: WalletMovement['type'];
  label: string;
  amount: number;
  description: string;
  operator: string;
}): StudentWalletState {
  const wallet = getStudentWallet();
  const signedAmount = params.amount;
  const newBalance = wallet.balance + signedAmount;
  const newEarned = signedAmount > 0 ? wallet.totalEarned + signedAmount : wallet.totalEarned;
  const newSpent = signedAmount < 0 ? wallet.totalSpent + Math.abs(signedAmount) : wallet.totalSpent;

  const newMovement: WalletMovement = {
    id: `MOV-${Math.floor(100 + Math.random() * 900)}`,
    type: params.type,
    label: params.label,
    amount: signedAmount,
    description: params.description,
    operator: params.operator,
    timestamp: new Date().toLocaleString('pt-BR'),
  };

  const updated: StudentWalletState = {
    balance: newBalance,
    totalEarned: newEarned,
    totalSpent: newSpent,
    movements: [newMovement, ...wallet.movements],
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(WALLET_KEY, JSON.stringify(updated));
    notifyStoreUpdate();
  }
  return updated;
}

export function validateStudentSubmission(params: {
  submissionId: string;
  approve: boolean;
  teacherName: string;
  feedback?: string;
}): { submission: ActivitySubmission | null; wallet: StudentWalletState } {
  const submissions = getSubmissions();
  let target: ActivitySubmission | null = null;

  const updated = submissions.map((sub) => {
    if (sub.id !== params.submissionId) return sub;
    if (sub.status === 'approved') {
      target = sub;
      return sub;
    }
    target = {
      ...sub,
      status: params.approve ? 'approved' : 'rejected',
      validatedAt: new Date().toLocaleString('pt-BR'),
      validatedBy: params.teacherName,
      teacherFeedback:
        params.feedback ||
        (params.approve
          ? 'Respostas validadas com sucesso! Moedas creditadas na carteira.'
          : 'Submissão revisada pelo professor. Verifique as orientações.'),
    };
    return target;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
  }

  let wallet = getStudentWallet();
  if (target && params.approve && (target as ActivitySubmission).status === 'approved') {
    const approvedSub = target as ActivitySubmission;
    wallet = recordWalletTransaction({
      type: 'credit',
      label: 'Crédito – Atividade Validada',
      amount: approvedSub.rewardAmount,
      description: `Atividade validada: ${approvedSub.activityTitle} (${approvedSub.studentName})`,
      operator: params.teacherName,
    });
  } else {
    notifyStoreUpdate();
  }

  return { submission: target, wallet };
}

