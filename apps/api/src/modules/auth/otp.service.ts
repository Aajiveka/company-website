import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRedis } from './redis.provider';
import type Redis from 'ioredis';
import { randomInt, createHash } from 'node:crypto';

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Wrong code — carries how many guesses are left so the UI can warn before lockout. */
export interface OtpMismatch {
  ok: false;
  attemptsRemaining: number;
}

export interface OtpMatch<T> {
  ok: true;
  /** Whatever was handed to issue() as `payload`, or null if none was. */
  payload: T | null;
}

export type OtpResult<T> = OtpMatch<T> | OtpMismatch;

/**
 * Verify in one round trip so the attempt counter cannot be shared by concurrent guesses.
 * Read-then-write from the client lets N parallel requests all read attempts=0 and burn a
 * single slot between them, which turns a 5-guess limit into an unbounded one.
 *
 * Returns [status, detail]:
 *   -1 = no such key (expired or never issued)
 *   -2 = attempt limit exhausted (key destroyed)
 *    0 = wrong code, detail = attempts remaining
 *    1 = correct, detail = payload JSON ('' when none)
 */
const VERIFY_SCRIPT = `
local key = KEYS[1]
local given = ARGV[1]
local max = tonumber(ARGV[2])

if redis.call('EXISTS', key) == 0 then
  return {-1, ''}
end

local attempts = redis.call('HINCRBY', key, 'attempts', 1)
if attempts > max then
  redis.call('DEL', key)
  return {-2, ''}
end

if redis.call('HGET', key, 'hash') == given then
  local payload = redis.call('HGET', key, 'payload')
  redis.call('DEL', key)
  return {1, payload or ''}
end

return {0, max - attempts}
`;

/**
 * OTP lives in Redis, not the database: it is short-lived by definition and expiring it is
 * the store's job rather than a cleanup script. The code is stored hashed so a Redis dump
 * does not hand over live OTPs.
 *
 * An issue() may carry a `payload` — the registration details captured on the signup form.
 * Holding them here rather than in Postgres means an abandoned or unverified signup leaves
 * nothing behind: no half-built account rows to reap, and no unverified email occupying an
 * address someone else may legitimately own. The payload is written back out only when the
 * correct code is presented.
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

  private cooldownKey(purpose: string, subject: string) {
    return `otp:cooldown:${purpose}:${subject}`;
  }

  private hash(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Claim the right to send. Returns 0 when the caller may send, or the seconds remaining
   * when a code was already sent recently.
   *
   * Claiming and checking are the same operation on purpose: two concurrent resends would
   * otherwise both see an expired cooldown and both send. This is also why /register goes
   * through it — a cooldown that only /resend-otp honours is bypassed by re-posting the
   * registration form.
   */
  async claimSend(
    purpose: string,
    subject: string,
    cooldownSeconds = OTP_RESEND_COOLDOWN_SECONDS,
  ): Promise<number> {
    const key = this.cooldownKey(purpose, subject);
    const claimed = await this.redis.set(key, '1', 'EX', cooldownSeconds, 'NX');
    if (claimed) return 0;
    const ttl = await this.redis.ttl(key);
    // A key with no TTL (-1) or already gone (-2) must not report a negative wait.
    return ttl > 0 ? ttl : 0;
  }

  /** Drop the cooldown — used to roll back a claim when delivery could not be handed off. */
  async releaseSend(purpose: string, subject: string): Promise<void> {
    await this.redis.del(this.cooldownKey(purpose, subject));
  }

  /**
   * Returns the plaintext code so the caller can deliver it. Only its hash is stored.
   *
   * randomInt is rejection-sampled by Node, so all 10^6 codes are equally likely — `%`
   * on a random integer would bias the low end.
   */
  async issue(purpose: string, subject: string, payload?: unknown): Promise<string> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const key = this.key(purpose, subject);
    await this.redis
      .multi()
      .del(key) // a re-issue resets the attempt counter; never merge into a stale hash
      .hset(key, {
        hash: this.hash(code),
        attempts: 0,
        ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
      })
      .expire(key, OTP_TTL_SECONDS)
      .exec();
    return code;
  }

  /** The payload of an in-flight OTP, so a resend can reuse it without re-collecting the form. */
  async peekPayload<T>(purpose: string, subject: string): Promise<T | null> {
    const raw = await this.redis.hget(this.key(purpose, subject), 'payload');
    return raw ? (JSON.parse(raw) as T) : null;
  }

  /**
   * Consumes the OTP on success. Throws when there is nothing left to verify — an expired
   * code and an exhausted one are different messages because the user's next action differs.
   */
  async verify<T = unknown>(purpose: string, subject: string, code: string): Promise<OtpResult<T>> {
    const [status, detail] = (await this.redis.eval(
      VERIFY_SCRIPT,
      1,
      this.key(purpose, subject),
      this.hash(code),
      String(OTP_MAX_ATTEMPTS),
    )) as [number, string | number];

    if (status === -1) {
      throw new BadRequestException('This code has expired. Request a new one.');
    }
    if (status === -2) {
      throw new BadRequestException('Too many incorrect attempts. Request a new code.');
    }
    if (status === 1) {
      const raw = String(detail);
      return { ok: true, payload: raw ? (JSON.parse(raw) as T) : null };
    }
    return { ok: false, attemptsRemaining: Number(detail) };
  }
}
