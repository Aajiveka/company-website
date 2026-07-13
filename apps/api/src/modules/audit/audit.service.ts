import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface AuditEvent {
  userId?: number | null;
  action: string;
  entity?: string;
  entityId?: string | number;
  ipAddress?: string;
  userAgent?: string;
  detail?: unknown;
}

/**
 * Append-only audit trail. The legacy app had none: there is no audit table in the backup,
 * and the 97 procs record no history beyond tblSubscriberStatusHistory, which is domain
 * state rather than a log of who did what.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Never throws: an audit failure must not fail the action being audited. */
  async record(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.client.auditLog.create({
        data: {
          userID: event.userId ?? null,
          action: event.action,
          entity: event.entity ?? null,
          entityID: event.entityId != null ? String(event.entityId) : null,
          ipAddress: event.ipAddress?.slice(0, 45) ?? null,
          userAgent: event.userAgent?.slice(0, 300) ?? null,
          detail: event.detail ? JSON.stringify(event.detail) : null,
        },
      });
    } catch (e) {
      this.logger.error(`failed to write audit entry "${event.action}": ${String(e)}`);
    }
  }

  /**
   * Login history goes to tblSecUserLogin, which already exists for exactly this and has
   * the right columns (LoginTime, Logouttime, SessionID, IPAddress, IsSessionEnd). Nothing
   * has been writing to it — the table holds 2,225 rows from the legacy app and then stops.
   */
  async recordLogin(userId: number, sessionId: string, ipAddress?: string, browser?: string) {
    try {
      await this.prisma.client.secUserLogin.create({
        data: {
          userID: userId,
          sessionID: sessionId,
          loginTime: new Date(),
          iPAddress: ipAddress?.slice(0, 50) ?? null,
          iEVersion: browser?.slice(0, 50) ?? null,
          isSessionEnd: 0,
        },
      });
    } catch (e) {
      this.logger.error(`failed to write login audit: ${String(e)}`);
    }
  }

  async recordLogout(sessionId: string) {
    try {
      await this.prisma.client.secUserLogin.updateMany({
        where: { sessionID: sessionId, isSessionEnd: 0 },
        data: { logouttime: new Date(), isSessionEnd: 1 },
      });
    } catch (e) {
      this.logger.error(`failed to close login audit: ${String(e)}`);
    }
  }
}
