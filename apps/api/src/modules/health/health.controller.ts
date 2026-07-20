import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { env } from '@/config/env';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + database connectivity' })
  async check() {
    const db = await this.prisma.client
      .$queryRaw`SELECT 1`.then(() => 'up' as const)
      .catch(() => 'down' as const);
    return { status: db === 'up' ? 'ok' : 'degraded', env: env.NODE_ENV, db };
  }
}
