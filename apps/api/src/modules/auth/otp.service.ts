import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRedis } from './redis.provider';
import type Redis from 'ioredis';
import { randomInt, createHash } from 'node:crypto';

const TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 5;

/**
 * OTP lives in Redis, not the database: it is short-lived by definition and expiring it is
 * the store's job rather than a cleanup script. The code is stored hashed so a Redis dump
 * does not hand over live OTPs.
 *
 * This flow was in the legacy C# (CommonController.SendOtp / VerifyOtp), which the rebuild
 * deliberately did not recover — so this is a fresh design, not a port. Behaviour may
 * differ from legacy and should be reviewed.
 */
@Injectable()
export class OtpService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  private key(purpose: string, subject: string) {
    return `otp:${purpose}:${subject}`;
  }

  private hash(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  /** Returns the plaintext code so the caller can deliver it. It is never stored. */
  async issue(purpose: string, subject: string): Promise<string> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis
      .multi()
      .hset(this.key(purpose, subject), { hash: this.hash(code), attempts: 0 })
      .expire(this.key(purpose, subject), TTL_SECONDS)
      .exec();
    return code;
  }

  async verify(purpose: string, subject: string, code: string): Promise<boolean> {
    const key = this.key(purpose, subject);
    const record = await this.redis.hgetall(key);
    if (!record?.hash) throw new BadRequestException('This code has expired. Request a new one.');

    // Rate-limit the guesses: 6 digits is only a million combinations.
    const attempts = Number(record.attempts ?? 0) + 1;
    if (attempts > MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new BadRequestException('Too many incorrect attempts. Request a new code.');
    }

    if (record.hash !== this.hash(code)) {
      await this.redis.hset(key, 'attempts', attempts);
      return false;
    }
    await this.redis.del(key);
    return true;
  }
}
