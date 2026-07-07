import { Controller, Get, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { healthResponseSchema } from './health.schema';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get()
  getHealth() {
    const payload = healthResponseSchema.parse({
      status: 'ok',
      service: 'edupulse-api',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      JSON.stringify({
        correlationId: randomUUID(),
        action: 'health_check',
        durationMs: 0,
      }),
    );

    return payload;
  }
}
