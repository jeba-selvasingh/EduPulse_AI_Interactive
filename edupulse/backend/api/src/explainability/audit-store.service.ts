import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AppendAuditEventInput, AuditEvent } from './audit-event.schema';
import type { AuthUser } from '../auth/auth.types';

const PILOT_ARTIFACT_ID = '10000000-0000-4000-8000-000000000001';

const PILOT_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    artifactId: PILOT_ARTIFACT_ID,
    eventType: 'edit',
    userId: 'dev-faculty-001',
    userName: 'Prof. Rao',
    userEmail: 'faculty@pes.edu',
    institutionId: '00000000-0000-4000-8000-000000000001',
    occurredAt: '2026-07-06T09:48:00.000Z',
    summary: 'Prof. Rao rephrased Q1b',
    field: 'question',
    beforeValue: 'Explain normalization with example.',
    afterValue: 'Define normalization and illustrate with a university schema example.',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    artifactId: PILOT_ARTIFACT_ID,
    eventType: 'approval',
    userId: 'dev-moderator-001',
    userName: 'Dr. Mehta',
    userEmail: 'moderator@pes.edu',
    institutionId: '00000000-0000-4000-8000-000000000001',
    occurredAt: '2026-07-06T11:02:00.000Z',
    summary: 'Moderator approved paper package',
    field: 'package',
    beforeValue: 'pending_moderation',
    afterValue: 'approved',
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    artifactId: '10000000-0000-4000-8000-000000000002',
    eventType: 'override',
    userId: 'dev-faculty-001',
    userName: 'Prof. Rao',
    userEmail: 'faculty@pes.edu',
    institutionId: '00000000-0000-4000-8000-000000000001',
    occurredAt: '2026-07-05T14:22:00.000Z',
    summary: 'Faculty overrode AI mark on Q3',
    field: 'mark',
    beforeValue: '4',
    afterValue: '5',
  },
];

@Injectable()
export class AuditStoreService {
  /** Append-only event log keyed by artifactId */
  private readonly byArtifact = new Map<string, AuditEvent[]>();

  constructor() {
    for (const event of PILOT_AUDIT_EVENTS) {
      const list = this.byArtifact.get(event.artifactId) ?? [];
      list.push(event);
      this.byArtifact.set(event.artifactId, list);
    }
  }

  listByArtifact(artifactId: string): AuditEvent[] {
    const events = this.byArtifact.get(artifactId) ?? [];
    return [...events].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    );
  }

  append(user: AuthUser, input: AppendAuditEventInput): AuditEvent {
    const event: AuditEvent = {
      id: randomUUID(),
      artifactId: input.artifactId,
      eventType: input.eventType,
      userId: user.sub,
      userName: user.name,
      userEmail: user.email,
      institutionId: user.institutionId,
      occurredAt: new Date().toISOString(),
      summary: input.summary,
      field: input.field,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
    };

    const list = this.byArtifact.get(input.artifactId) ?? [];
    list.push(event);
    this.byArtifact.set(input.artifactId, list);

    return event;
  }

  /** FR-47: audit entries are immutable — reject update/delete */
  assertImmutableOperation(): never {
    throw new ForbiddenException({
      code: 'AUDIT_IMMUTABLE',
      message: 'Audit log entries are append-only and cannot be modified or deleted',
    });
  }
}
