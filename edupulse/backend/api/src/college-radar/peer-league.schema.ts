import { z } from 'zod';

export const provenanceSchema = z.enum(['official', 'claimed', 'unavailable']);

export const leagueEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  nirfRank: z.number().int().positive().nullable(),
  naacGrade: z.string(),
  placementPct: z.number().int().min(0).max(100),
  placementLabel: z.string(),
  isSelf: z.boolean(),
  provenanceNotes: z.array(z.string()),
});

export const peerLeagueViewSchema = z.object({
  rivalsWatched: z.number().int().nonnegative(),
  clusterSize: z.number().int().positive(),
  positionSummary: z.string(),
  rankDeltaNarrative: z.string(),
  footnote: z.string(),
  entries: z.array(leagueEntrySchema),
});

export type PeerLeagueView = z.infer<typeof peerLeagueViewSchema>;
