import { NEAR_MISS_CGPA_WINDOW, type PilotPlacementStudent } from './pilot-placement-students.seed';
import type { EligibilityRules } from './eligibility-tracker.schema';

export type EligibilityCounts = {
  eligibleCount: number;
  notEligibleCount: number;
  nearMissCount: number;
};

export function meetsBaseRules(student: PilotPlacementStudent, rules: EligibilityRules): boolean {
  if (student.activeBacklogs > rules.maxActiveBacklogs) {
    return false;
  }

  if (rules.maxEverBacklogs !== undefined && student.everBacklogs > rules.maxEverBacklogs) {
    return false;
  }

  if (rules.minCodingScore !== undefined && student.codingScore < rules.minCodingScore) {
    return false;
  }

  return true;
}

export function isEligible(student: PilotPlacementStudent, rules: EligibilityRules): boolean {
  return meetsBaseRules(student, rules) && student.cgpa >= rules.minCgpa;
}

export function isNearMiss(student: PilotPlacementStudent, rules: EligibilityRules): boolean {
  if (!meetsBaseRules(student, rules)) {
    return false;
  }

  const gap = rules.minCgpa - student.cgpa;
  return gap > 0 && gap <= NEAR_MISS_CGPA_WINDOW;
}

export function computeEligibilityCounts(
  students: PilotPlacementStudent[],
  rules: EligibilityRules,
): EligibilityCounts {
  let eligibleCount = 0;
  let nearMissCount = 0;

  for (const student of students) {
    if (isEligible(student, rules)) {
      eligibleCount += 1;
    } else if (isNearMiss(student, rules)) {
      nearMissCount += 1;
    }
  }

  return {
    eligibleCount,
    notEligibleCount: students.length - eligibleCount,
    nearMissCount,
  };
}
