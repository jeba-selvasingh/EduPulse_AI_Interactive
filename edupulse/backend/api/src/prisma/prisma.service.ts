import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.connected = true;
    } catch (error) {
      // Pilot dev: API can serve institution list from fallback when Postgres is down
      console.warn(
        `[PrismaService] Database unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.$disconnect();
    }
  }
}
