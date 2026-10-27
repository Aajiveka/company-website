import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Response } from 'express';
import type { InAppNotification, SseClient } from './notifications.types';
import { NotificationType } from './notifications.types';

const HEARTBEAT_INTERVAL = 30_000;

/**
 * Manages SSE client connections and an in-memory notification store.
 *
 * In production the notification store should be backed by a database table;
 * the in-memory approach here avoids adding a Prisma migration to the legacy
 * schema while keeping the SSE plumbing fully functional.
 */
@Injectable()
export class SseNotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(SseNotificationsService.name);

  /**
   * Active SSE connections, several per user. It used to be one per user: every new stream
   * ended the previous one, and each closed stream's handler removed whichever was current.
   * Two streams for one user — a second tab, or a page that remounted the bell — then
   * evicted each other every second, and the reconnects ate the 60/min throttle until the
   * app showed "You're offline".
   */
  private readonly clients = new Map<number, Set<SseClient>>();

  /** In-memory notification store keyed by id. */
  private readonly store: InAppNotification[] = [];
  private nextId = 1;

  /** Heartbeat interval handle. */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.heartbeatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_INTERVAL);
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const conns of this.clients.values()) {
      for (const client of conns) client.res.end();
    }
    this.clients.clear();
  }

  /* ------------------------------------------------------------------ */
  /*  Client management                                                  */
  /* ------------------------------------------------------------------ */

  addClient(userId: number, roleId: number, res: Response): void {
    let conns = this.clients.get(userId);
    if (!conns) this.clients.set(userId, (conns = new Set()));
    conns.add({ userId, roleId, res });
    this.logger.log(`SSE client connected: userId=${userId} (${conns.size} for this user)`);
  }

  /** Drops one connection — the one that closed — leaving the user's others open. */
  removeClient(userId: number, res: Response): void {
    const conns = this.clients.get(userId);
    if (!conns) return;
    for (const client of conns) {
      if (client.res !== res) continue;
      conns.delete(client);
      client.res.end();
      this.logger.log(`SSE client disconnected: userId=${userId} (${conns.size} for this user)`);
    }
    if (!conns.size) this.clients.delete(userId);
  }

  /** One entry per connected user, whatever the number of connections. */
  private connectedUsers() {
    return [...this.clients.entries()]
      .filter(([, conns]) => conns.size > 0)
      .map(([userId, conns]) => ({ userId, roleId: [...conns][0].roleId }));
  }

  /* ------------------------------------------------------------------ */
  /*  Push events                                                        */
  /* ------------------------------------------------------------------ */

  sendNotification(userId: number, notification: Omit<InAppNotification, 'id' | 'userId' | 'read' | 'createdAt'>): InAppNotification {
    const record: InAppNotification = {
      id: this.nextId++,
      userId,
      read: false,
      createdAt: new Date().toISOString(),
      ...notification,
    };
    this.store.push(record);
    this.writeEvent(userId, record);
    return record;
  }

  broadcastToRole(roleId: number, notification: Omit<InAppNotification, 'id' | 'userId' | 'read' | 'createdAt'>): void {
    for (const user of this.connectedUsers()) {
      if (user.roleId === roleId) {
        this.sendNotification(user.userId, notification);
      }
    }
  }

  broadcastToAll(notification: Omit<InAppNotification, 'id' | 'userId' | 'read' | 'createdAt'>): void {
    for (const user of this.connectedUsers()) {
      this.sendNotification(user.userId, notification);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Notification CRUD                                                  */
  /* ------------------------------------------------------------------ */

  getNotifications(
    userId: number,
    options: { page: number; pageSize: number; type?: NotificationType; unread?: boolean },
  ): { rows: InAppNotification[]; total: number; page: number; pageCount: number } {
    let filtered = this.store
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.id - a.id);

    if (options.type) {
      filtered = filtered.filter((n) => n.type === options.type);
    }
    if (options.unread) {
      filtered = filtered.filter((n) => !n.read);
    }

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / options.pageSize));
    const start = (options.page - 1) * options.pageSize;
    const rows = filtered.slice(start, start + options.pageSize);

    return { rows, total, page: options.page, pageCount };
  }

  markRead(userId: number, notificationId: number): boolean {
    const notif = this.store.find((n) => n.id === notificationId && n.userId === userId);
    if (!notif) return false;
    notif.read = true;
    return true;
  }

  markAllRead(userId: number): number {
    let count = 0;
    for (const n of this.store) {
      if (n.userId === userId && !n.read) {
        n.read = true;
        count++;
      }
    }
    return count;
  }

  deleteNotification(userId: number, notificationId: number): boolean {
    const idx = this.store.findIndex((n) => n.id === notificationId && n.userId === userId);
    if (idx === -1) return false;
    this.store.splice(idx, 1);
    return true;
  }

  getUnreadCount(userId: number): number {
    return this.store.filter((n) => n.userId === userId && !n.read).length;
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  private writeEvent(userId: number, data: InAppNotification): void {
    for (const client of this.clients.get(userId) ?? []) {
      try {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        this.removeClient(userId, client.res);
      }
    }
  }

  private heartbeat(): void {
    for (const [userId, conns] of this.clients) {
      for (const client of conns) {
        try {
          client.res.write(': ping\n\n');
        } catch {
          this.removeClient(userId, client.res);
        }
      }
    }
  }
}
