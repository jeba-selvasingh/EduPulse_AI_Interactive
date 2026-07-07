/** Pilot corpus of prior VTU papers used for similarity checks (BCS304). */
export const SIMILARITY_THRESHOLD_PCT = 80;

export type PastPaperQuestion = {
  reference: string;
  examType: string;
  year: number;
  questionKey: string;
  moduleNumber: number;
  text: string;
};

export const PILOT_BCS304_PAST_PAPERS: PastPaperQuestion[] = [
  {
    reference: 'SEE 2023 Q4',
    examType: 'SEE',
    year: 2023,
    questionKey: 'Q4',
    moduleNumber: 3,
    text: 'Develop a program to construct an AVL tree with all rotations.',
  },
  {
    reference: 'SEE 2022 Q2',
    examType: 'SEE',
    year: 2022,
    questionKey: 'Q2',
    moduleNumber: 2,
    text: 'Develop an algorithm for insertion sort and trace with example.',
  },
  {
    reference: 'IA-2 2024 Q1',
    examType: 'IA-2',
    year: 2024,
    questionKey: 'Q1',
    moduleNumber: 1,
    text: 'Explain circular queue ADT with diagram and enqueue/dequeue operations.',
  },
];

export function tokenizeForSimilarity(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

export function similarityScorePct(a: string, b: string): number {
  const tokensA = tokenizeForSimilarity(a);
  const tokensB = tokenizeForSimilarity(b);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return Math.round((intersection / union) * 100);
}

export function findPastPaperMatch(
  questionText: string,
  moduleNumber: number,
): { reference: string; similarityPct: number } | null {
  let best: { reference: string; similarityPct: number } | null = null;

  for (const past of PILOT_BCS304_PAST_PAPERS) {
    if (past.moduleNumber !== moduleNumber) continue;
    const score = similarityScorePct(questionText, past.text);
    if (score >= SIMILARITY_THRESHOLD_PCT && (!best || score > best.similarityPct)) {
      best = { reference: past.reference, similarityPct: score };
    }
  }

  return best;
}
