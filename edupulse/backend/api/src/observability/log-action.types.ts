/** NFR-7 action types for structured observability logs */
export const LogAction = {
  AuthLogin: 'auth.login',
  AuthSsoCallback: 'auth.sso_callback',
  AiPaperCraftGenerate: 'ai.paper_craft_generate',
  AiPaperCraftRegenerate: 'ai.paper_craft_regenerate',
  AnswerKeyGenerate: 'answer_key.generate',
  CoPoMappingUpdate: 'co_po.mapping_update',
  ModerationSubmit: 'moderation.submit',
  ModerationApprove: 'moderation.approve',
  ModerationReturn: 'moderation.return',
  PaperExportPdf: 'paper.export_pdf',
  MarksPartialSave: 'marks.partial_save',
  MarksExcelImport: 'marks.excel_import',
  MarksHeatmapCompute: 'marks.heatmap_compute',
  MarksHeatmapDrilldown: 'marks.heatmap_drilldown',
  EvaluationDashboardView: 'evaluation.dashboard_view',
  EvaluationSheetCaptureAnalyze: 'evaluation.sheet_capture_analyze',
  EvaluationSheetCapture: 'evaluation.sheet_capture',
  EvaluationBulkUpload: 'evaluation.bulk_upload',
  EvaluationAiRubric: 'evaluation.ai_rubric',
  EvaluationFacultyReview: 'evaluation.faculty_review',
  EvaluationBatchInsights: 'evaluation.batch_insights',
  EvaluationHeatmapRefresh: 'evaluation.heatmap_refresh',
  MarksPublish: 'marks.publish',
  MarksCsvExport: 'marks.csv_export',
  DiagnosisAcademicLevelView: 'diagnosis.academic_level_view',
  DiagnosisConceptMapView: 'diagnosis.concept_map_view',
  DiagnosisExamEvidenceView: 'diagnosis.exam_evidence_view',
  DiagnosisImprovementPlanView: 'diagnosis.improvement_plan_view',
  DiagnosisImprovementPlanEdit: 'diagnosis.improvement_plan_edit',
  DiagnosisProgressView: 'diagnosis.progress_view',
  CampusHomeView: 'campus.home_view',
  CampusEligibilityView: 'campus.eligibility_view',
  CampusReadinessBoardView: 'campus.readiness_board_view',
  CampusReadinessWeightsUpdate: 'campus.readiness_weights_update',
  CampusStudentReadinessView: 'campus.student_readiness_view',
  CampusTrainingDashboardsView: 'campus.training_dashboards_view',
  CampusDriveCalendarView: 'campus.drive_calendar_view',
  CampusDriveCalendarDetailView: 'campus.drive_calendar_detail_view',
  CampusDriveReminderQueued: 'campus.drive_reminder_queued',
  CampusBatchReadinessReportView: 'campus.batch_readiness_report_view',
  CampusBatchReadinessReportExport: 'campus.batch_readiness_report_export',
  CampusInterventionPriorityView: 'campus.intervention_priority_view',
  CampusInterventionStatusUpdate: 'campus.intervention_status_update',
  CampusMockTestScheduleView: 'campus.mock_test_schedule_view',
  CampusMockTestDetailView: 'campus.mock_test_detail_view',
  CampusMockTestScheduled: 'campus.mock_test_scheduled',
  CampusMockTestSubmissionsGraded: 'campus.mock_test_submissions_graded',
  DeanPulseDashboardView: 'dean_pulse.dashboard_view',
  AlertInboxView: 'dean_pulse.alert_inbox_view',
  AlertMarkRead: 'dean_pulse.alert_mark_read',
  MondayDigestView: 'dean_pulse.monday_digest_view',
  MondayDigestPreferencesUpdate: 'dean_pulse.monday_digest_preferences_update',
  MondayDigestTrigger: 'dean_pulse.monday_digest_trigger',
  CollegeRadarLeagueView: 'college_radar.league_view',
  CollegeRadarNirfView: 'college_radar.nirf_view',
  CollegeRadarCutoffView: 'college_radar.cutoff_view',
  CollegeRadarRivalFeedView: 'college_radar.rival_feed_view',
  CollegeRadarRivalFeedCreate: 'college_radar.rival_feed_create',
  CollegeRadarRivalFeedUpdate: 'college_radar.rival_feed_update',
  CollegeRadarGapActionView: 'college_radar.gap_action_view',
  CollegeRadarNaacView: 'college_radar.naac_view',
  ConsentAccept: 'consent.accept',
  ConsentDecline: 'consent.decline',
  CohortImport: 'cohort.import',
  SyllabusUpload: 'syllabus.upload',
  SyllabusModulesSave: 'syllabus.modules_save',
  SyllabusVersionActivate: 'syllabus.version_activate',
  BlueprintSave: 'blueprint.save',
  AvailabilityProbe: 'availability.probe',
  AvailabilityAlert: 'availability.incident',
  MaintenanceScheduled: 'availability.maintenance_scheduled',
} as const;

export type LogActionName = (typeof LogAction)[keyof typeof LogAction];

export type LogOutcome = 'success' | 'failure';

export type StructuredLogEntry = {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  correlationId: string;
  action: LogActionName;
  durationMs: number;
  outcome: LogOutcome;
  institutionId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};
