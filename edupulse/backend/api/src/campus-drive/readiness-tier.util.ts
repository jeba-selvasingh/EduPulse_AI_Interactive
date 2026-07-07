import type { ReadinessTierId, ReadinessWeights } from './readiness-tier.schema';

export const DEFAULT_READINESS_WEIGHTS: ReadinessWeights = {
  academics: 25,
  coding: 20,
  certs: 15,
  communication: 10,
};

export const ADMIN_WEIGHT_BOUNDS: ReadinessWeights = {
  academics: 35,
  coding: 30,
  certs: 25,
  communication: 20,
};

export const MIN_READINESS_WEIGHTS: ReadinessWeights = {
  academics: 15,
  coding: 10,
  certs: 5,
  communication: 5,
};

export const TIER_LABELS: Record<ReadinessTierId, string> = {
  dream: 'Dream',
  core: 'Core',
  mass: 'Mass',
  at_risk: 'At-risk',
};

export const TIER_COLORS: Record<ReadinessTierId, string> = {
  dream: '#0F6E56',
  core: '#185FA5',
  mass: '#854F0B',
  at_risk: '#A32D2D',
};

export function academicsPoints(cgpa: number): number {
  const clamped = Math.max(5.5, Math.min(cgpa, 9.5));
  return Math.round(((clamped - 5.5) / 4) * 25);
}

export function codingPoints(codingScore: number): number {
  const clamped = Math.max(0, Math.min(codingScore, 10));
  return Math.round((clamped / 10) * 20);
}

export function certsPoints(certsScore: number): number {
  const clamped = Math.max(0, Math.min(certsScore, 15));
  return Math.round(clamped);
}

export function communicationPoints(communicationScore: number): number {
  const clamped = Math.max(0, Math.min(communicationScore, 10));
  return Math.round(clamped);
}

export function readinessPercent(
  components: {
    academics: number;
    coding: number;
    certs: number;
    communication: number;
  },
  weights: ReadinessWeights,
): number {
  const totalWeight =
    weights.academics + weights.coding + weights.certs + weights.communication;
  const earned =
    (components.academics / 25) * weights.academics +
    (components.coding / 20) * weights.coding +
    (components.certs / 15) * weights.certs +
    (components.communication / 10) * weights.communication;

  return Math.round((earned / totalWeight) * 100);
}

export function assignReadinessTier(input: {
  readinessPercent: number;
  cgpa: number;
  codingScore: number;
  activeBacklogs: number;
}): ReadinessTierId {
  if (input.activeBacklogs > 0 || input.cgpa < 6.2) {
    return 'at_risk';
  }

  if (input.readinessPercent >= 84 && input.cgpa >= 7.8 && input.codingScore >= 7.5) {
    return 'dream';
  }

  if (input.readinessPercent >= 65) {
    return 'core';
  }

  if (input.readinessPercent >= 48) {
    return 'mass';
  }

  return 'at_risk';
}

export function clampWeights(weights: ReadinessWeights): ReadinessWeights {
  return {
    academics: Math.min(Math.max(weights.academics, MIN_READINESS_WEIGHTS.academics), ADMIN_WEIGHT_BOUNDS.academics),
    coding: Math.min(Math.max(weights.coding, MIN_READINESS_WEIGHTS.coding), ADMIN_WEIGHT_BOUNDS.coding),
    certs: Math.min(Math.max(weights.certs, MIN_READINESS_WEIGHTS.certs), ADMIN_WEIGHT_BOUNDS.certs),
    communication: Math.min(
      Math.max(weights.communication, MIN_READINESS_WEIGHTS.communication),
      ADMIN_WEIGHT_BOUNDS.communication,
    ),
  };
}

export function buildGapSummary(
  tier: ReadinessTierId,
  communicationScore: number,
  aptitudeScore: number,
): string | undefined {
  if (tier === 'at_risk') {
    return '1 backlog blocks 14 companies → tap for plan';
  }

  if (tier === 'core' && aptitudeScore < 7) {
    return 'Eligible: 23 of 41 · gap: aptitude speed';
  }

  if (tier === 'dream') {
    return 'Eligible: 31 of 41 companies';
  }

  if (communicationScore < 5) {
    return 'Gap: communication skills';
  }

  return undefined;
}
