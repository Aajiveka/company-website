/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OtpService } from './otp.service';
import { EmailService } from '@/common/email/email.service';
import { AuditService } from '@/modules/audit/audit.service';

// ── Mock factories ──────────────────────────────────────────────────────────
const mockDb = {
  secUser: { findFirst: mock.fn(), findUnique: mock.fn(), create: mock.fn(), update: mock.fn() },
  secMapUserRoles: { findFirst: mock.fn(), create: mock.fn() },
  secActiveSessions: { create: mock.fn(), findFirst: mock.fn(), deleteMany: mock.fn() },
  subscriberRegistration: { findFirst: mock.fn(), create: mock.fn() },
  subscriberCVDetails: { findFirst: mock.fn(), findUnique: mock.fn(), create: mock.fn(), update: mock.fn() },
  subscriberStatusHistory: { create: mock.fn() },
  mstrPerson: { findUnique: mock.fn(), findFirst: mock.fn() },
  authPasswordReset: { create: mock.fn(), findUnique: mock.fn(), update: mock.fn() },
  $transaction: mock.fn((fn: (db: typeof mockDb) => unknown) => fn(mockDb)),
};

const mockPrisma = { get client() { return mockDb; } };
const mockJwt = { signAsync: mock.fn(), verifyAsync: mock.fn() };
const mockOtp = {
  issue: mock.fn(),
  verify: mock.fn(),
  claimSend: mock.fn(),
  releaseSend: mock.fn(),
  peekPayload: mock.fn(),
};
const mockEmail = {
  sendWelcome: mock.fn(),
  sendPasswordReset: mock.fn(),
  sendEmailOtp: mock.fn(),
};
const mockAudit = { record: mock.fn(), recordLogin: mock.fn(), recordLogout: mock.fn() };

// Helpers
function resetAllMocks() {
  for (const table of Object.values(mockDb)) {
    if (typeof table === 'function') { (table as ReturnType<typeof mock.fn>).mock.resetCalls(); continue; }
    for (const fn of Object.values(table)) (fn as ReturnType<typeof mock.fn>).mock.resetCalls();
  }
  for (const fn of [mockJwt.signAsync, mockJwt.verifyAsync, mockOtp.issue, mockOtp.verify,
    mockOtp.claimSend, mockOtp.releaseSend, mockOtp.peekPayload,
    mockEmail.sendWelcome, mockEmail.sendPasswordReset, mockEmail.sendEmailOtp,
    mockAudit.record, mockAudit.recordLogin, mockAudit.recordLogout]) {
    fn.mock.resetCalls();
  }
}

// A valid argon2id hash of "correct-password"
let validHash: string;

async function buildService(): Promise<AuthService> {
  // Hash once for the whole suite
  if (!validHash) {
    const argon2 = (await import('argon2')).default;
    validHash = await argon2.hash('correct-password', { type: argon2.argon2id });
  }

  /**
   * Constructed directly rather than through Test.createTestingModule.
   *
   * Nest resolves constructor dependencies from `emitDecoratorMetadata`, which esbuild — and
   * therefore the tsx runner this suite uses — does not emit. Every injection came back
   * undefined, so all 42 tests failed on `this.prisma.client` before reaching an assertion.
   * Passing the mocks positionally sidesteps the container entirely; AuthService has no
   * lifecycle hooks, so there is nothing the container was contributing.
   */
  return new AuthService(
    mockPrisma as unknown as PrismaService,
    mockJwt as unknown as JwtService,
    mockOtp as unknown as OtpService,
    mockEmail as unknown as EmailService,
    mockAudit as unknown as AuditService,
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let svc: AuthService;

  beforeEach(async () => {
    resetAllMocks();
    // Default mock implementations
    mockJwt.signAsync.mock.mockImplementation(async () => 'tok');
    mockAudit.record.mock.mockImplementation(async () => {});
    mockAudit.recordLogin.mock.mockImplementation(async () => {});
    mockAudit.recordLogout.mock.mockImplementation(async () => {});
    mockDb.secActiveSessions.create.mock.mockImplementation(async () => ({}));
    mockDb.secActiveSessions.deleteMany.mock.mockImplementation(async () => ({}));
    mockEmail.sendWelcome.mock.mockImplementation(async () => {});
    mockEmail.sendPasswordReset.mock.mockImplementation(async () => {});
    mockEmail.sendEmailOtp.mock.mockImplementation(async () => {});
    // 0 = not on cooldown, which is the normal case for a fresh registration.
    mockOtp.claimSend.mock.mockImplementation(async () => 0);
    mockOtp.releaseSend.mock.mockImplementation(async () => {});
    svc = await buildService();
  });

  // ── login ──

  describe('login()', () => {
    const userRow = { userID: 1n, userName: '9876543210', password: '', nodeID: 10n, subscriberID: 5n };

    it('returns tokens and user on valid credentials', async () => {
      mockDb.secUser.findFirst.mock.mockImplementation(async () => ({ ...userRow, password: validHash }));
      mockDb.secMapUserRoles.findFirst.mock.mockImplementation(async () => ({ roleId: 1 }));
      mockDb.subscriberCVDetails.findUnique.mock.mockImplementation(async () => ({ fullName: 'Test User', emailID: 'test@x.com', mobileNo1: '9876543210' }));

      const result = await svc.login('9876543210', 'correct-password');
      assert.ok(result.accessToken);
      assert.ok(result.refreshToken);
      assert.equal(result.user.userId, 1);
      assert.equal(result.user.fullName, 'Test User');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockDb.secUser.findFirst.mock.mockImplementation(async () => ({ ...userRow, password: validHash }));
      await assert.rejects(() => svc.login('9876543210', 'wrong-password'), UnauthorizedException);
    });

    it('throws UnauthorizedException for missing user', async () => {
      mockDb.secUser.findFirst.mock.mockImplementation(async () => null);
      await assert.rejects(() => svc.login('unknown', 'any'), UnauthorizedException);
    });

    it('resolves email login through subscriberCVDetails', async () => {
      // First findFirst (by userName) returns null — user not found by mobile
      // Second findFirst call (inside userByEmail, looking up by subscriberID) returns the user
      let callCount = 0;
      mockDb.secUser.findFirst.mock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return null; // userName lookup
        return { ...userRow, password: validHash }; // subscriberID lookup
      });
      mockDb.subscriberCVDetails.findFirst.mock.mockImplementation(async () => ({ subscriberID: 5n }));
      mockDb.subscriberCVDetails.findUnique.mock.mockImplementation(async () => ({ fullName: 'Email User', emailID: 'e@x.com', mobileNo1: '9876543210' }));
      mockDb.secMapUserRoles.findFirst.mock.mockImplementation(async () => ({ roleId: 1 }));

      const result = await svc.login('e@x.com', 'correct-password');
      assert.equal(result.user.email, 'e@x.com');
    });
  });

  // ── refresh ──

  describe('refresh()', () => {
    it('rotates tokens on valid refresh', async () => {
      const payload = { sub: 1, roleId: 1, type: 'refresh', jti: 'session-1' };
      mockJwt.verifyAsync.mock.mockImplementation(async () => payload);
      mockDb.secActiveSessions.findFirst.mock.mockImplementation(async () => ({ sessionID: 'session-1' }));
      mockDb.secUser.findFirst.mock.mockImplementation(async () => ({ userID: 1n, userName: 'u', nodeID: 10n, subscriberID: 5n }));
      mockDb.subscriberCVDetails.findUnique.mock.mockImplementation(async () => ({ fullName: 'U', emailID: '', mobileNo1: 'u' }));

      const result = await svc.refresh('valid-token');
      assert.ok(result.accessToken);
      assert.equal(mockDb.secActiveSessions.deleteMany.mock.callCount(), 1);
    });

    it('throws on invalid JWT', async () => {
      mockJwt.verifyAsync.mock.mockImplementation(async () => { throw new Error('bad'); });
      await assert.rejects(() => svc.refresh('bad'), UnauthorizedException);
    });

    it('throws on revoked session', async () => {
      mockJwt.verifyAsync.mock.mockImplementation(async () => ({ sub: 1, roleId: 1, type: 'refresh', jti: 'gone' }));
      mockDb.secActiveSessions.findFirst.mock.mockImplementation(async () => null);
      await assert.rejects(() => svc.refresh('revoked'), UnauthorizedException);
    });
  });

  // ── logout ──

  describe('logout()', () => {
    it('revokes the session identified by jti', async () => {
      mockJwt.verifyAsync.mock.mockImplementation(async () => ({ sub: 1, jti: 'sess-x' }));
      await svc.logout('some-token');
      assert.equal(mockDb.secActiveSessions.deleteMany.mock.callCount(), 1);
      assert.equal(mockAudit.recordLogout.mock.callCount(), 1);
    });

    it('does nothing when token is undefined', async () => {
      await svc.logout(undefined);
      assert.equal(mockDb.secActiveSessions.deleteMany.mock.callCount(), 0);
    });
  });

  // ── register ──

  const FORM = {
    fullName: 'New Candidate',
    email: 'new@example.com',
    mobile: '9999999999',
    password: 'a-long-enough-password',
  };

  /** Nothing taken: neither the email nor the mobile resolves to an existing account. */
  function noExistingAccount() {
    mockDb.subscriberCVDetails.findFirst.mock.mockImplementation(async () => null);
    mockDb.secUser.findFirst.mock.mockImplementation(async () => null);
  }

  describe('register()', () => {
    it('emails an OTP and writes NOTHING to the database', async () => {
      noExistingAccount();
      mockOtp.issue.mock.mockImplementation(async () => '123456');

      const result = await svc.register(FORM);

      assert.equal(result.otpRequired, true);
      assert.match(result.registrationToken, /^[a-f0-9]{64}$/);
      assert.equal(result.email, 'new@example.com');
      assert.equal(mockEmail.sendEmailOtp.mock.callCount(), 1);
      // The account is created at verification, not here.
      assert.equal(mockDb.$transaction.mock.callCount(), 0);
      assert.equal(mockDb.subscriberRegistration.create.mock.callCount(), 0);
    });

    it('stores the password already hashed, never in plaintext', async () => {
      noExistingAccount();
      mockOtp.issue.mock.mockImplementation(async () => '123456');

      await svc.register(FORM);

      const payload = mockOtp.issue.mock.calls[0].arguments[2];
      assert.ok(payload.passwordHash.startsWith('$argon2id$'));
      assert.equal(payload.password, undefined);
      assert.ok(!JSON.stringify(payload).includes(FORM.password));
    });

    it('lowercases the email so casing cannot fork an account', async () => {
      noExistingAccount();
      mockOtp.issue.mock.mockImplementation(async () => '123456');

      const result = await svc.register({ ...FORM, email: '  New@Example.COM ' });
      assert.equal(result.email, 'new@example.com');
    });

    it('rejects an email that already has a verified account', async () => {
      mockDb.subscriberCVDetails.findFirst.mock.mockImplementation(async () => ({ subscriberID: 5n }));
      mockDb.secUser.findFirst.mock.mockImplementation(async () => null);

      await assert.rejects(() => svc.register(FORM), ConflictException);
      assert.equal(mockEmail.sendEmailOtp.mock.callCount(), 0);
    });

    it('rejects a mobile that already has a login', async () => {
      mockDb.subscriberCVDetails.findFirst.mock.mockImplementation(async () => null);
      mockDb.secUser.findFirst.mock.mockImplementation(async () => ({ userID: 1n }));

      await assert.rejects(() => svc.register(FORM), ConflictException);
      assert.equal(mockEmail.sendEmailOtp.mock.callCount(), 0);
    });

    it('refuses to send again while the cooldown is running', async () => {
      noExistingAccount();
      mockOtp.claimSend.mock.mockImplementation(async () => 42);

      await assert.rejects(
        () => svc.register(FORM),
        (err: HttpException) => err.getStatus() === 429,
      );
      assert.equal(mockEmail.sendEmailOtp.mock.callCount(), 0);
    });

    it('releases the cooldown when the email cannot be queued', async () => {
      noExistingAccount();
      mockOtp.issue.mock.mockImplementation(async () => '123456');
      mockEmail.sendEmailOtp.mock.mockImplementation(async () => {
        throw new Error('queue down');
      });

      await assert.rejects(() => svc.register(FORM), ServiceUnavailableException);
      // Otherwise a broker blip locks the address out for a full minute.
      assert.equal(mockOtp.releaseSend.mock.callCount(), 1);
    });
  });

  // ── verifyEmailOtp ──

  describe('verifyEmailOtp()', () => {
    const TOKEN = 'f'.repeat(64);
    const PENDING = {
      fullName: 'New Candidate',
      email: 'new@example.com',
      mobile: '9999999999',
      countryCode: '91',
      passwordHash: '$argon2id$fake',
    };

    function pendingVerifies() {
      mockOtp.verify.mock.mockImplementation(async () => ({ ok: true, payload: PENDING }));
      noExistingAccount();
      mockDb.subscriberRegistration.create.mock.mockImplementation(async () => ({ subscriberID: 10n }));
      mockDb.subscriberCVDetails.create.mock.mockImplementation(async () => ({}));
      mockDb.subscriberStatusHistory.create.mock.mockImplementation(async () => ({}));
      mockDb.secUser.create.mock.mockImplementation(async () => ({ userID: 20n }));
      mockDb.secMapUserRoles.create.mock.mockImplementation(async () => ({}));
    }

    it('creates the account and issues tokens on the correct code', async () => {
      pendingVerifies();

      const result = await svc.verifyEmailOtp(TOKEN, '123456');

      assert.ok(result.accessToken);
      assert.equal(result.user.userId, 20);
      assert.equal(result.user.email, 'new@example.com');
      assert.equal(result.user.fullName, 'New Candidate');
      // Registration, CV, status history, login and role mapping in one transaction.
      assert.equal(mockDb.$transaction.mock.callCount(), 1);
    });

    it('marks the email verified and stores the hash from the pending record', async () => {
      pendingVerifies();

      await svc.verifyEmailOtp(TOKEN, '123456');

      const cv = mockDb.subscriberCVDetails.create.mock.calls[0].arguments[0].data;
      assert.equal(cv.emailVerified, true);
      assert.ok(cv.emailVerifiedAt instanceof Date);
      assert.equal(cv.emailID, 'new@example.com');

      const user = mockDb.secUser.create.mock.calls[0].arguments[0].data;
      assert.equal(user.password, PENDING.passwordHash);
      assert.equal(user.pwdStatus, 1);
    });

    it('reports remaining attempts on a wrong code and creates nothing', async () => {
      mockOtp.verify.mock.mockImplementation(async () => ({ ok: false, attemptsRemaining: 3 }));

      await assert.rejects(
        () => svc.verifyEmailOtp(TOKEN, '000000'),
        (err: HttpException) => {
          const body = err.getResponse() as { attemptsRemaining: number; message: string };
          return (
            err.getStatus() === 400 &&
            body.attemptsRemaining === 3 &&
            body.message.includes('3 attempts remaining')
          );
        },
      );
      assert.equal(mockDb.$transaction.mock.callCount(), 0);
    });

    it('rejects when the email was claimed while the code was in flight', async () => {
      mockOtp.verify.mock.mockImplementation(async () => ({ ok: true, payload: PENDING }));
      // Someone else finished registering this address during the 10-minute window.
      mockDb.subscriberCVDetails.findFirst.mock.mockImplementation(async () => ({ subscriberID: 99n }));

      await assert.rejects(() => svc.verifyEmailOtp(TOKEN, '123456'), ConflictException);
      assert.equal(mockDb.$transaction.mock.callCount(), 0);
    });
  });

  // ── resendEmailOtp ──

  describe('resendEmailOtp()', () => {
    const TOKEN = 'f'.repeat(64);
    const PENDING = {
      fullName: 'New Candidate',
      email: 'new@example.com',
      mobile: '9999999999',
      countryCode: '91',
      passwordHash: '$argon2id$fake',
    };

    it('issues a fresh code reusing the pending record', async () => {
      mockOtp.peekPayload.mock.mockImplementation(async () => PENDING);
      mockOtp.issue.mock.mockImplementation(async () => '654321');

      const result = await svc.resendEmailOtp(TOKEN);

      assert.equal(result.email, 'new@example.com');
      assert.equal(mockEmail.sendEmailOtp.mock.callCount(), 1);
      // Re-issued under the same handle, carrying the same payload forward.
      assert.equal(mockOtp.issue.mock.calls[0].arguments[1], TOKEN);
      assert.deepEqual(mockOtp.issue.mock.calls[0].arguments[2], PENDING);
    });

    it('429s with the remaining wait while on cooldown', async () => {
      mockOtp.peekPayload.mock.mockImplementation(async () => PENDING);
      mockOtp.claimSend.mock.mockImplementation(async () => 17);

      await assert.rejects(
        () => svc.resendEmailOtp(TOKEN),
        (err: HttpException) => {
          const body = err.getResponse() as { retryAfterSeconds: number };
          return err.getStatus() === 429 && body.retryAfterSeconds === 17;
        },
      );
      assert.equal(mockEmail.sendEmailOtp.mock.callCount(), 0);
    });

    it('rejects an unknown or expired handle', async () => {
      mockOtp.peekPayload.mock.mockImplementation(async () => null);

      await assert.rejects(() => svc.resendEmailOtp(TOKEN), BadRequestException);
      assert.equal(mockEmail.sendEmailOtp.mock.callCount(), 0);
    });
  });

  // ── forgotPassword ──

  describe('forgotPassword()', () => {
    it('sends reset email for existing user', async () => {
      mockDb.secUser.findFirst.mock.mockImplementation(async () => ({ userID: 1n, nodeID: 5n }));
      mockDb.authPasswordReset.create.mock.mockImplementation(async () => ({}));
      mockDb.mstrPerson.findUnique.mock.mockImplementation(async () => ({ emailID: 'a@b.com' }));

      const result = await svc.forgotPassword('admin');
      assert.ok(result.message.includes('If that account exists'));
      assert.equal(mockEmail.sendPasswordReset.mock.callCount(), 1);
    });

    it('returns same response for non-existent user (no enumeration)', async () => {
      mockDb.secUser.findFirst.mock.mockImplementation(async () => null);
      const result = await svc.forgotPassword('ghost');
      assert.ok(result.message.includes('If that account exists'));
      assert.equal(mockEmail.sendPasswordReset.mock.callCount(), 0);
    });
  });

  // ── resetPassword ──

  describe('resetPassword()', () => {
    it('resets password with valid token', async () => {
      const reset = { resetID: 1, userID: 1n, usedAt: null, expiresAt: new Date(Date.now() + 3600_000) };
      mockDb.authPasswordReset.findUnique.mock.mockImplementation(async () => reset);
      mockDb.secUser.update.mock.mockImplementation(async () => ({}));
      mockDb.authPasswordReset.update.mock.mockImplementation(async () => ({}));

      const result = await svc.resetPassword('valid-token', 'new-pass');
      assert.ok(result.message.includes('updated'));
    });

    it('throws on expired token', async () => {
      const reset = { resetID: 1, userID: 1n, usedAt: null, expiresAt: new Date(Date.now() - 1000) };
      mockDb.authPasswordReset.findUnique.mock.mockImplementation(async () => reset);
      await assert.rejects(() => svc.resetPassword('expired', 'new'), BadRequestException);
    });

    it('throws on already-used token', async () => {
      const reset = { resetID: 1, userID: 1n, usedAt: new Date(), expiresAt: new Date(Date.now() + 3600_000) };
      mockDb.authPasswordReset.findUnique.mock.mockImplementation(async () => reset);
      await assert.rejects(() => svc.resetPassword('used', 'new'), BadRequestException);
    });
  });
});
