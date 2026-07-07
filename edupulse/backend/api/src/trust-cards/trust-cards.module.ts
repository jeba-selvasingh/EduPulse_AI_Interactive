import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { TrustCardsController } from './trust-cards.controller';
import { TrustCardsService } from './trust-cards.service';

@Module({
  imports: [AuthModule, ExplainabilityModule],
  controllers: [TrustCardsController],
  providers: [TrustCardsService],
  exports: [TrustCardsService],
})
export class TrustCardsModule {}
