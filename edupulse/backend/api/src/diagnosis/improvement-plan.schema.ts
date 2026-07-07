import { z } from 'zod';

export const improvementPrioritySchema = z.enum(['high', 'medium', 'watch']);
export type ImprovementPriority = z.infer<typeof improvementPrioritySchema>;

export const milestoneStatusSchema = z.enum(['done', 'now', 'next']);
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

export const facultyAttributionSchema = z.object({
  facultyName: z.string(),
  editedAt: z.string().datetime(),
  description: z.string(),
});

export const improvementAreaSchema = z.object({
  itemId: z.string(),
  rank: z.number().int().positive(),
  title: z.string(),
  priority: improvementPrioritySchema,
  impactSummary: z.string(),
  coTagsAffected: z.array(z.string()).optional(),
  companiesImpact: z.number().int().optional(),
  impactScore: z.number(),
  isFocused: z.boolean(),
  facultyAttribution: facultyAttributionSchema.optional(),
});

export const planMilestoneSchema = z.object({
  itemId: z.string(),
  weekLabel: z.string(),
  title: z.string(),
  status: milestoneStatusSchema,
  description: z.string(),
  facultyAttribution: facultyAttributionSchema.optional(),
});

export const improvementPlanViewSchema = z.object({
  usn: z.string(),
  studentName: z.string(),
  focusQuestionId: z.string().optional(),
  courseCode: z.string().optional(),
  rankedAreas: z.array(improvementAreaSchema),
  rankCaption: z.string(),
  milestones: z.array(planMilestoneSchema),
  completionPercent: z.number().int().min(0).max(100),
  currentWeekLabel: z.string(),
  eightWeekPlanRoute: z.string(),
  progressRoute: z.string(),
  placementInsight: z.string(),
});

export type ImprovementArea = z.infer<typeof improvementAreaSchema>;
export type PlanMilestone = z.infer<typeof planMilestoneSchema>;
export type ImprovementPlanView = z.infer<typeof improvementPlanViewSchema>;

export const editImprovementItemSchema = z.object({
  usn: z.string().min(1),
  description: z.string().min(1).max(500),
});

export type EditImprovementItemInput = z.infer<typeof editImprovementItemSchema>;
