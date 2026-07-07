import { z } from 'zod';

export const mockTestStatusSchema = z.enum([
  'done',
  'upcoming',
  'open',
  'scheduled',
  'grading',
]);

export const mockTestEntrySchema = z.object({
  mockId: z.string(),
  mockNumber: z.number(),
  title: z.string(),
  dateLabel: z.string(),
  patternLabel: z.string(),
  status: mockTestStatusSchema,
  statusLabel: z.string(),
  description: z.string(),
  durationMinutes: z.number().optional(),
  registeredCount: z.number().optional(),
  participantsCount: z.number().optional(),
  batchAvgScore: z.number().optional(),
  aboveBenchmarkCount: z.number().optional(),
  topScorerName: z.string().optional(),
  topScorerScore: z.number().optional(),
  registrationDeadlineLabel: z.string().optional(),
  canRegister: z.boolean().optional(),
  highlighted: z.boolean().optional(),
});

export const mockTestNextSchema = z.object({
  mockId: z.string(),
  title: z.string(),
  scheduleLabel: z.string(),
  description: z.string(),
  autoGraded: z.boolean(),
  resultsSlaHours: z.number(),
});

export const mockTestTrendPointSchema = z.object({
  label: z.string(),
  batchAvgScore: z.number(),
  barPercent: z.number(),
  color: z.string(),
});

export const mockTestScheduleViewSchema = z.object({
  batchLabel: z.string(),
  monthLabel: z.string(),
  nextMock: mockTestNextSchema,
  schedule: z.array(mockTestEntrySchema),
  scoreTrend: z.array(mockTestTrendPointSchema),
});

export const mockTestDetailSchema = mockTestEntrySchema.extend({
  sections: z.array(z.string()).optional(),
  benchmarkScore: z.number().optional(),
  gradingStatus: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  gradingCompletedInMinutes: z.number().optional(),
  gradingWithinSla: z.boolean().optional(),
});

export const scheduleMockTestSchema = z.object({
  patternLabel: z.string().min(1),
  dateLabel: z.string().min(1),
  focus: z.string().optional(),
  durationMinutes: z.number().min(30).max(180).default(90),
  sections: z.array(z.string()).min(1).optional(),
});

export const mockTestSubmissionSchema = z.object({
  submittedCount: z.number().min(1).max(200).optional(),
});

export const mockTestGradingResultSchema = z.object({
  mockId: z.string(),
  submittedCount: z.number(),
  gradedCount: z.number(),
  batchAvgScore: z.number(),
  gradingCompletedInMinutes: z.number(),
  gradingWithinSla: z.boolean(),
  resultsSlaHours: z.number(),
  auditLogAction: z.string(),
});

export const mockTestRegistrationResultSchema = z.object({
  mockId: z.string(),
  registeredCount: z.number(),
  registrationDeadlineLabel: z.string().optional(),
});

export type MockTestStatus = z.infer<typeof mockTestStatusSchema>;
export type MockTestEntry = z.infer<typeof mockTestEntrySchema>;
export type MockTestNext = z.infer<typeof mockTestNextSchema>;
export type MockTestTrendPoint = z.infer<typeof mockTestTrendPointSchema>;
export type MockTestScheduleView = z.infer<typeof mockTestScheduleViewSchema>;
export type MockTestDetail = z.infer<typeof mockTestDetailSchema>;
export type MockTestGradingResult = z.infer<typeof mockTestGradingResultSchema>;
