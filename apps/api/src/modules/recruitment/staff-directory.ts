import type { PrismaClient } from '@prisma/client';

export interface StaffContact {
  name: string;
  email: string | null;
}

/**
 * Names and mail addresses for staff user ids — "Referred by Arjun Mehta (Q2)", "Verified by
 * Priya Nair", and who a status mail to Q2 goes to.
 *
 * Resolved the way AuthService.identityFor resolves a staff login: tblSecUser.NodeID points at
 * tblMstrPerson for every role but Subscriber, and that row carries the display name and
 * address. NodeType cannot tell the two apart (the seed writes 100 for every login), so a
 * candidate login is recognised by its explicit SubscriberID instead. UserMail is the
 * fallback for logins created without a person row.
 */
export async function staffDirectory(
  db: PrismaClient,
  userIds: Array<number | bigint | null | undefined>,
): Promise<Map<number, StaffContact>> {
  const ids = [...new Set(userIds.filter((x): x is number | bigint => x != null).map(Number))];
  const out = new Map<number, StaffContact>();
  if (!ids.length) return out;

  const users = await db.secUser.findMany({
    where: { userID: { in: ids.map((id) => BigInt(id)) } },
    select: { userID: true, userName: true, userMail: true, nodeID: true, subscriberID: true },
  });
  const nodeIds = users
    .filter((u) => u.nodeID != null && u.subscriberID == null)
    .map((u) => u.nodeID as bigint);
  const people = nodeIds.length
    ? await db.mstrPerson.findMany({
        where: { personNodeID: { in: nodeIds } },
        select: { personNodeID: true, descr: true, emailID: true },
      })
    : [];
  const personOf = new Map(people.map((p) => [String(p.personNodeID), p]));

  for (const u of users) {
    const person = u.nodeID != null && u.subscriberID == null ? personOf.get(String(u.nodeID)) : undefined;
    out.set(Number(u.userID), {
      name: person?.descr?.trim() || u.userName?.trim() || 'Aajiveka team',
      email: person?.emailID?.trim() || u.userMail?.trim() || null,
    });
  }
  return out;
}
