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

  /** Active SSE connections keyed by userId. */
  private readonly clients = new Map<number, SseClient>();

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
    for (const client of this.clients.values()) {
      client.res.end();
    }
    this.clients.clear();
  }

  /* ------------------------------------------------------------------ */
  /*  Client management                                                  */
  /* ------------------------------------------------------------------ */

  addClient(userId: number, roleId: number, res: Response): void {
    // Close any existing connection for this user.
    this.removeClient(userId);
    this.clients.set(userId, { userId, roleId, res });
    this.logger.log(`SSE client connected: userId=${userId} (${this.clients.size} active)`);
  }

  removeClient(userId: number): void {
    const existing = this.clients.get(userId);
    if (existing) {
      existing.res.end();
      this.clients.delete(userId);
      this.logger.log(`SSE client disconnected: userId=${userId} (${this.clients.size} active)`);
    }
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
    for (const client of this.clients.values()) {
      if (client.roleId === roleId) {
        this.sendNotification(client.userId, notification);
      }
    }
  }

  broadcastToAll(notification: Omit<InAppNotification, 'id' | 'userId' | 'read' | 'createdAt'>): void {
    for (const client of this.clients.values()) {
      this.sendNotification(client.userId, notification);
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
    const client = this.clients.get(userId);
    if (!client) return;
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      this.removeClient(userId);
    }
  }

  private heartbeat(): void {
    for (const [userId, client] of this.clients) {
      try {
        client.res.write(': ping\n\n');
      } catch {
        this.removeClient(userId);
      }
    }
  }
}
