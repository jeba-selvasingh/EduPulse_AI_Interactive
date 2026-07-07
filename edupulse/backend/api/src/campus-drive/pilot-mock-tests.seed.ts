import type { MockTestEntry, MockTestTrendPoint } from './mock-test.schema';

export const MOCK_RESULTS_SLA_HOURS = 2;

export const PILOT_SCORE_TREND: MockTestTrendPoint[] = [
  { label: 'M1', batchAvgScore: 51, barPercent: 51, color: '#F09595' },
  { label: 'M2', batchAvgScore: 56, barPercent: 56, color: '#FAC775' },
  { label: 'M3', batchAvgScore: 60, barPercent: 60, color: '#FAC775' },
  { label: 'M4', batchAvgScore: 64, barPercent: 64, color: '#AFA9EC' },
];

export const PILOT_MOCK_SCHEDULE: MockTestEntry[] = [
  {
    mockId: 'mock-4',
    mockNumber: 4,
    title: 'Mock 4 · 5 Aug · TCS pattern',
    dateLabel: '5 Aug',
    patternLabel: 'TCS pattern',
    status: 'done',
    statusLabel: 'Done · avg 64',
    description: '78 students took · 31 above benchmark · top scorer: Divya S (89)',
    participantsCount: 78,
    batchAvgScore: 64,
    aboveBenchmarkCount: 31,
    topScorerName: 'Divya S',
    topScorerScore: 89,
  },
  {
    mockId: 'mock-5',
    mockNumber: 5,
    title: 'Mock 5 · 12 Aug · Infosys pattern',
    dateLabel: '12 Aug',
    patternLabel: 'Infosys pattern',
    status: 'upcoming',
    statusLabel: 'Upcoming',
    description: '89 registered · focus: verbal + email writing · register by 10 Aug',
    registeredCount: 89,
    registrationDeadlineLabel: '10 Aug',
    canRegister: true,
    highlighted: true,
  },
  {
    mockId: 'mock-6',
    mockNumber: 6,
    title: 'Mock 6 · 19 Aug · Wipro pattern',
    dateLabel: '19 Aug',
    patternLabel: 'Wipro pattern',
    status: 'open',
    statusLabel: 'Open',
    description: 'Essay writing + English · essay topic announced day before',
    canRegister: true,
  },
  {
    mockId: 'mock-7',
    mockNumber: 7,
    title: 'Mock 7 · 26 Aug · Accenture',
    dateLabel: '26 Aug',
    patternLabel: 'Accenture',
    status: 'open',
    statusLabel: 'Open',
    description: 'Cognitive ability + attention to detail · 55 min',
    durationMinutes: 55,
    canRegister: true,
  },
];

export const PILOT_NEXT_MOCK = {
  mockId: 'mock-next-tcs',
  title: 'Next mock · TCS NQT pattern',
  scheduleLabel: 'Sat 10am',
  description:
    '90 min · Quant 26 + Logical 24 + Verbal 24 + Coding 26 · auto-graded · results in 2 hrs',
  autoGraded: true,
  resultsSlaHours: MOCK_RESULTS_SLA_HOURS,
};
