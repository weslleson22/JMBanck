import { promises as fs } from 'fs';
import path from 'path';
import type { SchoolStructureDb } from './school-types';

const DATA_DIR = path.join(process.cwd(), 'data');
const STRUCTURE_DB_FILE = path.join(DATA_DIR, 'school-structure.json');

export const DEFAULT_SCHOOL_STRUCTURE_DB: SchoolStructureDb = {
  schools: [
    {
      id: 'esc-alpha',
      name: 'Colégio Estadual Educa Mais Alpha',
      code: 'INEP-21048290',
      city: 'São Luís - MA',
      academic_year: '2026',
      director_name: 'Helena Costa',
      status: 'active',
      created_at: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 'esc-beta',
      name: 'Unidade Integrada JM Beta',
      code: 'INEP-21059142',
      city: 'Imperatriz - MA',
      academic_year: '2026',
      director_name: 'Marcos Vinícius',
      status: 'active',
      created_at: '2026-01-12T08:00:00.000Z',
    },
  ],
  gradeLevels: [
    {
      id: 'gl-1',
      name: '8º Ano - Ensino Fundamental II',
      stage: 'Ensino Fundamental II',
      order_index: 8,
      description: 'Penúltimo ano do Ensino Fundamental II com foco em matemática financeira básica.',
      status: 'active',
      created_at: '2026-01-10T08:05:00.000Z',
    },
    {
      id: 'gl-2',
      name: '9º Ano - Ensino Fundamental II',
      stage: 'Ensino Fundamental II',
      order_index: 9,
      description: 'Conclusão do Ensino Fundamental II com projetos interdisciplinares e missões JM$.',
      status: 'active',
      created_at: '2026-01-10T08:06:00.000Z',
    },
    {
      id: 'gl-3',
      name: '1º Ano - Ensino Médio',
      stage: 'Ensino Médio',
      order_index: 10,
      description: 'Ingresso no Ensino Médio com trilhas de empreendedorismo e educação financeira.',
      status: 'active',
      created_at: '2026-01-10T08:07:00.000Z',
    },
  ],
  classes: [
    {
      id: 'turma-9a',
      name: '9º Ano A - Matutino',
      grade_level_id: 'gl-2',
      school_id: 'esc-alpha',
      shift: 'Matutino',
      academic_year: '2026',
      room: 'Sala 104',
      capacity: 35,
      status: 'active',
      created_at: '2026-01-15T09:00:00.000Z',
    },
    {
      id: 'turma-8b',
      name: '8º Ano B - Matutino',
      grade_level_id: 'gl-1',
      school_id: 'esc-alpha',
      shift: 'Matutino',
      academic_year: '2026',
      room: 'Sala 102',
      capacity: 32,
      status: 'active',
      created_at: '2026-01-15T09:10:00.000Z',
    },
    {
      id: 'turma-1em',
      name: '1º Ano EM - Integral',
      grade_level_id: 'gl-3',
      school_id: 'esc-beta',
      shift: 'Integral',
      academic_year: '2026',
      room: 'Sala 201',
      capacity: 40,
      status: 'active',
      created_at: '2026-01-15T09:20:00.000Z',
    },
  ],
  teachers: [
    {
      id: 'prof-1',
      name: 'Profª. Ana Paula',
      email: 'ana.paula@jmbank.edu.br',
      subject: 'Matemática',
      classes_linked: '9º Ano A - Matutino, 8º Ano B - Matutino',
      school_id: 'esc-alpha',
      phone: '(98) 98811-2233',
      status: 'active',
      created_at: '2026-01-16T08:00:00.000Z',
    },
    {
      id: 'prof-2',
      name: 'Prof. Ricardo Gomes',
      email: 'ricardo.gomes@jmbank.edu.br',
      subject: 'História & Geografia',
      classes_linked: '9º Ano A - Matutino, 1º Ano EM - Integral',
      school_id: 'esc-alpha',
      phone: '(98) 98844-5566',
      status: 'active',
      created_at: '2026-01-16T08:15:00.000Z',
    },
    {
      id: 'prof-3',
      name: 'Profª. Camila Rocha',
      email: 'camila.rocha@jmbank.edu.br',
      subject: 'Língua Portuguesa',
      classes_linked: '8º Ano B - Matutino, 1º Ano EM - Integral',
      school_id: 'esc-beta',
      phone: '(98) 98777-8899',
      status: 'active',
      created_at: '2026-01-16T08:30:00.000Z',
    },
  ],
  students: [
    {
      id: 'stu-1',
      name: 'Lucas Oliveira',
      enrollment_number: '20260014',
      class_id: 'turma-9a',
      class_name: '9º Ano A - Matutino',
      guardian_name: 'Roberto Oliveira',
      guardian_contact: '(98) 99102-3344',
      birth_date: '2011-05-14',
      status: 'active',
      lgpd_consent: true,
      created_at: '2026-01-20T10:00:00.000Z',
    },
    {
      id: 'stu-2',
      name: 'Beatriz Santos',
      enrollment_number: '20260018',
      class_id: 'turma-9a',
      class_name: '9º Ano A - Matutino',
      guardian_name: 'Fernanda Santos',
      guardian_contact: '(98) 99145-6677',
      birth_date: '2011-09-22',
      status: 'active',
      lgpd_consent: true,
      created_at: '2026-01-20T10:15:00.000Z',
    },
    {
      id: 'stu-3',
      name: 'Gabriel Ferreira',
      enrollment_number: '20260022',
      class_id: 'turma-8b',
      class_name: '8º Ano B - Matutino',
      guardian_name: 'André Ferreira',
      guardian_contact: '(98) 99211-8899',
      birth_date: '2012-02-11',
      status: 'active',
      lgpd_consent: true,
      created_at: '2026-01-20T10:30:00.000Z',
    },
    {
      id: 'stu-4',
      name: 'Mariana Costa',
      enrollment_number: '20260029',
      class_id: 'turma-8b',
      class_name: '8º Ano B - Matutino',
      guardian_name: 'Patrícia Costa',
      guardian_contact: '(98) 99288-1122',
      birth_date: '2012-07-03',
      status: 'active',
      lgpd_consent: true,
      created_at: '2026-01-20T10:45:00.000Z',
    },
    {
      id: 'stu-5',
      name: 'Pedro Henrique Lima',
      enrollment_number: '20260035',
      class_id: 'turma-1em',
      class_name: '1º Ano EM - Integral',
      guardian_name: 'Cláudio Lima',
      guardian_contact: '(98) 99344-5500',
      birth_date: '2010-11-18',
      status: 'active',
      lgpd_consent: true,
      created_at: '2026-01-21T08:00:00.000Z',
    },
    {
      id: 'stu-6',
      name: 'Júlia Almeida',
      enrollment_number: '20260041',
      class_id: 'turma-1em',
      class_name: '1º Ano EM - Integral',
      guardian_name: 'Renata Almeida',
      guardian_contact: '(98) 99399-4411',
      birth_date: '2010-08-29',
      status: 'transferred',
      lgpd_consent: true,
      created_at: '2026-01-21T08:30:00.000Z',
    },
  ],
};

export async function readSchoolStructureDb(): Promise<SchoolStructureDb> {
  try {
    const content = await fs.readFile(STRUCTURE_DB_FILE, 'utf-8');
    const parsed = JSON.parse(content) as Partial<SchoolStructureDb>;
    return {
      schools: Array.isArray(parsed.schools) ? parsed.schools : DEFAULT_SCHOOL_STRUCTURE_DB.schools,
      gradeLevels: Array.isArray(parsed.gradeLevels)
        ? parsed.gradeLevels
        : DEFAULT_SCHOOL_STRUCTURE_DB.gradeLevels,
      classes: Array.isArray(parsed.classes) ? parsed.classes : DEFAULT_SCHOOL_STRUCTURE_DB.classes,
      teachers: Array.isArray(parsed.teachers)
        ? parsed.teachers
        : DEFAULT_SCHOOL_STRUCTURE_DB.teachers,
      students: Array.isArray(parsed.students)
        ? parsed.students
        : DEFAULT_SCHOOL_STRUCTURE_DB.students,
    };
  } catch {
    await writeSchoolStructureDb(DEFAULT_SCHOOL_STRUCTURE_DB);
    return structuredClone(DEFAULT_SCHOOL_STRUCTURE_DB);
  }
}

export async function writeSchoolStructureDb(data: SchoolStructureDb): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STRUCTURE_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
