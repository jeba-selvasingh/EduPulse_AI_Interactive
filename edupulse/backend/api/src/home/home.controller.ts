import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConsentGuard } from '../consent/consent.guard';
import { homeSummarySchema } from './home.schema';
import { HomeService } from './home.service';

@Controller('home')
@UseGuards(JwtAuthGuard, ConsentGuard)
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser) {
    return { data: homeSummarySchema.parse(this.home.getSummary(user)) };
  }
}
