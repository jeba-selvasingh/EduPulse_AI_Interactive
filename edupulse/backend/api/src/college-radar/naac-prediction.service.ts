import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { NaacPredictionView } from './naac-prediction.schema';
import { PILOT_NAAC_PREDICTION } from './pilot-rivals.seed';

@Injectable()
export class NaacPredictionService {
  constructor(private readonly actionLogger: StructuredLoggerService) {}

  getPrediction(_user: AuthUser): NaacPredictionView {
    const started = Date.now();
    const pilot = PILOT_NAAC_PREDICTION;

    const view: NaacPredictionView = {
      predictedCgpa: pilot.predictedCgpa,
      predictedGrade: pilot.predictedGrade,
      targetGrade: pilot.targetGrade,
      targetCgpa: pilot.targetCgpa,
      subtitle: pilot.subtitle,
      estimateDisclaimer: pilot.estimateDisclaimer,
      criteria: pilot.criteria.map((row) => ({
        criterion: row.criterion,
        gap: row.gap,
        displayGap: row.status === 'on_target' ? 'On target ✓' : `${row.gap.toFixed(2)}`,
        status: row.status,
      })),
      fastestFix: pilot.fastestFix,
      trustCardId: pilot.trustCardId,
    };

    this.actionLogger.logAction({
      action: LogAction.CollegeRadarNaacView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: _user.institutionId,
      userId: _user.sub,
      metadata: { predictedCgpa: view.predictedCgpa },
    });

    return view;
  }
}
