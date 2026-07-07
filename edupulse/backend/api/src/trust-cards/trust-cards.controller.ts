import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { trustCardSchema } from './trust-cards.schema';
import { TrustCardsService } from './trust-cards.service';

@Controller('trust-cards')
@UseGuards(JwtAuthGuard)
export class TrustCardsController {
  constructor(private readonly trustCards: TrustCardsService) {}

  @Get(':artifactId')
  getByArtifactId(@Param('artifactId') artifactId: string) {
    return trustCardSchema.parse(this.trustCards.getById(artifactId));
  }
}
