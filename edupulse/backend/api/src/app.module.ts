import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlueprintModule } from './blueprint/blueprint.module';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { SyllabusModule } from './syllabus/syllabus.module';
import { CohortModule } from './cohort/cohort.module';
import { ConsentModule } from './consent/consent.module';
import { ExplainabilityModule } from './explainability/explainability.module';
import { FeaturesModule } from './features/features.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { ObservabilityModule } from './observability/observability.module';
import { MarksModule } from './marks/marks.module';
import { DiagnosisModule } from './diagnosis/diagnosis.module';
import { CampusDriveModule } from './campus-drive/campus-drive.module';
import { CollegeRadarModule } from './college-radar/college-radar.module';
import { DeanPulseModule } from './dean-pulse/dean-pulse.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { PaperCraftModule } from './paper-craft/paper-craft.module';
import { PrismaModule } from './prisma/prisma.module';
import { TrustCardsModule } from './trust-cards/trust-cards.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    ObservabilityModule,
    ConsentModule,
    CohortModule,
    AvailabilityModule,
    SyllabusModule,
    BlueprintModule,
    PaperCraftModule,
    MarksModule,
    EvaluationModule,
    DiagnosisModule,
    CampusDriveModule,
    DeanPulseModule,
    CollegeRadarModule,
    AuthModule,
    ExplainabilityModule,
    TrustCardsModule,
    FeaturesModule,
    HealthModule,
    HomeModule,
    InstitutionsModule,
  ],
})
export class AppModule {}
