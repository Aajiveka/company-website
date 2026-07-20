import { Inject, type Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '@/config/env';

export const REDIS = Symbol('REDIS');
export const InjectRedis = () => Inject(REDIS);

export const redisProvider: Provider = {
  provide: REDIS,
  useFactory: () => new Redis(env.REDIS_URL),
};
