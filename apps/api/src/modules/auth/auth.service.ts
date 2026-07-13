import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '@/config/env';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { Role, type RoleId } from '@/shared/roles';
import { OtpService } from './otp.service';

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

export interface AuthUser {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
  roleId: RoleId;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly otp: OtpService,
    private readonly notifications: NotificationsService,
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
    const user = await this.db.secUser.findFirst({
      // Active is char('1'/'0') in the legacy schema, not a bit.
      where: { userName, active: '1' },
      select: { userID: true, userName: true, password: true, nodeID: true, subscriberID: true },
    });

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
   * Registration + OTP.
   *
   * These lived only in the legacy C# (CommonController.SendOtp / VerifyOtp), which the
   * rebuild deliberately did not recover. They are a FRESH DESIGN, not a port — behaviour
   * may differ from the old site and should be reviewed before go-live.
   *
   * Registration is mobile-first, because tblSubscriberRegistration is:
   * (SubscriberID, RegistrationCountryCode, RegistrationMobileNo, RegistrationIPNo,
   *  RegistrationDateTime, flgCVUploaded, flgstatus). There is no email or name on it —
   * those live on tblSubscriberCVDetails, which the candidate fills in afterwards.
   * ------------------------------------------------------------------ */

  /** Step 1: create the registration (unverified) and send an OTP to the mobile. */
  async register(input: { mobile: string; countryCode?: string; ipAddress?: string }) {
    const existing = await this.db.subscriberRegistration.findFirst({
      where: { registrationMobileNo: input.mobile },
      select: { subscriberID: true },
    });

    const subscriber =
      existing ??
      // spSubscriberRegistration does not just insert the registration — it also creates the
      // CV row and seeds the status history. Skipping those left a candidate whose profile
      // 404'd on their very first login.
      (await this.db.$transaction(async (tx) => {
        const reg = await tx.subscriberRegistration.create({
          data: {
            registrationMobileNo: input.mobile,
            registrationCountryCode: (input.countryCode ?? '+91').replace('+', ''),
            registrationIPNo: input.ipAddress ?? '',
            registrationDateTime: new Date(),
            flgCVUploaded: 0,
            flgstatus: 0,
          },
          select: { subscriberID: true },
        });
        await tx.subscriberCVDetails.create({
          data: {
            subscriberID: reg.subscriberID,
            mobileNo1: input.mobile,
            timestampIns: new Date(),
            loginIDIns: 0,
          },
        });
        await tx.subscriberStatusHistory.create({
          data: {
            subscriberID: reg.subscriberID,
            statusID: STATUS_ACCOUNT_CREATED,
            timestampIns: new Date(),
          },
        });
        return reg;
      }));

    const code = await this.otp.issue('register', input.mobile);
    await this.notifications.sendSms({
      to: input.mobile,
      text: `Your Aajiveka verification code is ${code}. It expires in 10 minutes.`,
    });
    await this.audit.record({
      action: existing ? 'register.otp_resent' : 'register.started',
      entity: 'SubscriberRegistration',
      entityId: Number(subscriber.subscriberID),
      ipAddress: input.ipAddress,
    });

    // The same response either way, so the endpoint cannot be used to discover which
    // mobile numbers are already registered.
    return { otpRequired: true };
  }

  /** Step 2: verify the OTP, create the login, and return a session. */
  async verifyOtp(mobile: string, code: string) {
    const ok = await this.otp.verify('register', mobile, code);
    if (!ok) throw new BadRequestException('Incorrect code');

    const subscriber = await this.db.subscriberRegistration.findFirst({
      where: { registrationMobileNo: mobile },
      select: { subscriberID: true },
    });
    if (!subscriber) throw new BadRequestException('No registration found for this number');

    // A verified registration gets a login. There is no password yet — the account is
    // reachable only through OTP until the candidate sets one.
    //
    // Every login in this schema hangs off a person node: tblSecUser.NodeID points at
    // tblMstrPerson.PersonNodeID with NodeType 100, and tblSecMapUserRoles repeats that
    // node. So the person row has to be created alongside the user, in one transaction.
    let user = await this.db.secUser.findFirst({
      where: { userName: mobile },
      select: { userID: true, userName: true, nodeID: true },
    });
    if (!user) {
      user = await this.db.$transaction(async (tx) => {
        const created = await tx.secUser.create({
          data: {
            userName: mobile,
            password: null,
            active: '1',
            pwdStatus: 0,
            // For a subscriber, NodeID IS the SubscriberID — see NODE_TYPE_SUBSCRIBER above.
            nodeID: subscriber.subscriberID,
            nodeType: NODE_TYPE_SUBSCRIBER,
            subscriberID: subscriber.subscriberID,
          },
          select: { userID: true, userName: true, nodeID: true },
        });
        await tx.secMapUserRoles.create({
          data: {
            userID: created.userID,
            roleId: Role.Subscriber,
            userNodeId: subscriber.subscriberID,
            userNodeType: NODE_TYPE_SUBSCRIBER,
          },
        });
        return created;
      });
    }

    const authUser: AuthUser = {
      userId: Number(user.userID),
      userName: user.userName ?? mobile,
      ...(await this.identityFor(
        { ...user, subscriberID: subscriber.subscriberID },
        Role.Subscriber,
      )),
      roleId: Role.Subscriber,
    };
    await this.audit.record({
      userId: authUser.userId,
      action: 'register.verified',
      entity: 'SubscriberRegistration',
      entityId: Number(subscriber.subscriberID),
    });
    const t = await this.issueTokens(authUser);
    return { user: authUser, accessToken: t.accessToken, refreshToken: t.refreshToken };
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
        await this.notifications.sendEmail({
          to: email,
          subject: 'Reset your Aajiveka password',
          text: `Open this link to set a new password. It expires in one hour.\n\n${env.APP_URL}/reset-password?token=${token}`,
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
  ): Promise<{ fullName: string; email: string }> {
    if (roleId === Role.Subscriber) {
      const cv = user.subscriberID
        ? await this.db.subscriberCVDetails.findUnique({
            where: { subscriberID: user.subscriberID },
            select: { fullName: true, emailID: true, mobileNo1: true },
          })
        : null;
      return {
        fullName: cv?.fullName?.trim() || cv?.mobileNo1 || user.userName || '',
        email: cv?.emailID ?? '',
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
