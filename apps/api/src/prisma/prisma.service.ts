import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from './prisma.client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /** The Prisma 7 client is built around a driver adapter, so it is composed rather than extended. */
  readonly client: PrismaClient = createPrismaClient();

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
