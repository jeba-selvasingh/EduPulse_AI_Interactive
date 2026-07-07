import { z } from 'zod';
import { eligibilityRulesSchema, registrationStatusSchema } from './eligibility-tracker.schema';

export const driveUrgencyToneSchema = z.enum(['urgent', 'attention', 'normal', 'upcoming']);

export const driveCalendarEntrySchema = z.object({
  driveId: z.string(),
  companyName: z.string(),
  driveDateLabel: z.string(),
  daysUntilDrive: z.number(),
  packageLabel: z.string(),
  rulesSummary: z.string(),
  scheduleNote: z.string().optional(),
  venue: z.string().optional(),
  registrationStatus: registrationStatusSchema,
  eligibleCount: z.number(),
  registeredCount: z.number(),
  pendingCount: z.number(),
  registrationOpensLabel: z.string().optional(),
  registrationClosesLabel: z.string().optional(),
  urgencyTone: driveUrgencyToneSchema,
  detailRoute: z.string(),
});

export const driveCalendarActionAlertSchema = z.object({
  driveId: z.string(),
  companyName: z.string(),
  message: z.string(),
  pendingCount: z.number(),
  registrationClosesLabel: z.string().optional(),
});

export const driveCalendarViewSchema = z.object({
  monthLabel: z.string(),
  batchLabel: z.string(),
  whatsappPilotEnabled: z.boolean(),
  drives: z.array(driveCalendarEntrySchema),
  actionAlert: driveCalendarActionAlertSchema.optional(),
});

export const unregisteredEligibleStudentSchema = z.object({
  usn: z.string(),
  name: z.string(),
  cgpa: z.number(),
});

export const driveCalendarDetailSchema = driveCalendarEntrySchema.extend({
  rules: eligibilityRulesSchema,
  unregisteredEligibleCount: z.number(),
  unregisteredEligibleStudents: z.array(unregisteredEligibleStudentSchema),
  whatsappPilotEnabled: z.boolean(),
  canSendReminder: z.boolean(),
});

export const driveReminderRequestSchema = z.object({
  driveId: z.string().min(1),
});

export const driveReminderResultSchema = z.object({
  queued: z.boolean(),
  driveId: z.string(),
  companyName: z.string(),
  recipientCount: z.number(),
  queueId: z.string(),
  channel: z.literal('whatsapp'),
  templateId: z.string(),
  auditLogAction: z.string(),
});

export type DriveUrgencyTone = z.infer<typeof driveUrgencyToneSchema>;
export type DriveCalendarEntry = z.infer<typeof driveCalendarEntrySchema>;
export type DriveCalendarActionAlert = z.infer<typeof driveCalendarActionAlertSchema>;
export type DriveCalendarView = z.infer<typeof driveCalendarViewSchema>;
export type UnregisteredEligibleStudent = z.infer<typeof unregisteredEligibleStudentSchema>;
export type DriveCalendarDetail = z.infer<typeof driveCalendarDetailSchema>;
export type DriveReminderRequest = z.infer<typeof driveReminderRequestSchema>;
export type DriveReminderResult = z.infer<typeof driveReminderResultSchema>;
