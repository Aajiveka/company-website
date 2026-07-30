/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { BadRequestException } from '@nestjs/common';
import type Redis from 'ioredis';
import { OtpService, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS } from './otp.service';

/**
 * These cover the TypeScript side: how the Lua script's status codes are turned into results
 * and exceptions, and which Redis commands the cooldown issues.
 *
 * The script BODY is not exercised here — it runs inside Redis, so a mock cannot execute it.
 * The attempt counting, atomic decrement and key destruction it implements still need an
 * integration test against a real Redis instance.
 */
const mockRedis = {
  eval: mock.fn(),
  set: mock.fn(),
  ttl: mock.fn(),
  del: mock.fn(),
  hget: mock.fn(),
  hset: mock.fn(),
  expire: mock.fn(),
  multi: mock.fn(),
  exec: mock.fn(),
};

/** `multi()` returns a chainable builder; every command returns the builder itself. */
function chainableMulti() {
  const chain = {
    del: () => chain,
    hset: () => chain,
    expire: () => chain,
    exec: async () => [],
  };
  return chain;
}

describe('OtpService', () => {
  let svc: OtpService;

  beforeEach(() => {
    for (const fn of Object.values(mockRedis)) fn.mock?.resetCalls();
    mockRedis.multi.mock.mockImplementation(chainableMulti);
    svc = new OtpService(mockRedis as unknown as Redis);
  });

  describe('verify()', () => {
    it('returns the parsed payload when the code matches', async () => {
      const payload = { email: 'a@b.com', passwordHash: '$argon2id$x' };
      mockRedis.eval.mock.mockImplementation(async () => [1, JSON.stringify(payload)]);

      const result = await svc.verify('register:email', 'handle', '123456');

      assert.equal(result.ok, true);
      assert.deepEqual(result.payload, payload);
    });

    it('returns ok with a null payload when none was stored', async () => {
      mockRedis.eval.mock.mockImplementation(async () => [1, '']);

      const result = await svc.verify('register:email', 'handle', '123456');

      assert.equal(result.ok, true);
      assert.equal(result.payload, null);
    });

    it('reports remaining attempts on a mismatch instead of throwing', async () => {
      mockRedis.eval.mock.mockImplementation(async () => [0, 2]);

      const result = await svc.verify('register:email', 'handle', '000000');

      assert.equal(result.ok, false);
      assert.equal(result.attemptsRemaining, 2);
    });

    it('throws a distinct message for an expired code', async () => {
      mockRedis.eval.mock.mockImplementation(async () => [-1, '']);

      await assert.rejects(
        () => svc.verify('register:email', 'handle', '123456'),
        (err: BadRequestException) => /expired/i.test(err.message),
      );
    });

    it('throws a distinct message once attempts are exhausted', async () => {
      mockRedis.eval.mock.mockImplementation(async () => [-2, '']);

      await assert.rejects(
        () => svc.verify('register:email', 'handle', '123456'),
        (err: BadRequestException) => /too many/i.test(err.message),
      );
    });

    it('hashes the code before it reaches Redis', async () => {
      mockRedis.eval.mock.mockImplementation(async () => [0, 4]);

      await svc.verify('register:email', 'handle', '123456');

      const args = mockRedis.eval.mock.calls[0].arguments;
      // eval(script, numKeys, key, hashedCode, maxAttempts)
      assert.match(args[3], /^[a-f0-9]{64}$/);
      assert.ok(!args.includes('123456'));
      assert.equal(args[4], String(OTP_MAX_ATTEMPTS));
    });
  });

  describe('claimSend()', () => {
    it('claims with SET NX and a TTL so two callers cannot both send', async () => {
      mockRedis.set.mock.mockImplementation(async () => 'OK');

      const wait = await svc.claimSend('register:email', 'a@b.com');

      assert.equal(wait, 0);
      const args = mockRedis.set.mock.calls[0].arguments;
      assert.deepEqual(args.slice(1), ['1', 'EX', OTP_RESEND_COOLDOWN_SECONDS, 'NX']);
    });

    it('returns the remaining TTL when a code was already sent', async () => {
      mockRedis.set.mock.mockImplementation(async () => null);
      mockRedis.ttl.mock.mockImplementation(async () => 37);

      assert.equal(await svc.claimSend('register:email', 'a@b.com'), 37);
    });

    it('never reports a negative wait when the key has no TTL', async () => {
      mockRedis.set.mock.mockImplementation(async () => null);
      // -1 = exists but no expiry, -2 = already gone. Both must read as "may send".
      for (const ttl of [-1, -2]) {
        mockRedis.ttl.mock.mockImplementation(async () => ttl);
        assert.equal(await svc.claimSend('register:email', 'a@b.com'), 0);
      }
    });
  });

  describe('issue()', () => {
    it('returns a zero-padded 6-digit code', async () => {
      for (let i = 0; i < 40; i++) {
        const code = await svc.issue('register:email', 'handle');
        assert.match(code, /^[0-9]{6}$/);
      }
    });
  });

  describe('peekPayload()', () => {
    it('parses a stored payload', async () => {
      mockRedis.hget.mock.mockImplementation(async () => JSON.stringify({ email: 'a@b.com' }));

      assert.deepEqual(await svc.peekPayload('register:email', 'handle'), { email: 'a@b.com' });
    });

    it('returns null when nothing is in flight', async () => {
      mockRedis.hget.mock.mockImplementation(async () => null);

      assert.equal(await svc.peekPayload('register:email', 'handle'), null);
    });
  });
});
