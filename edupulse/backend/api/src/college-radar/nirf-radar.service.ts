import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { NirfRadarView } from './nirf-radar.schema';
import {
  NIRF_DATA_YEAR,
  NIRF_PARAMETERS,
  PILOT_NIRF_SCORES,
  PILOT_RIVALS,
  type RivalId,
} from './pilot-rivals.seed';

@Injectable()
export class NirfRadarService {
  constructor(private readonly actionLogger: StructuredLoggerService) {}

  getComparison(user: AuthUser, rivalId: string): NirfRadarView {
    const started = Date.now();
    const rival = PILOT_RIVALS.find((r) => r.id === rivalId && !('isSelf' in r && r.isSelf));
    const pes = PILOT_RIVALS.find((r) => r.id === 'pes');

    if (!rival || !pes) {
      throw new NotFoundException('Rival not found');
    }

    const pesScores = PILOT_NIRF_SCORES.pes;
    const rivalScores = PILOT_NIRF_SCORES[rivalId as RivalId];

    if (!rivalScores) {
      throw new NotFoundException('NIRF comparison unavailable for rival');
    }

    const parameters = NIRF_PARAMETERS.map((param) => {
      const pesScore = pesScores[param.key] ?? 0;
      const rivalScore = rivalScores[param.key] ?? 0;
      const pesAhead = pesScore > rivalScore;
      const comparisonLabel = pesAhead
        ? `${pesScore} vs ${rivalScore} ✓`
        : `${pesScore} vs ${rivalScore}`;

      return {
        key: param.key,
        label: param.label,
        definition: param.definition,
        pesScore,
        rivalScore,
        comparisonLabel,
        pesAhead,
      };
    });

    const view: NirfRadarView = {
      dataYear: NIRF_DATA_YEAR,
      institutionName: pes.name,
      rivalId: rival.id,
      rivalName: rival.name,
      parameters,
    };

    this.actionLogger.logAction({
      action: LogAction.CollegeRadarNirfView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { rivalId },
    });

    return view;
  }
}
