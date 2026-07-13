import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { env } from '@/config/env';
import { PrismaService } from '@/prisma/prisma.service';
import { Role, type RoleId } from '@/shared/roles';

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
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /**
   * Replaces spSecUserLogin. The proc compared PLAINTEXT passwords; the migration hashed
   * every one with Argon2id, so this verifies against the hash instead.
   */
  async login(userName: string, password: string) {
    const user = await this.db.secUser.findFirst({
      // Active is char('1'/'0') in the legacy schema, not a bit.
      where: { userName, active: '1' },
      select: { userID: true, userName: true, password: true, nodeID: true },
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

    const person = user.nodeID
      ? await this.db.mstrPerson.findUnique({
          where: { personNodeID: user.nodeID },
          select: { descr: true, emailID: true },
        })
      : null;

    const authUser: AuthUser = {
      userId: Number(user.userID),
      userName: user.userName ?? '',
      fullName: person?.descr?.trim() || user.userName || '',
      email: person?.emailID ?? '',
      roleId,
    };

    return { user: authUser, ...(await this.issueTokens(authUser)) };
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
      select: { userID: true, userName: true, nodeID: true },
    });
    if (!user) throw new UnauthorizedException('User no longer active');

    const person = user.nodeID
      ? await this.db.mstrPerson.findUnique({
          where: { personNodeID: user.nodeID },
          select: { descr: true, emailID: true },
        })
      : null;

    // Rebuild the full user from the database. The old implementation rebuilt it from the
    // JWT payload, so fullName silently degraded to userName and email became '' after
    // every refresh.
    const authUser: AuthUser = {
      userId: Number(user.userID),
      userName: user.userName ?? '',
      fullName: person?.descr?.trim() || user.userName || '',
      email: person?.emailID ?? '',
      roleId: payload.roleId,
    };

    await this.revoke(payload.jti);
    return { user: authUser, ...(await this.issueTokens(authUser)) };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const payload = await this.jwt
      .verifyAsync<TokenPayload>(refreshToken, { secret: env.JWT_REFRESH_SECRET })
      .catch(() => null);
    if (payload?.jti) await this.revoke(payload.jti);
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
    return { accessToken, refreshToken };
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
