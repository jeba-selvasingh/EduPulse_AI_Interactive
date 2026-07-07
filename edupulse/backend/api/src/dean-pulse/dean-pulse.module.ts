import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { AlertInboxStoreService } from './alert-inbox-store.service';
import { AlertInboxService } from './alert-inbox.service';
import { DeanPulseController } from './dean-pulse.controller';
import { DigestPreferencesStoreService } from './digest-preferences-store.service';
import { InstitutionPulseService } from './institution-pulse.service';
import { MondayDigestService } from './monday-digest.service';
import { WhatsAppDigestQueueService } from './whatsapp-digest-queue.service';

@Module({
  imports: [AuthModule, ConsentModule, ObservabilityModule],
  controllers: [DeanPulseController],
  providers: [
    InstitutionPulseService,
    AlertInboxService,
    AlertInboxStoreService,
    MondayDigestService,
    DigestPreferencesStoreService,
    WhatsAppDigestQueueService,
    RbacGuard,
  ],
  exports: [AlertInboxService],
})
export class DeanPulseModule {}
