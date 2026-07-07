import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { Permission } from '../rbac/permissions';
import { RbacGuard } from '../rbac/rbac.guard';
import { CutoffTrackerService } from './cutoff-tracker.service';
import { GapActionService } from './gap-action.service';
import { NaacPredictionService } from './naac-prediction.service';
import { NirfRadarService } from './nirf-radar.service';
import { PeerLeagueService } from './peer-league.service';
import { upsertFeedItemSchema } from './rival-feed.schema';
import { RivalFeedService } from './rival-feed.service';

@Controller()
@UseGuards(JwtAuthGuard, RbacGuard, ConsentGuard)
export class CollegeRadarController {
  constructor(
    private readonly peerLeague: PeerLeagueService,
    private readonly nirfRadar: NirfRadarService,
    private readonly cutoffTracker: CutoffTrackerService,
    private readonly rivalFeed: RivalFeedService,
    private readonly gapAction: GapActionService,
    private readonly naacPrediction: NaacPredictionService,
  ) {}

  @Get('college-radar/league')
  @RequirePermissions(Permission.CollegeRadarRead)
  getLeague(@CurrentUser() user: AuthUser) {
    return { data: this.peerLeague.getLeagueTable(user) };
  }

  @Get('college-radar/nirf-radar')
  @RequirePermissions(Permission.CollegeRadarRead)
  getNirfRadar(
    @CurrentUser() user: AuthUser,
    @Query('rivalId') rivalId = 'rival-a',
  ) {
    return { data: this.nirfRadar.getComparison(user, rivalId) };
  }

  @Get('college-radar/cutoff-tracker')
  @RequirePermissions(Permission.CollegeRadarRead)
  getCutoffTracker(@CurrentUser() user: AuthUser) {
    return { data: this.cutoffTracker.getTracker(user) };
  }

  @Get('college-radar/rival-feed')
  @RequirePermissions(Permission.CollegeRadarRead)
  listRivalFeed(@CurrentUser() user: AuthUser) {
    return { data: this.rivalFeed.listFeed(user) };
  }

  @Post('college-radar/rival-feed')
  @RequirePermissions(Permission.ConsentManage)
  createFeedItem(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = upsertFeedItemSchema.parse(body);
    return { data: this.rivalFeed.createItem(user, input) };
  }

  @Patch('college-radar/rival-feed/:id')
  @RequirePermissions(Permission.ConsentManage)
  updateFeedItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const patch = upsertFeedItemSchema.partial().parse(body);
    return { data: this.rivalFeed.updateItem(user, id, patch) };
  }

  @Get('college-radar/gap-action')
  @RequirePermissions(Permission.CollegeRadarRead)
  getGapAction(
    @CurrentUser() user: AuthUser,
    @Query('rivalId') rivalId = 'rival-a',
  ) {
    return { data: this.gapAction.getPlan(user, rivalId) };
  }

  @Get('college-radar/naac-prediction')
  @RequirePermissions(Permission.CollegeRadarRead)
  getNaacPrediction(@CurrentUser() user: AuthUser) {
    return { data: this.naacPrediction.getPrediction(user) };
  }
}
