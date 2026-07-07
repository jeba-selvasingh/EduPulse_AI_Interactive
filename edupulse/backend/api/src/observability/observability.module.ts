import { forwardRef, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacGuard } from '../rbac/rbac.guard';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { ObservabilityController } from './observability.controller';
import { StructuredLoggerService } from './structured-logger.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [ObservabilityController],
  providers: [StructuredLoggerService, CorrelationIdMiddleware, RbacGuard],
  exports: [StructuredLoggerService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
