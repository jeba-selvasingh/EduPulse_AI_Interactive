/** App roles — maps to Keycloak realm roles (FR-3) */
export const AppRole = {
  Faculty: 'faculty',
  Moderator: 'moderator',
  Tpo: 'tpo',
  Principal: 'principal',
  Student: 'student',
  Admin: 'admin',
} as const;

export type AppRoleName = (typeof AppRole)[keyof typeof AppRole];

/** Fine-grained permissions derived from RBAC matrix (PRD addendum) */
export const Permission = {
  PaperCraftGenerate: 'paper_craft:generate',
  PaperModerationSubmit: 'paper_moderation:submit',
  PaperModerationReview: 'paper_moderation:review',
  DeanPulseRead: 'dean_pulse:read',
  CollegeRadarRead: 'college_radar:read',
  MarksEntry: 'marks:entry',
  AnswerSheetAi: 'answer_sheet:evaluate',
  AuditRead: 'audit:read',
  AuditAppendOverride: 'audit:override',
  AuditAppendApproval: 'audit:approve',
  AuditAppendEdit: 'audit:edit',
  MarksPublish: 'marks:publish',
  ObservabilityRead: 'observability:read',
  ConsentManage: 'consent:manage',
  CohortImport: 'cohort:import',
  SyllabusRead: 'syllabus:read',
  SyllabusUpload: 'syllabus:upload',
  SyllabusActivate: 'syllabus:activate',
  AvailabilityRead: 'availability:read',
  AvailabilityManage: 'availability:manage',
  StudentDiagnosisRead: 'student_diagnosis:read',
  CampusDriveRead: 'campus_drive:read',
} as const;

export type PermissionName = (typeof Permission)[keyof typeof Permission];

const PERMISSION_ROLES: Record<PermissionName, AppRoleName[]> = {
  [Permission.PaperCraftGenerate]: [AppRole.Faculty, AppRole.Admin],
  [Permission.PaperModerationSubmit]: [AppRole.Faculty, AppRole.Admin],
  [Permission.PaperModerationReview]: [AppRole.Moderator, AppRole.Principal, AppRole.Admin],
  [Permission.DeanPulseRead]: [AppRole.Principal, AppRole.Tpo, AppRole.Admin],
  [Permission.CollegeRadarRead]: [AppRole.Principal, AppRole.Admin],
  [Permission.MarksEntry]: [AppRole.Faculty, AppRole.Admin],
  [Permission.AnswerSheetAi]: [AppRole.Faculty, AppRole.Admin],
  [Permission.AuditRead]: [
    AppRole.Faculty,
    AppRole.Moderator,
    AppRole.Principal,
    AppRole.Tpo,
    AppRole.Admin,
  ],
  [Permission.AuditAppendOverride]: [AppRole.Faculty, AppRole.Admin],
  [Permission.AuditAppendApproval]: [AppRole.Moderator, AppRole.Principal, AppRole.Admin],
  [Permission.AuditAppendEdit]: [AppRole.Faculty, AppRole.Admin],
  [Permission.MarksPublish]: [AppRole.Faculty, AppRole.Admin],
  [Permission.ObservabilityRead]: [AppRole.Admin, AppRole.Principal, AppRole.Tpo],
  [Permission.ConsentManage]: [AppRole.Admin],
  [Permission.CohortImport]: [AppRole.Admin],
  [Permission.SyllabusRead]: [AppRole.Faculty, AppRole.Admin],
  [Permission.SyllabusUpload]: [AppRole.Faculty, AppRole.Admin],
  [Permission.SyllabusActivate]: [AppRole.Admin],
  [Permission.AvailabilityRead]: [AppRole.Admin, AppRole.Principal, AppRole.Tpo],
  [Permission.AvailabilityManage]: [AppRole.Admin],
  [Permission.StudentDiagnosisRead]: [AppRole.Student, AppRole.Faculty, AppRole.Admin, AppRole.Principal],
  [Permission.CampusDriveRead]: [AppRole.Tpo, AppRole.Principal, AppRole.Admin],
};

export function hasPermission(roles: string[], permission: PermissionName): boolean {
  const allowed = PERMISSION_ROLES[permission];
  return roles.some((role) => allowed.includes(role as AppRoleName));
}

export function hasAnyPermission(roles: string[], permissions: PermissionName[]): boolean {
  return permissions.some((p) => hasPermission(roles, p));
}
