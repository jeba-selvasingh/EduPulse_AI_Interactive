import type { BloomTargets, DifficultyProfile } from './blueprint.schema';

export const BCS304_PATTERN_PROFILE = {
  code: 'VTU_BCS304_V3',
  label: 'VTU v3',
  learnedFromPapers: 12,
  summary:
    'Learned from 12 past papers · 10 questions, module-wise internal choice, phrasing style encoded',
};

export const BCS304_DEFAULT_DIFFICULTY: DifficultyProfile = {
  easy: 30,
  moderate: 50,
  hard: 20,
};

export const BCS304_DEFAULT_BLOOM: BloomTargets = {
  l1: 10,
  l2: 25,
  l3: 35,
  l4: 20,
  l5: 10,
};
