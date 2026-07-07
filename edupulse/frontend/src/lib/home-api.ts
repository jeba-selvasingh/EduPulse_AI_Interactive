import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type HomeStats = {
  papersThisSem: number;
  hoursSaved: number;
};

export type AttentionItem = {
  id: string;
  title: string;
  subtitle: string;
  severity: 'amber' | 'red' | 'neutral';
  trustCardId?: string;
};

export type HomeSummary = {
  stats: HomeStats;
  unreadAlertCount: number;
  attentionItems: AttentionItem[];
};

export async function fetchHomeSummary(): Promise<HomeSummary> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/home/summary`, {
    headers: await getApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Home summary fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: HomeSummary };
  return json.data;
}
