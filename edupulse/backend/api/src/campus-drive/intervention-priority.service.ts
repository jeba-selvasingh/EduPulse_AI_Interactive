import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type {
  InterventionFocus,
  InterventionItem,
  InterventionPriorityView,
} from './intervention-priority.schema';
import {
  interventionCompletionUpdateSchema,
  interventionFocusSchema,
} from './intervention-priority.schema';
import { InterventionPriorityStoreService } from './intervention-priority-store.service';
import { PILOT_BATCH_LABEL } from './pilot-placement-students.seed';
import { PILOT_INTERVENTION_ITEMS } from './pilot-intervention-priority.seed';

const FOCUS_OPTIONS: Array<{ id: InterventionFocus; label: string }> = [
  { id: 'all', label: 'All cohorts' },
  { id: 'backlog', label: 'Backlogs' },
  { id: 'aptitude', label: 'Quant / aptitude' },
  { id: 'soft_skills', label: 'Communication' },
  { id: 'technical', label: 'DSA / technical' },
  { id: 'certification', label: 'Certifications' },
];

const DEFAULT_COMPLETION: Record<
  string,
  { status: InterventionItem['completionStatus']; completionPercent?: number; completionNote?: string }
> = {
  'backlog-clearance': {
    status: 'in_progress',
    completionPercent: 78,
    completionNote: 'Counselling booked for 18 of 23 students',
  },
  'communication-crash-course': { status: 'not_started' },
  'quant-sprint': { status: 'in_progress', completionPercent: 24 },
  'dsa-sprint': { status: 'not_started' },
  'infytq-certification': {
    status: 'in_progress',
    completionPercent: 64,
    completionNote: '89 students already certified · 49 pending',
  },
};

@Injectable()
export class InterventionPriorityService {
  constructor(
    private readonly actionLogger: StructuredLoggerService,
    private readonly store: InterventionPriorityStoreService,
  ) {}

  getPriorityView(user: AuthUser, focusInput?: string): InterventionPriorityView {
    const started = Date.now();
    const activeFocus = this.parseFocus(focusInput);
    const interventions = this.buildInterventions(user.institutionId).filter((item) =>
      this.matchesFocus(item, activeFocus),
    );

    const view: InterventionPriorityView = {
      batchLabel: PILOT_BATCH_LABEL,
      activeFocus,
      availableFocuses: FOCUS_OPTIONS,
      interventions,
      recoveryForecast: {
        currentPlacementPercent: 78,
        projectedPlacementPercent: 89,
        additionalOffers: 16,
        summary:
          'If all 5 interventions complete → projected placements rise from 78% to 89% · 16 additional offers vs doing nothing.',
      },
    };

    this.actionLogger.logAction({
      action: LogAction.CampusInterventionPriorityView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        activeFocus,
        interventionCount: interventions.length,
      },
    });

    return view;
  }

  updateCompletion(user: AuthUser, interventionId: string, body: unknown): InterventionItem {
    const started = Date.now();
    const parsed = interventionCompletionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('Invalid completion update payload');
    }

    const seed = PILOT_INTERVENTION_ITEMS.find((item) => item.id === interventionId);
    if (!seed) {
      throw new NotFoundException('Intervention not found');
    }

    const saved = this.store.setCompletion(user.institutionId, interventionId, {
      status: parsed.data.status,
      completionPercent: parsed.data.completionPercent,
      completionNote: parsed.data.completionNote,
    });

    const item = this.toItem(seed, saved);

    this.actionLogger.logAction({
      action: LogAction.CampusInterventionStatusUpdate,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        interventionId,
        status: saved.status,
        completionPercent: saved.completionPercent,
      },
    });

    return item;
  }

  private buildInterventions(institutionId: string): InterventionItem[] {
    return PILOT_INTERVENTION_ITEMS.map((seed) => {
      const stored = this.store.getCompletion(institutionId, seed.id);
      if (stored) {
        return this.toItem(seed, stored);
      }

      const defaults = DEFAULT_COMPLETION[seed.id] ?? { status: 'not_started' as const };
      return {
        ...seed,
        completionStatus: defaults.status,
        completionPercent: defaults.completionPercent,
        completionNote: defaults.completionNote,
      };
    });
  }

  private toItem(
    seed: (typeof PILOT_INTERVENTION_ITEMS)[number],
    completion: {
      status: InterventionItem['completionStatus'];
      completionPercent?: number;
      completionNote?: string;
    },
  ): InterventionItem {
    return {
      ...seed,
      completionStatus: completion.status,
      completionPercent: completion.completionPercent,
      completionNote: completion.completionNote,
    };
  }

  private parseFocus(focusInput?: string): InterventionFocus {
    const normalized = (focusInput ?? 'all').trim().toLowerCase().replace(/-/g, '_');

    const aliases: Record<string, InterventionFocus> = {
      all: 'all',
      backlog: 'backlog',
      backlog_clearance: 'backlog',
      aptitude: 'aptitude',
      quant: 'aptitude',
      soft_skills: 'soft_skills',
      communication: 'soft_skills',
      technical: 'technical',
      dsa: 'technical',
      certification: 'certification',
      infytq: 'certification',
    };

    const mapped = aliases[normalized] ?? normalized;
    const parsed = interventionFocusSchema.safeParse(mapped);
    return parsed.success ? parsed.data : 'all';
  }

  private matchesFocus(item: InterventionItem, focus: InterventionFocus): boolean {
    if (focus === 'all') {
      return true;
    }

    return item.focusTags.includes(focus);
  }
}
