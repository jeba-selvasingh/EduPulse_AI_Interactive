export const PES_INSTITUTION_ID = '00000000-0000-4000-8000-000000000001';

export type RivalId = 'rival-a' | 'rival-b' | 'rival-c' | 'rival-d';

export const PILOT_RIVALS = [
  {
    id: 'rival-a' as const,
    name: 'Rival A Engg',
    nirfRank: 142,
    naacGrade: 'A+',
    placementPct: 84,
    placementProvenance: 'official' as const,
    nirfProvenance: 'official' as const,
    naacProvenance: 'official' as const,
  },
  {
    id: 'pes' as const,
    name: 'PES University',
    nirfRank: 168,
    naacGrade: 'A',
    placementPct: 78,
    placementProvenance: 'official' as const,
    nirfProvenance: 'official' as const,
    naacProvenance: 'official' as const,
    isSelf: true,
  },
  {
    id: 'rival-b' as const,
    name: 'Rival B Inst.',
    nirfRank: 171,
    naacGrade: 'A',
    placementPct: 76,
    placementProvenance: 'official' as const,
    nirfProvenance: 'official' as const,
    naacProvenance: 'official' as const,
  },
  {
    id: 'rival-c' as const,
    name: 'Rival C College',
    nirfRank: 195,
    naacGrade: 'B++',
    placementPct: 71,
    placementProvenance: 'official' as const,
    nirfProvenance: 'official' as const,
    naacProvenance: 'official' as const,
  },
  {
    id: 'rival-d' as const,
    name: 'Rival D Tech',
    nirfRank: null,
    naacGrade: 'B+',
    placementPct: 65,
    placementProvenance: 'claimed' as const,
    nirfProvenance: 'unavailable' as const,
    naacProvenance: 'official' as const,
  },
];

export const NIRF_DATA_YEAR = 2026;

export const NIRF_PARAMETERS = [
  { key: 'TLR', label: 'Teaching, Learning & Resources', definition: 'Student-faculty ratio, faculty qualifications, library spend' },
  { key: 'RP', label: 'Research & Professional Practice', definition: 'Publications, patents, research projects, PhD guidance' },
  { key: 'GO', label: 'Graduation Outcomes', definition: 'Placement, higher studies, entrepreneurship outcomes' },
  { key: 'OI', label: 'Outreach & Inclusivity', definition: 'Regional impact, diversity, financial support' },
  { key: 'PR', label: 'Perception', definition: 'Employer and academic peer perception scores' },
] as const;

export const PILOT_NIRF_SCORES: Record<string, Record<string, number>> = {
  pes: { TLR: 58, RP: 31, GO: 52, OI: 45, PR: 28 },
  'rival-a': { TLR: 55, RP: 44, GO: 61, OI: 48, PR: 33 },
};

export const PILOT_CUTOFF_TRACKER = {
  examLabel: 'KCET closing ranks · CSE',
  branch: 'CSE',
  trendDirection: 'slipping' as const,
  trendNarrative:
    'Slipping 2 years in a row · Rival A improved to 15.9k',
  signalNarrative:
    'Top applicants choosing Rival A — perception gap, not quality gap. Their placement claims rose 4.2→5.1 LPA this cycle.',
  pesTrend: [
    { year: 2024, closingRank: 18400, label: '18.4k' },
    { year: 2025, closingRank: 21200, label: '21.2k' },
    { year: 2026, closingRank: 23100, label: '23.1k' },
  ],
  comparisons: [
    { rivalId: 'pes' as const, label: 'PES CSE cutoff', closingRank: 23100, direction: 'down' as const },
    { rivalId: 'rival-a' as const, label: 'Rival A', closingRank: 15900, direction: 'up' as const },
    { rivalId: 'rival-b' as const, label: 'Rival B', closingRank: 24800, direction: 'flat' as const },
  ],
};

export type PilotFeedItem = {
  id: string;
  rivalId: RivalId;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceLabel: string;
  relativeTime: string;
  publishedAt: string;
};

export const PILOT_RIVAL_FEED: PilotFeedItem[] = [
  {
    id: '90000000-0000-4000-8000-000000000001',
    rivalId: 'rival-a',
    title: '🏫 Rival A launched AI & DS B.Tech',
    summary: '120 seats approved · competes with PES CSE intake · source: AICTE list',
    sourceUrl: 'https://www.aicte-india.org/',
    sourceLabel: 'AICTE list',
    relativeTime: '2 d',
    publishedAt: '2026-07-05T08:00:00.000Z',
  },
  {
    id: '90000000-0000-4000-8000-000000000002',
    rivalId: 'rival-b',
    title: '🏭 Rival B signed MoU with Bosch',
    summary: 'Centre of excellence + internships · source: press release',
    sourceUrl: 'https://example.edu/press/bosch-mou',
    sourceLabel: 'press release',
    relativeTime: '5 d',
    publishedAt: '2026-07-02T08:00:00.000Z',
  },
  {
    id: '90000000-0000-4000-8000-000000000003',
    rivalId: 'rival-a',
    title: '📈 Rival A package claim raised',
    summary: '4.2 → 5.1 LPA on website · LinkedIn suggests ~4.4 · as claimed, unverified',
    sourceUrl: 'https://rival-a.example/placements',
    sourceLabel: 'website (unverified)',
    relativeTime: '1 w',
    publishedAt: '2026-06-30T08:00:00.000Z',
  },
  {
    id: '90000000-0000-4000-8000-000000000004',
    rivalId: 'rival-c',
    title: '🏆 Rival C NAAC upgraded to A',
    summary: 'Was B++ · playbook: research push + 12 new PhD faculty',
    sourceUrl: 'https://naac.gov.in/',
    sourceLabel: 'NAAC official',
    relativeTime: '2 w',
    publishedAt: '2026-06-23T08:00:00.000Z',
  },
];

export const PILOT_GAP_ACTIONS = {
  rivalId: 'rival-a' as const,
  rivalName: 'Rival A',
  trustCardId: '10000000-0000-4000-8000-000000000002',
  sourcesLabel: 'NIRF 2026 + internal L3 data',
  actions: [
    {
      id: 'gap-go',
      priority: 1,
      title: 'Fix graduation outcomes',
      body: "PES's own data: 23 at-risk final-years explain the GO gap. Intervention plans already running for 14 students — fastest NIRF lever.",
      impact: 'high' as const,
      effort: 'low' as const,
      owner: 'TPO + Dean academics',
    },
    {
      id: 'gap-perception',
      priority: 2,
      title: 'Perception campaign',
      body: 'Publish verified placement outcomes before admission season',
      impact: 'medium' as const,
      effort: 'medium' as const,
      owner: 'Principal office',
    },
    {
      id: 'gap-research',
      priority: 3,
      title: 'Research output push',
      body: 'RP gap (31 vs 44) needs faculty publication incentives · longest lever',
      impact: 'high' as const,
      effort: 'high' as const,
      owner: 'Research cell',
      timelineLabel: '2 yrs',
    },
  ],
};

export const PILOT_NAAC_PREDICTION = {
  predictedCgpa: 3.12,
  predictedGrade: 'A',
  targetGrade: 'A+',
  targetCgpa: 3.26,
  subtitle: 'A+ needs 3.26 · gap is recoverable in this cycle',
  estimateDisclaimer: 'Model estimate — not an official NAAC grade',
  criteria: [
    { criterion: 'Criterion 3 · research', gap: -0.09, status: 'at_risk' as const },
    { criterion: 'Criterion 5 · student progression', gap: -0.04, status: 'watch' as const },
    { criterion: 'Criterion 6 · governance docs', gap: -0.03, status: 'watch' as const },
    { criterion: 'Criteria 1, 2, 4, 7', gap: 0, status: 'on_target' as const },
  ],
  fastestFix: {
    title: 'Fastest fix',
    body: 'Criterion 6 is a documentation gap — evidence pack auto-draftable from existing records. Est. +0.03 in 4 weeks.',
    estimatedImpact: 0.03,
    weeks: 4,
  },
  trustCardId: '10000000-0000-4000-8000-000000000003',
};
