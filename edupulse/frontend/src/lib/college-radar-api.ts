import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type LeagueEntry = {
  id: string;
  name: string;
  nirfRank: number | null;
  naacGrade: string;
  placementPct: number;
  placementLabel: string;
  isSelf: boolean;
  provenanceNotes: string[];
};

export type PeerLeagueView = {
  rivalsWatched: number;
  clusterSize: number;
  positionSummary: string;
  rankDeltaNarrative: string;
  footnote: string;
  entries: LeagueEntry[];
};

export type NirfParameter = {
  key: string;
  label: string;
  definition: string;
  pesScore: number;
  rivalScore: number;
  comparisonLabel: string;
  pesAhead: boolean;
};

export type NirfRadarView = {
  dataYear: number;
  institutionName: string;
  rivalId: string;
  rivalName: string;
  parameters: NirfParameter[];
};

export type CutoffYearPoint = {
  year: number;
  closingRank: number;
  label: string;
  barPercent: number;
};

export type CutoffTrackerView = {
  examLabel: string;
  branch: string;
  trendDirection: 'improving' | 'slipping' | 'stable';
  trendNarrative: string;
  signalNarrative: string;
  pesTrend: CutoffYearPoint[];
  comparisons: Array<{
    label: string;
    closingRank: number;
    displayRank: string;
    direction: 'up' | 'down' | 'flat';
  }>;
};

export type RivalFeedItem = {
  id: string;
  rivalId: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceLabel: string;
  relativeTime: string;
  publishedAt: string;
};

export type RivalFeedView = {
  newThisWeek: number;
  items: RivalFeedItem[];
};

export type GapActionItem = {
  id: string;
  priority: number;
  title: string;
  body: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  impactEffortLabel: string;
  owner: string;
  timelineLabel: string | null;
};

export type GapActionView = {
  rivalId: string;
  rivalName: string;
  trustCardId: string;
  sourcesLabel: string;
  actions: GapActionItem[];
};

export type NaacPredictionView = {
  predictedCgpa: number;
  predictedGrade: string;
  targetGrade: string;
  targetCgpa: number;
  subtitle: string;
  estimateDisclaimer: string;
  criteria: Array<{
    criterion: string;
    gap: number;
    displayGap: string;
    status: 'at_risk' | 'watch' | 'on_target';
  }>;
  fastestFix: {
    title: string;
    body: string;
    estimatedImpact: number;
    weeks: number;
  };
  trustCardId: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const json = (await response.json()) as { data: T };
  return json.data;
}

export async function fetchPeerLeague(): Promise<PeerLeagueView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/college-radar/league`, {
    headers: await getApiHeaders(),
  });
  return parseJson<PeerLeagueView>(response);
}

export async function fetchNirfRadar(rivalId = 'rival-a'): Promise<NirfRadarView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/college-radar/nirf-radar?rivalId=${encodeURIComponent(rivalId)}`,
    { headers: await getApiHeaders() },
  );
  return parseJson<NirfRadarView>(response);
}

export async function fetchCutoffTracker(): Promise<CutoffTrackerView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/college-radar/cutoff-tracker`, {
    headers: await getApiHeaders(),
  });
  return parseJson<CutoffTrackerView>(response);
}

export async function fetchRivalFeed(): Promise<RivalFeedView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/college-radar/rival-feed`, {
    headers: await getApiHeaders(),
  });
  return parseJson<RivalFeedView>(response);
}

export async function fetchGapAction(rivalId = 'rival-a'): Promise<GapActionView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/college-radar/gap-action?rivalId=${encodeURIComponent(rivalId)}`,
    { headers: await getApiHeaders() },
  );
  return parseJson<GapActionView>(response);
}

export async function fetchNaacPrediction(): Promise<NaacPredictionView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/college-radar/naac-prediction`, {
    headers: await getApiHeaders(),
  });
  return parseJson<NaacPredictionView>(response);
}

export function gapStatusColor(status: 'at_risk' | 'watch' | 'on_target'): string {
  switch (status) {
    case 'at_risk':
      return '#A32D2D';
    case 'watch':
      return '#B8860B';
    case 'on_target':
      return '#0F6E56';
  }
}

export function actionCardStyle(priority: number) {
  switch (priority) {
    case 1:
      return { backgroundColor: '#FFF5F5', borderColor: '#F5C6C6' };
    case 2:
      return { backgroundColor: '#FFFBF0', borderColor: '#F5E0B8' };
    default:
      return { backgroundColor: '#F7F7FA', borderColor: '#E5E5EA' };
  }
}
