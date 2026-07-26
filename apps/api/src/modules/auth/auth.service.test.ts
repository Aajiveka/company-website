// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { Test } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OtpService } from './otp.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
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
const mockOtp = { issue: mock.fn(), verify: mock.fn() };
const mockNotifications = { sendSms: mock.fn() };
const mockEmail = { sendWelcome: mock.fn(), sendPasswordReset: mock.fn() };
const mockAudit = { record: mock.fn(), recordLogin: mock.fn(), recordLogout: mock.fn() };

// Helpers
function resetAllMocks() {
  for (const table of Object.values(mockDb)) {
    if (typeof table === 'function') { (table as ReturnType<typeof mock.fn>).mock.resetCalls(); continue; }
    for (const fn of Object.values(table)) (fn as ReturnType<typeof mock.fn>).mock.resetCalls();
  }
  for (const fn of [mockJwt.signAsync, mockJwt.verifyAsync, mockOtp.issue, mockOtp.verify,
    mockNotifications.sendSms, mockEmail.sendWelcome, mockEmail.sendPasswordReset,
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

  const mod = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: JwtService, useValue: mockJwt },
      { provide: OtpService, useValue: mockOtp },
      { provide: NotificationsService, useValue: mockNotifications },
      { provide: EmailService, useValue: mockEmail },
      { provide: AuditService, useValue: mockAudit },
    ],
  }).compile();
  return mod.get(AuthService);
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
    mockNotifications.sendSms.mock.mockImplementation(async () => {});
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

  describe('register()', () => {
    it('creates subscriber and sends OTP for new mobile', async () => {
      mockDb.subscriberRegistration.findFirst.mock.mockImplementation(async () => null);
      mockDb.subscriberRegistration.create.mock.mockImplementation(async () => ({ subscriberID: 42n }));
      mockDb.subscriberCVDetails.create.mock.mockImplementation(async () => ({}));
      mockDb.subscriberStatusHistory.create.mock.mockImplementation(async () => ({}));
      mockOtp.issue.mock.mockImplementation(async () => '123456');

      const result = await svc.register({ mobile: '9999999999' });
      assert.equal(result.otpRequired, true);
      assert.equal(mockNotifications.sendSms.mock.callCount(), 1);
    });

    it('resends OTP for existing mobile without creating new registration', async () => {
      mockDb.subscriberRegistration.findFirst.mock.mockImplementation(async () => ({ subscriberID: 7n }));
      mockOtp.issue.mock.mockImplementation(async () => '654321');

      const result = await svc.register({ mobile: '9999999999' });
      assert.equal(result.otpRequired, true);
      // Should NOT have called $transaction (no new registration)
      assert.equal(mockDb.$transaction.mock.callCount(), 0);
    });
  });

  // ── verifyOtp ──

  describe('verifyOtp()', () => {
    it('creates user and issues tokens on correct code', async () => {
      mockOtp.verify.mock.mockImplementation(async () => true);
      mockDb.subscriberRegistration.findFirst.mock.mockImplementation(async () => ({ subscriberID: 10n }));
      mockDb.secUser.findFirst.mock.mockImplementation(async () => null);
      mockDb.secUser.create.mock.mockImplementation(async () => ({ userID: 20n, userName: '9999999999', nodeID: 10n }));
      mockDb.secMapUserRoles.create.mock.mockImplementation(async () => ({}));
      mockDb.subscriberCVDetails.findUnique.mock.mockImplementation(async () => ({ fullName: 'New', emailID: '', mobileNo1: '9999999999' }));

      const result = await svc.verifyOtp('9999999999', '123456');
      assert.ok(result.accessToken);
      assert.equal(result.user.userId, 20);
    });

    it('throws BadRequestException on wrong code', async () => {
      mockOtp.verify.mock.mockImplementation(async () => false);
      await assert.rejects(() => svc.verifyOtp('9999999999', '000000'), BadRequestException);
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
