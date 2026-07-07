import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { TrustCardsModule } from '../trust-cards/trust-cards.module';
import { AnswerKeyService } from './answer-key.service';
import { CoPoMappingService } from './co-po-mapping.service';
import { PaperExportService } from './paper-export.service';
import { NotificationsStoreService } from './notifications-store.service';
import { PaperCraftService } from './paper-craft.service';
import { PaperCraftStoreService } from './paper-craft-store.service';
import { PaperModerationService } from './paper-moderation.service';
import { PaperModerationStoreService } from './paper-moderation-store.service';

@Module({
  imports: [AuthModule, TrustCardsModule, ExplainabilityModule, InstitutionsModule],
  providers: [
    PaperCraftStoreService,
    PaperModerationStoreService,
    NotificationsStoreService,
    PaperCraftService,
    AnswerKeyService,
    CoPoMappingService,
    PaperModerationService,
    PaperExportService,
    RbacGuard,
  ],
  exports: [
    PaperCraftService,
    PaperCraftStoreService,
    AnswerKeyService,
    CoPoMappingService,
    PaperModerationService,
    PaperExportService,
    NotificationsStoreService,
  ],
})
export class PaperCraftModule {}
