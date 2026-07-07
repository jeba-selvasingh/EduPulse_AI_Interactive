import { Injectable, Logger } from '@nestjs/common';
import { getCorrelationId } from './correlation-context';
import type { LogActionName, LogOutcome, StructuredLogEntry } from './log-action.types';
import { scrubMetadata } from './pii-scrubber';

export type ActionLogInput = {
  action: LogActionName;
  durationMs: number;
  outcome: LogOutcome;
  institutionId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  level?: StructuredLogEntry['level'];
};

const DEV_LOG_RING_SIZE = 200;

@Injectable()
export class StructuredLoggerService {
  private readonly nestLogger = new Logger(StructuredLoggerService.name);
  private readonly devRing: StructuredLogEntry[] = [];

  logAction(input: ActionLogInput): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: input.level ?? (input.outcome === 'failure' ? 'warn' : 'info'),
      correlationId: getCorrelationId(),
      action: input.action,
      durationMs: Math.max(0, Math.round(input.durationMs)),
      outcome: input.outcome,
      institutionId: input.institutionId,
      userId: input.userId,
      metadata: scrubMetadata(input.metadata),
    };

    // JSON line for log aggregators (NFR-7)
    process.stdout.write(`${JSON.stringify(entry)}\n`);

    if (input.outcome === 'failure') {
      this.nestLogger.warn(`${input.action} ${input.outcome} (${entry.durationMs}ms)`);
    } else {
      this.nestLogger.log(`${input.action} ${input.outcome} (${entry.durationMs}ms)`);
    }

    this.devRing.push(entry);
    if (this.devRing.length > DEV_LOG_RING_SIZE) {
      this.devRing.shift();
    }
  }

  /** Dev-only ring buffer for verification — not for production dashboards */
  getRecentLogs(limit = 50): StructuredLogEntry[] {
    return this.devRing.slice(-limit);
  }
}
