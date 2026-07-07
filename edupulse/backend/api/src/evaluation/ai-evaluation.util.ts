import type { RubricMarkStep } from '../paper-craft/answer-key.schema';
import { REVIEW_CONFIDENCE_THRESHOLD } from './ai-evaluation.schema';

const LOCAL_MODEL_NAME = 'qwen2.5-14b · local';
const EVAL_PROMPT_VERSION = 'eval_rubric v6';

export function evaluationModelMetadata() {
  return {
    modelName: LOCAL_MODEL_NAME,
    promptVersion: EVAL_PROMPT_VERSION,
  };
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function pilotQuestionConfidence(usn: string, questionKey: string): number {
  const seed = hashSeed(`${usn.toUpperCase()}:${questionKey}`);
  return 0.52 + (seed % 46) / 100;
}

export function pilotMarksAwarded(maxMarks: number, confidence: number): number {
  const raw = maxMarks * (0.45 + confidence * 0.5);
  return Math.min(maxMarks, Math.max(0, Math.round(raw * 2) / 2));
}

export function buildEvaluationRationale(
  questionKey: string,
  rubricSteps: RubricMarkStep[],
  marksAwarded: number,
  maxMarks: number,
  confidence: number,
): string {
  const matchedSteps = rubricSteps
    .filter((_, index) => index < Math.ceil((marksAwarded / maxMarks) * rubricSteps.length))
    .map((step) => step.label)
    .join('; ');

  return `AI matched rubric steps for ${questionKey}: ${matchedSteps || 'partial attempt noted'}. ` +
    `Awarded ${marksAwarded}/${maxMarks} marks with ${Math.round(confidence * 100)}% confidence against the approved model answer.`;
}

export function isFlaggedForReview(confidence: number): boolean {
  return confidence < REVIEW_CONFIDENCE_THRESHOLD;
}

export function simulateEvaluationDurationMs(usn: string): number {
  const seed = hashSeed(usn) % 7000;
  return 1800 + seed;
}
