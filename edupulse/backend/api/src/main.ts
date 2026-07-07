import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.setGlobalPrefix('api');

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081,exp://localhost:8081')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  const port = Number(process.env.API_PORT ?? 3000);
  const host = process.env.API_HOST ?? '0.0.0.0';

  await app.listen(port, host);

  const logger = new Logger('Bootstrap');
  logger.log(`EduPulse API listening on http://${host}:${port}/api`);
}

void bootstrap();
