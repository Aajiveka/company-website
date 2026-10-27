/* eslint-disable @typescript-eslint/no-explicit-any -- a fake Express Response is all the
   registry touches. */
import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { SseNotificationsService } from './sse-notifications.service';
import { NotificationType } from './notifications.types';

function fakeRes() {
  const res = { frames: [] as string[], ended: false, write(f: string) { res.frames.push(f); return true; }, end() { res.ended = true; } };
  return res;
}

/**
 * The registry used to hold one stream per user: a second stream ended the first, and the
 * first one's close handler then removed the second. Two streams for one user (a second
 * tab, a remounted bell) evicted each other every second, and the reconnects exhausted the
 * request throttle until the app showed "You're offline".
 */
describe('SseNotificationsService connections', () => {
  const svc = new SseNotificationsService();
  after(() => svc.onModuleDestroy());
  const note = { type: NotificationType.SYSTEM, title: 't', message: 'm' } as any;

  it("keeps a user's other streams open when one connects or closes", () => {
    const a = fakeRes();
    const b = fakeRes();
    svc.addClient(7, 2, a as any);
    svc.addClient(7, 2, b as any);
    assert.equal(a.ended, false, 'a second stream must not end the first');

    svc.removeClient(7, a as any);
    assert.equal(a.ended, true);
    assert.equal(b.ended, false, "closing one stream must not end the user's other");

    svc.sendNotification(7, note);
    assert.equal(b.frames.filter((f) => f.startsWith('data:')).length, 1);
    svc.removeClient(7, b as any);
  });

  it('delivers to every stream, but records a broadcast once per user', () => {
    const a = fakeRes();
    const b = fakeRes();
    svc.addClient(8, 3, a as any);
    svc.addClient(8, 3, b as any);
    svc.broadcastToRole(3, note);
    assert.equal(svc.getUnreadCount(8), 1);
    assert.equal(a.frames.length, 1);
    assert.equal(b.frames.length, 1);
  });
});
