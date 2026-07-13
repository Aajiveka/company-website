import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { env } from '@/config/env';
import { AuthModule } from '@/modules/auth/auth.module';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { ClientsModule } from '@/modules/clients/clients.module';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { RecruitmentModule } from '@/modules/recruitment/recruitment.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { FilesModule } from '@/modules/files/files.module';
import { ExportsModule } from '@/modules/exports/exports.module';
import { HealthController } from '@/modules/health/health.controller';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    BullModule.forRoot({ connection: { url: env.REDIS_URL } }),
    NotificationsModule,
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    JobsModule,
    CandidatesModule,
    ClientsModule,
    RecruitmentModule,
    StorageModule,
    FilesModule,
    ExportsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Routes are authenticated by default; opt out with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
