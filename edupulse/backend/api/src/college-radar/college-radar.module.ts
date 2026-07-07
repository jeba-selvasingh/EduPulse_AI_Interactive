import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { CollegeRadarController } from './college-radar.controller';
import { CutoffTrackerService } from './cutoff-tracker.service';
import { GapActionService } from './gap-action.service';
import { NaacPredictionService } from './naac-prediction.service';
import { NirfRadarService } from './nirf-radar.service';
import { PeerLeagueService } from './peer-league.service';
import { RivalFeedStoreService } from './rival-feed-store.service';
import { RivalFeedService } from './rival-feed.service';

@Module({
  imports: [AuthModule, ConsentModule, ObservabilityModule],
  controllers: [CollegeRadarController],
  providers: [
    PeerLeagueService,
    NirfRadarService,
    CutoffTrackerService,
    RivalFeedStoreService,
    RivalFeedService,
    GapActionService,
    NaacPredictionService,
    RbacGuard,
  ],
})
export class CollegeRadarModule {}
