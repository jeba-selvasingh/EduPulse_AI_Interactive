import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { CutoffTrackerView } from './cutoff-tracker.schema';
import { PILOT_CUTOFF_TRACKER } from './pilot-rivals.seed';

@Injectable()
export class CutoffTrackerService {
  constructor(private readonly actionLogger: StructuredLoggerService) {}

  getTracker(_user: AuthUser): CutoffTrackerView {
    const started = Date.now();
    const maxRank = Math.max(...PILOT_CUTOFF_TRACKER.pesTrend.map((p) => p.closingRank));

    const view: CutoffTrackerView = {
      examLabel: PILOT_CUTOFF_TRACKER.examLabel,
      branch: PILOT_CUTOFF_TRACKER.branch,
      trendDirection: PILOT_CUTOFF_TRACKER.trendDirection,
      trendNarrative: PILOT_CUTOFF_TRACKER.trendNarrative,
      signalNarrative: PILOT_CUTOFF_TRACKER.signalNarrative,
      pesTrend: PILOT_CUTOFF_TRACKER.pesTrend.map((point) => ({
        ...point,
        barPercent: Math.round((point.closingRank / maxRank) * 100),
      })),
      comparisons: PILOT_CUTOFF_TRACKER.comparisons.map((row) => ({
        label: row.label,
        closingRank: row.closingRank,
        displayRank: row.closingRank.toLocaleString('en-IN'),
        direction: row.direction,
      })),
    };

    this.actionLogger.logAction({
      action: LogAction.CollegeRadarCutoffView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: _user.institutionId,
      userId: _user.sub,
    });

    return view;
  }
}
