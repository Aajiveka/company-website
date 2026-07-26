import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type Redis from 'ioredis';
import * as fs from 'fs';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { REDIS } from '@/modules/auth/redis.provider';
import { env } from '@/config/env';

type ServiceStatus = 'up' | 'down';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + database / Redis / disk connectivity' })
  @ApiResponse({ status: 200, description: 'Health status of the API and its dependencies' })
  async check() {
    const [db, redis, disk] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
      this.checkDisk(),
    ]);

    const allUp = db === 'up' && redis === 'up' && disk === 'up';

    return {
      status: allUp ? 'ok' : 'degraded',
      env: env.NODE_ENV,
      db,
      redis,
      disk,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDb(): Promise<ServiceStatus> {
    return this.prisma.client
      .$queryRaw`SELECT 1`
      .then(() => 'up' as const)
      .catch(() => 'down' as const);
  }

  private async checkRedis(): Promise<ServiceStatus> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }

  private async checkDisk(): Promise<ServiceStatus> {
    try {
      const stats = fs.statfsSync('/');
      // bfree and bsize may be bigint on some platforms
      const freeBytes = Number(stats.bfree) * Number(stats.bsize);
      const minFreeBytes = 100 * 1024 * 1024; // 100 MB
      return freeBytes > minFreeBytes ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
