import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { TrustCardsModule } from '../trust-cards/trust-cards.module';
import { BlueprintModule } from '../blueprint/blueprint.module';
import { PaperCraftModule } from '../paper-craft/paper-craft.module';
import { SyllabusModule } from '../syllabus/syllabus.module';
import { NotificationsController, PaperCraftController } from './features.controller';

@Module({
  imports: [AuthModule, ConsentModule, TrustCardsModule, SyllabusModule, BlueprintModule, PaperCraftModule, ObservabilityModule],
  controllers: [PaperCraftController, NotificationsController],
  providers: [RbacGuard],
})
export class FeaturesModule {}
