import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import type { AppendAuditEventInput, AuditEvent } from './audit-event.schema';
import { AuditStoreService } from './audit-store.service';

/**
 * AD-8: shared explainability layer — all AI modules append audit events here.
 * Human overrides append; history is never mutated.
 */
@Injectable()
export class ExplainabilityService {
  constructor(private readonly auditStore: AuditStoreService) {}

  getAuditTrail(artifactId: string): AuditEvent[] {
    return this.auditStore.listByArtifact(artifactId);
  }

  appendAuditEvent(user: AuthUser, input: AppendAuditEventInput): AuditEvent {
    return this.auditStore.append(user, input);
  }

  rejectMutation(): never {
    return this.auditStore.assertImmutableOperation();
  }
}
