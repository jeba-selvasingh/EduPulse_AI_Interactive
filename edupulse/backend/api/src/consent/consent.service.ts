import { ForbiddenException, Injectable } from '@nestjs/common';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { AuthUser } from '../auth/auth.types';
import type { ConsentPolicy, ConsentStatus } from './consent.schema';
import { ConsentStoreService } from './consent-store.service';

@Injectable()
export class ConsentService {
  constructor(
    private readonly store: ConsentStoreService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getPolicy(): ConsentPolicy {
    return this.store.getPolicy();
  }

  getStatus(user: AuthUser): ConsentStatus {
    const policy = this.store.getPolicy();
    const acceptance = this.store.getAcceptance(user.institutionId, user.sub);

    const accepted =
      acceptance && acceptance.version === policy.version ? acceptance : undefined;

    return {
      required: !accepted,
      currentVersion: policy.version,
      acceptedVersion: accepted?.version ?? null,
      acceptedAt: accepted?.acceptedAt ?? null,
    };
  }

  hasValidConsent(user: AuthUser): boolean {
    return !this.getStatus(user).required;
  }

  accept(user: AuthUser) {
    const started = Date.now();
    const policy = this.store.getPolicy();
    const record = this.store.recordAcceptance(user.institutionId, user.sub, policy.version);

    this.actionLogger.logAction({
      action: LogAction.ConsentAccept,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { policyVersion: policy.version },
    });

    return {
      acceptedVersion: record.version,
      acceptedAt: record.acceptedAt,
    };
  }

  decline(user: AuthUser) {
    const started = Date.now();
    const policy = this.store.getPolicy();

    this.store.clearAcceptance(user.institutionId, user.sub);

    this.actionLogger.logAction({
      action: LogAction.ConsentDecline,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { policyVersion: policy.version },
    });

    return { loggedOut: true };
  }

  updatePolicy(
    version: string,
    partial?: { summary?: string; retentionPolicy?: string },
  ): ConsentPolicy {
    return this.store.updatePolicyVersion(version, partial);
  }

  assertConsent(user: AuthUser): void {
    if (!this.hasValidConsent(user)) {
      throw new ForbiddenException({
        code: 'CONSENT_REQUIRED',
        message: 'Accept the data processing notice before accessing this resource.',
      });
    }
  }
}
