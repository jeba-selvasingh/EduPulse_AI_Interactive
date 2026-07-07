import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { ComponentHealth, ComponentId } from './availability.schema';

const COMPONENT_IDS: ComponentId[] = [
  'api',
  'worker',
  'postgresql',
  'redis',
  'minio',
  'llm',
];

@Injectable()
export class ComponentHealthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async checkAll(simulateFailure?: ComponentId): Promise<ComponentHealth[]> {
    const results = await Promise.all(
      COMPONENT_IDS.map((id) => this.checkComponent(id, simulateFailure === id)),
    );
    return results;
  }

  private async checkComponent(id: ComponentId, forceFail: boolean): Promise<ComponentHealth> {
    const started = Date.now();

    if (forceFail) {
      return {
        id,
        status: 'down',
        latencyMs: Date.now() - started,
        message: 'Simulated failure (pilot)',
      };
    }

    switch (id) {
      case 'api':
        return { id, status: 'ok', latencyMs: Date.now() - started };
      case 'postgresql':
        return this.checkPostgres(started);
      case 'worker':
        return this.checkHttpDependency(id, 'WORKER_HEALTH_URL', started);
      case 'redis':
        return this.checkHttpDependency(id, 'REDIS_HEALTH_URL', started);
      case 'minio':
        return this.checkHttpDependency(id, 'MINIO_HEALTH_URL', started);
      case 'llm':
        return this.checkHttpDependency(id, 'LLM_HEALTH_URL', started);
      default:
        return { id, status: 'down', latencyMs: 0, message: 'Unknown component' };
    }
  }

  private async checkPostgres(started: number): Promise<ComponentHealth> {
    if (!this.prisma.isConnected()) {
      const devOk = this.config.get<string>('AUTH_DEV_MODE', 'true') === 'true';
      return {
        id: 'postgresql',
        status: devOk ? 'degraded' : 'down',
        latencyMs: Date.now() - started,
        message: devOk ? 'Pilot fallback — DB not connected' : 'PostgreSQL unreachable',
      };
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { id: 'postgresql', status: 'ok', latencyMs: Date.now() - started };
    } catch {
      return {
        id: 'postgresql',
        status: 'down',
        latencyMs: Date.now() - started,
        message: 'Query failed',
      };
    }
  }

  private async checkHttpDependency(
    id: ComponentId,
    envKey: string,
    started: number,
  ): Promise<ComponentHealth> {
    const url = this.config.get<string>(envKey, '');
    const devMode = this.config.get<string>('AUTH_DEV_MODE', 'true') === 'true';

    if (!url) {
      return {
        id,
        status: devMode ? 'ok' : 'degraded',
        latencyMs: Date.now() - started,
        message: devMode ? 'Pilot stub — endpoint not configured' : `${envKey} not set`,
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      return {
        id,
        status: response.ok ? 'ok' : 'degraded',
        latencyMs: Date.now() - started,
        message: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        id,
        status: devMode ? 'degraded' : 'down',
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : 'Unreachable',
      };
    }
  }
}
