import type { BloomLevelStatus } from './concept-diagnosis.schema';

export type PilotConceptSeed = {
  conceptId: string;
  name: string;
  masteryPercent: number;
  bloomLevel: number;
  evidence: string;
};

export type PilotSubjectConceptSeed = {
  courseCode: string;
  courseName: string;
  examType: string;
  concepts: PilotConceptSeed[];
  bloomLevels: Array<{ level: number; status: BloomLevelStatus }>;
  aiDiagnosis: {
    summary: string;
    evidenceRefs: string[];
    trustCardId?: string;
  };
};

export const PILOT_BCS301_CONCEPT_MAP: PilotSubjectConceptSeed = {
  courseCode: 'BCS301',
  courseName: 'DBMS',
  examType: 'IA-2',
  concepts: [
    {
      conceptId: 'er-modelling',
      name: 'ER modelling',
      masteryPercent: 84,
      bloomLevel: 2,
      evidence: 'IA-2 Q1 · ER diagram scored 8/10',
    },
    {
      conceptId: 'sql-queries',
      name: 'SQL queries',
      masteryPercent: 76,
      bloomLevel: 3,
      evidence: 'IA-2 Q3 · SQL joins scored 7/10',
    },
    {
      conceptId: 'normalization',
      name: 'Normalization',
      masteryPercent: 38,
      bloomLevel: 3,
      evidence: 'IA-2 Q2 · Normalize to 3NF scored 3/10',
    },
    {
      conceptId: 'transactions',
      name: 'Transactions',
      masteryPercent: 55,
      bloomLevel: 3,
      evidence: 'IA-1 transaction isolation quiz · 55%',
    },
    {
      conceptId: 'indexing',
      name: 'Indexing',
      masteryPercent: 61,
      bloomLevel: 3,
      evidence: 'IA-1 indexing drill · 61%',
    },
  ],
  bloomLevels: [
    { level: 1, status: 'pass' },
    { level: 2, status: 'pass' },
    { level: 3, status: 'fail' },
    { level: 4, status: 'untested' },
    { level: 5, status: 'untested' },
    { level: 6, status: 'untested' },
  ],
  aiDiagnosis: {
    summary:
      'Answers definition questions correctly but fails to decompose a given schema — an apply-level gap, not a knowledge gap.',
    evidenceRefs: [
      'IA-2 Q2 · Normalize to 3NF scored 3/10 (class avg 6.2/10)',
      'Normalization concept mastery 38% — below 40% intervention threshold',
    ],
    trustCardId: '10000000-0000-4000-8000-000000000003',
  },
};

export const PILOT_BCS302_CONCEPT_MAP: PilotSubjectConceptSeed = {
  courseCode: 'BCS302',
  courseName: 'Operating Systems',
  examType: 'IA-2',
  concepts: [
    {
      conceptId: 'process-scheduling',
      name: 'Process scheduling',
      masteryPercent: 72,
      bloomLevel: 3,
      evidence: 'IA-2 Q1 · FCFS vs SJF comparison scored 7/10',
    },
    {
      conceptId: 'memory-management',
      name: 'Memory management',
      masteryPercent: 68,
      bloomLevel: 3,
      evidence: 'IA-2 Q2 · paging diagram scored 6/10',
    },
    {
      conceptId: 'deadlocks',
      name: 'Deadlocks',
      masteryPercent: 58,
      bloomLevel: 4,
      evidence: 'IA-2 Q3 · Banker algorithm trace scored 5/10',
    },
  ],
  bloomLevels: [
    { level: 1, status: 'pass' },
    { level: 2, status: 'pass' },
    { level: 3, status: 'pass' },
    { level: 4, status: 'fail' },
    { level: 5, status: 'untested' },
    { level: 6, status: 'untested' },
  ],
  aiDiagnosis: {
    summary:
      'Solid recall on scheduling primitives; analysis tasks on deadlock avoidance need more practice.',
    evidenceRefs: ['IA-2 Q3 Banker trace lost marks on safety-sequence steps'],
  },
};

export const PILOT_BCS303_CONCEPT_MAP: PilotSubjectConceptSeed = {
  courseCode: 'BCS303',
  courseName: 'Computer Networks',
  examType: 'IA-2',
  concepts: [
    {
      conceptId: 'osi-model',
      name: 'OSI model',
      masteryPercent: 45,
      bloomLevel: 2,
      evidence: 'IA-2 Q1 · layer mapping scored 4/10',
    },
    {
      conceptId: 'routing',
      name: 'Routing',
      masteryPercent: 32,
      bloomLevel: 3,
      evidence: 'IA-2 Q2 · shortest path scored 3/10',
    },
    {
      conceptId: 'tcp-ip',
      name: 'TCP/IP',
      masteryPercent: 28,
      bloomLevel: 3,
      evidence: 'IA-1 vs IA-2 trend · TCP handshake 2/8',
    },
  ],
  bloomLevels: [
    { level: 1, status: 'pass' },
    { level: 2, status: 'fail' },
    { level: 3, status: 'fail' },
    { level: 4, status: 'untested' },
    { level: 5, status: 'untested' },
    { level: 6, status: 'untested' },
  ],
  aiDiagnosis: {
    summary:
      'Declining trend since IA-1 — foundational transport concepts are inconsistent across assessments.',
    evidenceRefs: [
      'IA-2 routing 32% mastery — highlighted below 40%',
      'TCP/IP handshake items missed in both IA-1 and IA-2',
    ],
  },
};

export const PILOT_CONCEPT_MAP_BY_COURSE: Record<string, PilotSubjectConceptSeed> = {
  BCS301: PILOT_BCS301_CONCEPT_MAP,
  BCS302: PILOT_BCS302_CONCEPT_MAP,
  BCS303: PILOT_BCS303_CONCEPT_MAP,
};

export const BCS304_CONCEPT_LABELS: Record<string, string> = {
  CO1: 'Linear structures',
  CO2: 'Sorting algorithms',
  CO3: 'Tree rotations',
  CO4: 'Graph algorithms',
  CO5: 'Program implementation',
};

export const BCS304_QUESTION_BLOOM: Record<string, number> = {
  Q1: 2,
  Q2: 3,
  Q3: 4,
};
