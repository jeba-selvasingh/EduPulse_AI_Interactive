import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { GapActionView } from './gap-action.schema';
import { PILOT_GAP_ACTIONS, PILOT_RIVALS } from './pilot-rivals.seed';

function impactEffortLabel(impact: string, effort: string, timeline?: string): string {
  if (timeline) {
    return `${impact.charAt(0).toUpperCase() + impact.slice(1)} · ${timeline}`;
  }
  if (impact === effort) {
    return `${impact.charAt(0).toUpperCase() + impact.slice(1)} · ${effort}`;
  }
  return `${impact.charAt(0).toUpperCase() + impact.slice(1)} impact · ${effort} effort`;
}

@Injectable()
export class GapActionService {
  constructor(private readonly actionLogger: StructuredLoggerService) {}

  getPlan(user: AuthUser, rivalId: string): GapActionView {
    const started = Date.now();
    if (rivalId !== PILOT_GAP_ACTIONS.rivalId) {
      throw new NotFoundException('Gap plan not available for rival');
    }

    const rival = PILOT_RIVALS.find((r) => r.id === rivalId);
    const view: GapActionView = {
      rivalId: PILOT_GAP_ACTIONS.rivalId,
      rivalName: rival?.name ?? PILOT_GAP_ACTIONS.rivalName,
      trustCardId: PILOT_GAP_ACTIONS.trustCardId,
      sourcesLabel: PILOT_GAP_ACTIONS.sourcesLabel,
      actions: PILOT_GAP_ACTIONS.actions.map((action) => ({
        id: action.id,
        priority: action.priority,
        title: action.title,
        body: action.body,
        impact: action.impact,
        effort: action.effort,
        impactEffortLabel: impactEffortLabel(
          action.impact,
          action.effort,
          action.timelineLabel,
        ),
        owner: action.owner,
        timelineLabel: action.timelineLabel ?? null,
      })),
    };

    this.actionLogger.logAction({
      action: LogAction.CollegeRadarGapActionView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { rivalId, actionCount: view.actions.length },
    });

    return view;
  }
}
