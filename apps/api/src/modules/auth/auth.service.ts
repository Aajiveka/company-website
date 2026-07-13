import { randomUUID } from 'node:crypto';
import { queryProc } from '@/db/callProc';
import { signAccessToken, signRefreshToken, type JwtPayload } from '@/utils/jwt';
import { notImplemented, unauthorized } from '@/utils/httpError';
import type { LoginInput } from './auth.schemas';

/**
 * Row shape returned by spSecUserLogin (see db/procs/spsec.sql). The proc
 * returns a login-result code plus user/role/name details.
 */
interface LoginRow {
  UserID: number;
  UserName: string;
  RoleId: number;
  PersonName: string;
  EmailId: string;
  LoginRslt: number; // 1=invalid, 2=duplicate session, 3=success
}

export interface AuthUserDto {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
  roleId: number;
}

export interface AuthSessionDto {
  user: AuthUserDto;
  accessToken: string;
  refreshToken: string;
}

function toSession(user: AuthUserDto): AuthSessionDto {
  const payload: JwtPayload = { userId: user.userId, userName: user.userName, roleId: user.roleId };
  return {
    user,
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export const authService = {
  /**
   * Authenticate via spSecUserLogin. Session/IP bookkeeping is handled inside
   * the proc; here we map the result to a JWT session.
   */
  async login(input: LoginInput, meta: { ip: string; ua: string }): Promise<AuthSessionDto> {
    const rows = await queryProc<LoginRow>('spSecUserLogin', {
      UserName: input.userName,
      UserPwd: input.password, // NOTE: reference stores plaintext; migrate to hashing.
      SessionIdNw: randomUUID(),
      IPAddress: meta.ip.slice(0, 16),
      BrwsrVer: meta.ua.slice(0, 20),
      ScrRsltn: '',
    });

    const row = rows[0];
    if (!row || row.LoginRslt === 1 || !row.UserID) {
      throw unauthorized('Invalid username or password');
    }

    return toSession({
      userId: row.UserID,
      userName: row.UserName ?? input.userName,
      fullName: row.PersonName ?? input.userName,
      email: row.EmailId ?? '',
      roleId: Number(row.RoleId),
    });
  },

  /** Re-issue tokens from a valid refresh payload (verified in the controller). */
  refresh(payload: JwtPayload, user: AuthUserDto): AuthSessionDto {
    void payload;
    return toSession(user);
  },

  async register(input: { fullName: string; email: string; mobile: string; password: string }) {
    const rows = await queryProc<{ UserID: number }>('spSubscriberRegistration', {
      FullName: input.fullName,
      EmailId: input.email,
      MobileNo: input.mobile,
      Password: input.password,
    });
    return { userId: rows[0]?.UserID ?? 0, otpRequired: true };
  },

  async forgotPassword(_email: string): Promise<void> {
    // NOT IMPLEMENTED. This called `spSecForgotPassword`, which does not exist in the
    // backup — and swallowed the resulting failure with .catch(), so callers were told
    // the reset email had been sent when nothing had happened at all.
    //
    // tblForgotPassword (EmailId, Token, ExpiryDate, IsUsed) is real, but no proc reads
    // or writes it. Token issuing + delivery are built in the NestJS rebuild, where email
    // goes through the queue rather than a stored procedure.
    throw notImplemented('Password reset is not yet implemented.');
  },
};
