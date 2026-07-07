import { getApiBaseUrl, getApiHeaders } from '@/src/lib/api';

export type DifficultyProfile = {
  easy: number;
  moderate: number;
  hard: number;
};

export type BloomTargets = {
  l1: number;
  l2: number;
  l3: number;
  l4: number;
  l5: number;
};

export type PatternProfile = {
  code: string;
  label: string;
  learnedFromPapers: number;
  summary: string;
};

export type BlueprintView = {
  blueprint: {
    id: string;
    courseCode: string;
    examType: string;
    difficulty: DifficultyProfile;
    bloom: BloomTargets;
    updatedAt: string;
  };
  patternProfile: PatternProfile;
  validation: {
    difficultyTotal: number;
    bloomTotal: number;
    isValid: boolean;
  };
};

export function sumDifficulty(d: DifficultyProfile): number {
  return d.easy + d.moderate + d.hard;
}

export function sumBloom(b: BloomTargets): number {
  return b.l1 + b.l2 + b.l3 + b.l4 + b.l5;
}

export async function fetchBlueprint(
  courseCode: string,
  examType = 'SEE',
): Promise<BlueprintView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/blueprint/${encodeURIComponent(courseCode)}?examType=${encodeURIComponent(examType)}`,
    { headers: await getApiHeaders() },
  );

  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }

  if (!response.ok) {
    throw new Error(`Blueprint fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: BlueprintView };
  return json.data;
}

export async function saveBlueprint(
  courseCode: string,
  payload: { difficulty: DifficultyProfile; bloom: BloomTargets; examType?: string },
): Promise<BlueprintView> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/paper-craft/blueprint/${encodeURIComponent(courseCode)}`,
    {
      method: 'PUT',
      headers: {
        ...(await getApiHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (response.status === 403) {
    throw new Error('ACCESS_DENIED');
  }

  if (!response.ok) {
    const body = (await response.json()) as { message?: string };
    throw new Error(body?.message ?? `Blueprint save failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: BlueprintView };
  return json.data;
}
