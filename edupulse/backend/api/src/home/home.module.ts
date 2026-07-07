import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { DeanPulseModule } from '../dean-pulse/dean-pulse.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [AuthModule, ConsentModule, DeanPulseModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
