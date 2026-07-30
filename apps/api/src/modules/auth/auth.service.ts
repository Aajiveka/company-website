import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '@/config/env';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmailService } from '@/common/email/email.service';
import { Role, type RoleId } from '@/shared/roles';
import {
  OtpService,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
} from './otp.service';

/**
 * tblPMstNodeTypes: NodeType 100 = "Subscriber", DetTable "tblsubscribers".
 *
 * tblSecUser.NodeID is polymorphic — for a SUBSCRIBER it is the SubscriberID
 * (spSubscriberRegistration writes `NodeID = @SubscriberID, NodeType = 100`, and the legacy
 * C# reads it back as `Session["NodeID"] = dr["SubscriberID"]`); for every other role it is
 * a tblMstrPerson node, which is how spClientGetCompanyInfo joins it.
 *
 * We keep NodeID meaning the same thing it did, and ALSO carry the explicit
 * tblSecUser.SubscriberID column, so nothing downstream has to know about the polymorphism.
 */
const NODE_TYPE_SUBSCRIBER = 100;

/** tblMstrStatus 1 = "Account created" — the first step of the candidate journey. */
const STATUS_ACCOUNT_CREATED = 1;

/** Namespace for the registration OTP in Redis. */
const REGISTER_PURPOSE = 'register:email';

/**
 * A signup waiting on its emailed code. Held in Redis under the OTP, never in Postgres, so an
 * abandoned registration expires instead of leaving rows behind.
 *
 * `passwordHash` is Argon2id — hashed in register(), before the record is written, so the
 * plaintext password exists only for the duration of that one request.
 */
interface PendingRegistration {
  fullName: string;
  email: string;
  mobile: string;
  countryCode: string;
  passwordHash: string;
  ipAddress?: string;
}

/**
 * Addresses are compared and stored lowercased. The domain is case-insensitive by spec and
 * every mailbox provider this serves treats the local part that way too, so folding here stops
 * `A@x.com` and `a@x.com` from becoming two accounts.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The tblSecUser columns login needs — shared so the username and email lookups return the same shape. */
const SECUSER_LOGIN_SELECT = {
  userID: true,
  userName: true,
  password: true,
  nodeID: true,
  subscriberID: true,
} as const;

export interface AuthUser {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
  roleId: RoleId;
  /**
   * Whether the candidate has finished the onboarding wizard. The web app redirects a falsy
   * value straight back to /candidate/onboarding, so this must be present on every session —
   * login, refresh and /me alike — or the candidate is trapped there.
   *
   * Always true for non-candidates: the wizard is candidate-only and they must never be
   * bounced into it.
   */
  isOnboarded: boolean;
}

export interface TokenPayload {
  sub: number;
  roleId: RoleId;
  /** Distinguishes an access token from a refresh token. Without it the two are interchangeable. */
  type: 'access' | 'refresh';
  /** Token id — lets a single refresh token be revoked on logout. */
  jti: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly otp: OtpService,
    private readonly emailService: EmailService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /**
   * Replaces spSecUserLogin. The proc compared PLAINTEXT passwords; the migration hashed
   * every one with Argon2id, so this verifies against the hash instead.
   */
  async login(userName: string, password: string, ipAddress?: string, browser?: string) {
    const identifier = userName.trim();
    // The login form is "Username or Email". For a candidate, UserName is the mobile and the
    // email lives on tblSubscriberCVDetails, so a direct UserName match never finds an email.
    // Try UserName first, then fall back to resolving the account by email.
    let user = await this.db.secUser.findFirst({
      // Active is char('1'/'0') in the legacy schema, not a bit.
      where: { userName: identifier, active: '1' },
      select: SECUSER_LOGIN_SELECT,
    });
    if (!user && identifier.includes('@')) {
      user = await this.userByEmail(identifier);
    }

    // Always run a verify, even when the user does not exist, so a missing account and a
    // wrong password take the same time and cannot be told apart by timing.
    const hash = user?.password || '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$invalidinvalidinvalidinvalidin';
    const ok = await argon2.verify(hash, password).catch(() => false);
    if (!user || !ok) throw new UnauthorizedException('Invalid username or password');

    // Role comes from tblSecMapUserRoles, which is what spSecUserLogin reads (line 38).
    // tblSecUser also has a RoleID column, but it DISAGREES with the mapping table — for
    // UserID 2 it claims 5 (Admin) where the mapping says 3 (QC2). Trusting it would be a
    // privilege escalation, so it is deliberately ignored.
    const mapping = await this.db.secMapUserRoles.findFirst({
      where: { userID: user.userID },
      select: { roleId: true },
    });
    const roleId = (mapping?.roleId ?? Role.Subscriber) as RoleId;

    const authUser: AuthUser = {
      userId: Number(user.userID),
      userName: user.userName ?? '',
      ...(await this.identityFor(user, roleId)),
      roleId,
    };

    const tokens = await this.issueTokens(authUser);
    await this.audit.recordLogin(authUser.userId, tokens.jti, ipAddress, browser);
    await this.audit.record({ userId: authUser.userId, action: 'auth.login', ipAddress });
    return { user: authUser, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  /**
   * Resolve a login from an email address. UserName is the mobile for candidates, so an email
   * only matches through the profile tables — and NodeID is polymorphic (see identityFor), so
   * there are two paths: a subscriber's email is on tblSubscriberCVDetails, everyone else's is
   * on tblMstrPerson. EmailID is unique in neither table, so this prefers an active account and
   * returns the first match. Case-insensitive, because email is.
   */
  private async userByEmail(email: string) {
    // Subscriber path: email -> CV details -> SubscriberID -> tblSecUser.SubscriberID (unique).
    const cv = await this.db.subscriberCVDetails.findFirst({
      where: { emailID: { equals: email, mode: 'insensitive' } },
      select: { subscriberID: true },
    });
    if (cv?.subscriberID != null) {
      const user = await this.db.secUser.findFirst({
        where: { subscriberID: cv.subscriberID, active: '1' },
        select: SECUSER_LOGIN_SELECT,
      });
      if (user) return user;
    }

    // Everyone else: email -> person node -> tblSecUser.NodeID. Exclude subscriber logins,
    // whose NodeID is a SubscriberID that can numerically collide with a PersonNodeID.
    const person = await this.db.mstrPerson.findFirst({
      where: { emailID: { equals: email, mode: 'insensitive' } },
      select: { personNodeID: true },
    });
    if (person?.personNodeID != null) {
      return this.db.secUser.findFirst({
        where: { nodeID: person.personNodeID, nodeType: { not: NODE_TYPE_SUBSCRIBER }, active: '1' },
        select: SECUSER_LOGIN_SELECT,
      });
    }

    return null;
  }

  /**
   * Rotates the refresh token: the presented one is revoked and a new one issued, so a
   * stolen token is usable at most once. The old API's /logout was a no-op with no
   * revocation at all.
   */
  async refresh(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(refreshToken, {
        secret: env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Not a refresh token');
    if (await this.isRevoked(payload.jti)) throw new UnauthorizedException('Refresh token revoked');

    const user = await this.db.secUser.findFirst({
      where: { userID: payload.sub, active: '1' },
      select: { userID: true, userName: true, nodeID: true, subscriberID: true },
    });
    if (!user) throw new UnauthorizedException('User no longer active');

    // Rebuild the full user from the database. The old implementation rebuilt it from the
    // JWT payload, so fullName silently degraded to userName and email became '' after
    // every refresh.
    const authUser: AuthUser = {
      userId: Number(user.userID),
      userName: user.userName ?? '',
      ...(await this.identityFor(user, payload.roleId)),
      roleId: payload.roleId,
    };

    await this.revoke(payload.jti);
    const t = await this.issueTokens(authUser);
    return { user: authUser, accessToken: t.accessToken, refreshToken: t.refreshToken };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const payload = await this.jwt
      .verifyAsync<TokenPayload>(refreshToken, { secret: env.JWT_REFRESH_SECRET })
      .catch(() => null);
    if (payload?.jti) {
      await this.revoke(payload.jti);
      await this.audit.recordLogout(payload.jti);
      await this.audit.record({ userId: payload.sub, action: 'auth.logout' });
    }
  }

  /* ------------------------------------------------------------------ *
   * Registration + email OTP.
   *
   * This lived only in the legacy C# (CommonController.SendOtp / VerifyOtp), which the
   * rebuild deliberately did not recover. It is a FRESH DESIGN, not a port — behaviour
   * may differ from the old site and should be reviewed before go-live.
   *
   * The candidate identity is spread across three tables, none of which is a single "users"
   * row: tblSubscriberRegistration holds (mobile, country code, IP, timestamp),
   * tblSubscriberCVDetails holds (full name, email, verification flag), and tblSecUser holds
   * the login and the Argon2id password hash. All of them are written in one transaction at
   * verification time.
   *
   * Nothing is written to Postgres before the code is proved. The pending registration —
   * including the already-hashed password — waits in Redis under the OTP, so an abandoned
   * signup expires on its own and leaves no half-built account and no unverified row
   * squatting on an address that someone else may legitimately own.
   * ------------------------------------------------------------------ */

  /** Step 1: hold the registration in Redis and email a code. Nothing is persisted yet. */
  async register(input: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    countryCode?: string;
    ipAddress?: string;
  }) {
    const email = normalizeEmail(input.email);
    await this.assertEmailAvailable(email);
    await this.assertMobileAvailable(input.mobile);

    // Cooldown is keyed by EMAIL, not by the registration handle below — otherwise re-posting
    // the form mints a fresh handle each time and every one of them sends another message to
    // the same inbox.
    const wait = await this.otp.claimSend(REGISTER_PURPOSE, email);
    if (wait > 0) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `A code was already sent to ${email}. Please wait ${wait}s before requesting another.`,
          retryAfterSeconds: wait,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Hashed here, at the edge, so the plaintext password never reaches the pending store.
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const pending: PendingRegistration = {
      fullName: input.fullName.trim(),
      email,
      mobile: input.mobile,
      countryCode: (input.countryCode ?? '+91').replace('+', ''),
      passwordHash,
      ipAddress: input.ipAddress,
    };

    /**
     * The handle is a fresh 256-bit secret rather than the email address, and it is what
     * verify/resend address. If the OTP were keyed by email alone, anyone could re-post the
     * form for an address they do not own, overwrite the pending password with their own, and
     * wait for the real owner — who is holding a genuine code — to submit it. Keying on an
     * unguessable handle keeps each attempt bound to the browser that started it.
     */
    const registrationToken = randomBytes(32).toString('hex');
    const code = await this.otp.issue(REGISTER_PURPOSE, registrationToken, pending);

    try {
      await this.emailService.sendEmailOtp(email, {
        fullName: pending.fullName,
        code,
        expiresIn: '10 minutes',
      });
    } catch (err) {
      // Enqueueing failed, so no code is coming. Free the cooldown and say so plainly instead
      // of parking the candidate on a verification screen forever. The cause is logged, not
      // returned — a broker hostname or credential error is not the caller's business.
      this.logger.error(`Failed to queue registration OTP for ${email}`, err as Error);
      await this.otp.releaseSend(REGISTER_PURPOSE, email);
      throw new ServiceUnavailableException(
        'We could not send the verification email just now. Please try again in a moment.',
      );
    }

    await this.audit.record({
      action: 'register.otp_sent',
      entity: 'SubscriberRegistration',
      ipAddress: input.ipAddress,
    });

    return {
      otpRequired: true,
      registrationToken,
      email,
      expiresInSeconds: OTP_TTL_SECONDS,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      maxAttempts: OTP_MAX_ATTEMPTS,
      // Outside production the code comes back in the response so registration works without
      // live SMTP credentials. Never leaked in production.
      ...(env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    };
  }

  /** Step 2: prove the code, create the account in one transaction, and return a session. */
  async verifyEmailOtp(registrationToken: string, code: string, ipAddress?: string) {
    const result = await this.otp.verify<PendingRegistration>(
      REGISTER_PURPOSE,
      registrationToken,
      code,
    );

    if (!result.ok) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            result.attemptsRemaining > 0
              ? `Incorrect code. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} remaining.`
              : // The record survives until the NEXT guess destroys it, so telling them
                // "incorrect" alone would strand them on a screen that can no longer succeed.
                'Incorrect code. No attempts remaining — request a new code.',
          attemptsRemaining: result.attemptsRemaining,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const pending = result.payload;
    if (!pending) {
      // The code was right but the payload is gone — only reachable if the record was written
      // by an older build. Nothing to create from, so restart rather than guess.
      throw new BadRequestException('This registration has expired. Please sign up again.');
    }

    // Re-checked inside the write, not just at step 1: two registrations for the same address
    // can both be in flight, and the minutes spent waiting for a code are ample time for the
    // other one to land.
    await this.assertEmailAvailable(pending.email);
    await this.assertMobileAvailable(pending.mobile);

    // spSubscriberRegistration did not just insert the registration — it also created the CV
    // row and seeded the status history. Skipping those left a candidate whose profile 404'd
    // on their very first login. All five writes are one transaction: a partial account is
    // worse than no account.
    const { subscriberId, userId } = await this.db.$transaction(async (tx) => {
      const now = new Date();
      const reg = await tx.subscriberRegistration.create({
        data: {
          registrationMobileNo: pending.mobile,
          registrationCountryCode: pending.countryCode,
          registrationIPNo: pending.ipAddress ?? ipAddress ?? '',
          registrationDateTime: now,
          flgCVUploaded: 0,
          // Left at 0, matching what the legacy proc wrote. Verification state is carried by
          // EmailVerified rather than overloading a flag whose other values are undocumented.
          flgstatus: 0,
        },
        select: { subscriberID: true },
      });

      await tx.subscriberCVDetails.create({
        data: {
          subscriberID: reg.subscriberID,
          fullName: pending.fullName,
          emailID: pending.email,
          emailVerified: true,
          emailVerifiedAt: now,
          mobileNo1: pending.mobile,
          timestampIns: now,
          loginIDIns: 0,
        },
      });

      await tx.subscriberStatusHistory.create({
        data: {
          subscriberID: reg.subscriberID,
          statusID: STATUS_ACCOUNT_CREATED,
          timestampIns: now,
        },
      });

      // UserName is the mobile for candidates — login() resolves an email through
      // tblSubscriberCVDetails, so both identifiers reach this account.
      const created = await tx.secUser.create({
        data: {
          userName: pending.mobile,
          password: pending.passwordHash,
          active: '1',
          // 1 = the user chose this password themselves (not a generated one).
          pwdStatus: 1,
          // For a subscriber, NodeID IS the SubscriberID — see NODE_TYPE_SUBSCRIBER above.
          nodeID: reg.subscriberID,
          nodeType: NODE_TYPE_SUBSCRIBER,
          subscriberID: reg.subscriberID,
        },
        select: { userID: true },
      });

      // Role comes from the mapping table, which is what login() reads.
      await tx.secMapUserRoles.create({
        data: {
          userID: created.userID,
          roleId: Role.Subscriber,
          userNodeId: reg.subscriberID,
          userNodeType: NODE_TYPE_SUBSCRIBER,
        },
      });

      return { subscriberId: reg.subscriberID, userId: created.userID };
    });

    const authUser: AuthUser = {
      userId: Number(userId),
      userName: pending.mobile,
      fullName: pending.fullName,
      email: pending.email,
      roleId: Role.Subscriber,
      // Brand-new account: the wizard is the next thing they see.
      isOnboarded: false,
    };

    await this.audit.record({
      userId: authUser.userId,
      action: 'register.verified',
      entity: 'SubscriberRegistration',
      entityId: Number(subscriberId),
      ipAddress,
    });

    // Fire-and-forget — a working account must not depend on the welcome mail going out.
    this.emailService
      .sendWelcome(authUser.email, {
        fullName: authUser.fullName,
        profileUrl: `${env.APP_URL}/profile`,
      })
      .catch(() => {}); // swallowed — delivery is retried by the queue worker

    const t = await this.issueTokens(authUser);
    return { user: authUser, accessToken: t.accessToken, refreshToken: t.refreshToken };
  }

  /**
   * Re-send the code for an in-flight registration. Issues a NEW code — the old one stops
   * working — and resets the attempt counter, which is bounded by the send cooldown rather
   * than by the counter itself.
   */
  async resendEmailOtp(registrationToken: string) {
    const pending = await this.otp.peekPayload<PendingRegistration>(
      REGISTER_PURPOSE,
      registrationToken,
    );
    if (!pending) {
      throw new BadRequestException('This registration has expired. Please sign up again.');
    }

    const wait = await this.otp.claimSend(REGISTER_PURPOSE, pending.email);
    if (wait > 0) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Please wait ${wait}s before requesting another code.`,
          retryAfterSeconds: wait,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = await this.otp.issue(REGISTER_PURPOSE, registrationToken, pending);
    try {
      await this.emailService.sendEmailOtp(pending.email, {
        fullName: pending.fullName,
        code,
        expiresIn: '10 minutes',
      });
    } catch (err) {
      this.logger.error(`Failed to queue registration OTP resend for ${pending.email}`, err as Error);
      await this.otp.releaseSend(REGISTER_PURPOSE, pending.email);
      throw new ServiceUnavailableException(
        'We could not send the verification email just now. Please try again in a moment.',
      );
    }

    await this.audit.record({ action: 'register.otp_resent', entity: 'SubscriberRegistration' });

    return {
      otpRequired: true,
      email: pending.email,
      expiresInSeconds: OTP_TTL_SECONDS,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      maxAttempts: OTP_MAX_ATTEMPTS,
      ...(env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    };
  }

  /**
   * Rejects an address that already has a VERIFIED account. Unverified legacy rows do not
   * block a signup — the address was never proved, so refusing it would let an unproved row
   * lock out the person who actually owns the mailbox.
   *
   * This does tell an anonymous caller whether an address is registered. That is the accepted
   * trade for a signup form that can explain itself; the endpoint is rate-limited and every
   * call is audited. If enumeration resistance is ever ranked higher than the error message,
   * this is the single place to change.
   */
  private async assertEmailAvailable(email: string) {
    const taken = await this.db.subscriberCVDetails.findFirst({
      where: { emailID: { equals: email, mode: 'insensitive' }, emailVerified: true },
      select: { subscriberID: true },
    });
    if (taken) {
      throw new ConflictException(
        'An account already exists for this email address. Please log in instead.',
      );
    }
  }

  /** UserName is the mobile, and tblSecUser.UserName must stay unique for login to resolve. */
  private async assertMobileAvailable(mobile: string) {
    const taken = await this.db.secUser.findFirst({
      where: { userName: mobile },
      select: { userID: true },
    });
    if (taken) {
      throw new ConflictException(
        'An account already exists for this mobile number. Please log in instead.',
      );
    }
  }

  /* ------------------------------------------------------------------ *
   * Password reset.
   *
   * tblForgotPassword exists in the legacy DB but is unusable: it is only
   * (forgotPasswordID, USERID, TimestampIns) — no token, no expiry, no used flag. So this
   * writes to tblAuthPasswordReset, which is new. The token is stored HASHED: a database
   * leak must not hand over working reset links.
   * ------------------------------------------------------------------ */

  async forgotPassword(userName: string) {
    const user = await this.db.secUser.findFirst({
      where: { userName, active: '1' },
      select: { userID: true, nodeID: true },
    });

    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.db.authPasswordReset.create({
        data: {
          userID: user.userID,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const person = user.nodeID
        ? await this.db.mstrPerson.findUnique({
            where: { personNodeID: user.nodeID },
            select: { emailID: true },
          })
        : null;
      const email = person?.emailID;

      if (email) {
        const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
        await this.emailService.sendPasswordReset(email, {
          resetUrl,
          expiresIn: '1 hour',
        });
      }
      await this.audit.record({ userId: Number(user.userID), action: 'password.reset_requested' });
    }

    // Always the same answer. Otherwise this endpoint tells an attacker which usernames
    // exist.
    return { message: 'If that account exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const reset = await this.db.authPasswordReset.findUnique({ where: { tokenHash } });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }

    await this.db.$transaction(async (tx) => {
      await tx.secUser.update({
        where: { userID: reset.userID },
        data: {
          password: await argon2.hash(newPassword, { type: argon2.argon2id }),
          pwdStatus: 1,
        },
      });
      // Single use.
      await tx.authPasswordReset.update({
        where: { resetID: reset.resetID },
        data: { usedAt: new Date() },
      });
      // A password change kills every live session.
      await tx.secActiveSessions.deleteMany({ where: { userID: Number(reset.userID) } });
    });

    await this.audit.record({ userId: Number(reset.userID), action: 'password.reset_completed' });
    return { message: 'Your password has been updated.' };
  }

  /**
   * Display name + email for a login.
   *
   * NodeID is polymorphic, so this MUST branch on role. Reading tblMstrPerson for a
   * subscriber would resolve their SubscriberID against PersonNodeID and hand back a
   * different person's name and email — the ids overlap.
   */
  /** The authenticated user, resolved the same way login does. */
  async me(userId: number, roleId: RoleId): Promise<AuthUser> {
    const user = await this.db.secUser.findUnique({
      where: { userID: userId },
      select: { userID: true, userName: true, nodeID: true, subscriberID: true },
    });
    if (!user) throw new UnauthorizedException('User no longer exists');
    return {
      userId: Number(user.userID),
      userName: user.userName ?? '',
      ...(await this.identityFor(user, roleId)),
      roleId,
    };
  }

  private async identityFor(
    user: { userID: bigint; userName: string | null; nodeID: bigint | null; subscriberID: bigint | null },
    roleId: RoleId,
  ): Promise<{ fullName: string; email: string; isOnboarded: boolean }> {
    if (roleId === Role.Subscriber) {
      const cv = user.subscriberID
        ? await this.db.subscriberCVDetails.findUnique({
            where: { subscriberID: user.subscriberID },
            select: { fullName: true, emailID: true, mobileNo1: true, onboardedAt: true },
          })
        : null;
      return {
        fullName: cv?.fullName?.trim() || cv?.mobileNo1 || user.userName || '',
        email: cv?.emailID ?? '',
        isOnboarded: cv?.onboardedAt != null,
      };
    }

    const person = user.nodeID
      ? await this.db.mstrPerson.findUnique({
          where: { personNodeID: user.nodeID },
          select: { descr: true, emailID: true },
        })
      : null;
    return {
      fullName: person?.descr?.trim() || user.userName || '',
      email: person?.emailID ?? '',
      isOnboarded: true,
    };
  }

  private async issueTokens(user: AuthUser) {
    const jti = randomUUID();
    const base = { sub: user.userId, roleId: user.roleId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, type: 'access', jti },
        { secret: env.JWT_ACCESS_SECRET, expiresIn: env.JWT_ACCESS_TTL as `${number}${'s' | 'm' | 'h' | 'd'}` },
      ),
      this.jwt.signAsync(
        { ...base, type: 'refresh', jti },
        { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_TTL as `${number}${'s' | 'm' | 'h' | 'd'}` },
      ),
    ]);
    // Record the session so the refresh token can later be revoked by jti.
    await this.db.secActiveSessions.create({
      data: { sessionID: jti, userID: user.userId, startTime: new Date() },
    });
    return { accessToken, refreshToken, jti };
  }

  /**
   * Sessions are an allow-list, not a deny-list: a refresh token is only valid while its jti
   * is still present in tblSecActiveSessions. Logout and rotation delete the row, which
   * immediately invalidates the token — the table already existed for exactly this purpose.
   */
  private async revoke(jti: string) {
    await this.db.secActiveSessions.deleteMany({ where: { sessionID: jti } });
  }

  private async isRevoked(jti: string) {
    const live = await this.db.secActiveSessions.findFirst({ where: { sessionID: jti } });
    return !live;
  }
}
