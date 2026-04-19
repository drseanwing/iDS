import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withRetry } from '../common/retry';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Postgres may still be coming up when the API boots (Docker Compose / K8s).
    // Retry $connect on transient errors rather than crashing the pod.
    await withRetry(() => this.$connect(), {
      maxAttempts: 5,
      baseDelayMs: 250,
    });
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Used by the readiness endpoint. Retries transient failures so a brief
  // network blip doesn't flap the pod out of the load balancer.
  async healthCheck(): Promise<void> {
    await withRetry(() => this.$queryRaw`SELECT 1`, {
      maxAttempts: 3,
      baseDelayMs: 100,
      timeoutMs: 2000,
    });
  }
}
