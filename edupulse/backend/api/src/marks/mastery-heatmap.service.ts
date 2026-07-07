import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import {
  type HeatmapClusterDrilldown,
  type HeatmapDrilldownScope,
  heatmapDrilldownScopeSchema,
} from './heatmap-cluster-drilldown.schema';
import type { MasteryHeatmap } from './mastery-heatmap.schema';
import {
  bandForPercent,
  buildDiagnosisRoute,
  computeCoMastery,
  findCoMapping,
} from './mastery-heatmap.util';
import { MarksService } from './marks.service';
import { PILOT_BCS304_IA2_CO_MAPPING } from './pilot-bcs304-ia2-co-mapping.seed';

const WEAK_CLUSTER_THRESHOLD = 0.1;
const WEAK_MASTERY_MAX = 39;

@Injectable()
export class MasteryHeatmapService {
  constructor(
    private readonly marks: MarksService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getHeatmap(user: AuthUser, courseCode: string, examType: string): MasteryHeatmap {
    const started = Date.now();
    const heatmap = this.computeHeatmap(user, courseCode, examType);

    this.actionLogger.logAction({
      action: LogAction.MarksHeatmapCompute,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        studentsWithMarks: heatmap.studentsWithMarks,
        highlightedClusters: heatmap.weakClusters.filter((cluster) => cluster.isHighlighted).length,
      },
    });

    return heatmap;
  }

  getClusterDrillDown(
    user: AuthUser,
    courseCode: string,
    examType: string,
    coTag: string,
    scopeInput?: string,
  ): HeatmapClusterDrilldown {
    const started = Date.now();
    const scope: HeatmapDrilldownScope = scopeInput
      ? heatmapDrilldownScopeSchema.parse(scopeInput)
      : 'weak';

    const heatmap = this.computeHeatmap(user, courseCode, examType);
    const mapping = findCoMapping(PILOT_BCS304_IA2_CO_MAPPING, coTag);
    if (!mapping) {
      throw new NotFoundException({
        code: 'CO_CLUSTER_NOT_FOUND',
        message: `Course outcome ${coTag} not found for this assessment`,
      });
    }

    const cluster = heatmap.weakClusters.find((entry) => entry.coTag === coTag);
    if (!cluster) {
      throw new NotFoundException({
        code: 'CO_CLUSTER_NOT_FOUND',
        message: `Cluster summary not found for ${coTag}`,
      });
    }

    const students = heatmap.rows
      .map((row) => {
        const cell = row.cells.find((entry) => entry.coTag === coTag);
        if (!cell || cell.masteryPercent === null) return null;
        return {
          usn: row.usn,
          studentName: row.studentName,
          masteryPercent: cell.masteryPercent,
          band: cell.band,
          diagnosisRoute: buildDiagnosisRoute(courseCode, coTag, row.usn),
        };
      })
      .filter((student): student is NonNullable<typeof student> => student !== null)
      .filter((student) =>
        scope === 'weak' ? student.masteryPercent <= WEAK_MASTERY_MAX : true,
      )
      .sort((left, right) => left.masteryPercent - right.masteryPercent);

    const drilldown: HeatmapClusterDrilldown = {
      courseCode,
      examType,
      coTag,
      title: mapping.title,
      scope,
      cluster,
      students,
      diagnosisEntryRoute: buildDiagnosisRoute(courseCode, coTag, students[0]?.usn ?? ''),
    };

    this.actionLogger.logAction({
      action: LogAction.MarksHeatmapDrilldown,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        courseCode,
        examType,
        coTag,
        scope,
        studentCount: students.length,
        isHighlighted: cluster.isHighlighted,
      },
    });

    return drilldown;
  }

  private computeHeatmap(user: AuthUser, courseCode: string, examType: string): MasteryHeatmap {
    const grid = this.marks.getGrid(user, courseCode, examType);
    const coMappings = PILOT_BCS304_IA2_CO_MAPPING;
    const questionMax = new Map(grid.questions.map((question) => [question.id, question.maxMarks]));

    const rows = grid.rows.map((row) => {
      const marksByQuestion = new Map(
        row.cells
          .filter((cell) => cell.isSaved && cell.marks !== null)
          .map((cell) => [cell.questionId, cell.marks as number]),
      );

      const cells = coMappings.map((mapping) => {
        const masteryPercent = computeCoMastery(mapping.contributors, marksByQuestion, questionMax);
        return {
          coTag: mapping.coTag,
          masteryPercent,
          band: bandForPercent(masteryPercent),
        };
      });

      return {
        usn: row.usn,
        studentName: row.studentName,
        cells,
      };
    });

    const weakClusters = coMappings.map((mapping) => {
      const withData = rows.filter((row) => {
        const cell = row.cells.find((entry) => entry.coTag === mapping.coTag);
        return cell?.masteryPercent !== null;
      });

      const weakCount = withData.filter((row) => {
        const cell = row.cells.find((entry) => entry.coTag === mapping.coTag);
        return (cell?.masteryPercent ?? 100) <= WEAK_MASTERY_MAX;
      }).length;

      const studentsWithData = withData.length;
      const weakPercent = studentsWithData > 0 ? weakCount / studentsWithData : 0;

      return {
        coTag: mapping.coTag,
        title: mapping.title,
        weakCount,
        studentsWithData,
        weakPercent,
        isHighlighted: studentsWithData > 0 && weakPercent > WEAK_CLUSTER_THRESHOLD,
      };
    });

    return {
      assessmentId: grid.assessmentId,
      courseCode: grid.courseCode,
      examType: grid.examType,
      institutionId: grid.institutionId,
      courseOutcomes: coMappings.map((mapping) => ({
        coTag: mapping.coTag,
        title: mapping.title,
      })),
      rows,
      weakClusters,
      computedAt: new Date().toISOString(),
      studentsWithMarks: grid.rows.filter((row) => row.cells.some((cell) => cell.isSaved)).length,
      totalStudents: grid.completion.totalStudents,
    };
  }
}
