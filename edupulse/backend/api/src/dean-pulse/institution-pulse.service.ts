import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { InstitutionPulseView } from './institution-pulse.schema';
import { PILOT_INSTITUTION_PULSE } from './pilot-institution-pulse.seed';

@Injectable()
export class InstitutionPulseService {
  constructor(private readonly actionLogger: StructuredLoggerService) {}

  getDashboard(_user: AuthUser): InstitutionPulseView {
    const started = Date.now();
    const view = { ...PILOT_INSTITUTION_PULSE };

    this.actionLogger.logAction({
      action: LogAction.DeanPulseDashboardView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: _user.institutionId,
      userId: _user.sub,
      metadata: {
        predictedPlacementPct: view.predictedPlacementPct,
        atRiskCount: view.atRiskCount,
      },
    });

    return view;
  }
}
