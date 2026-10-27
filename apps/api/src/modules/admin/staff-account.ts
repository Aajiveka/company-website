import { ConflictException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

export interface NewStaffLogin {
  userName: string;
  fullName: string;
  email: string;
  roleId: number;
  /** The admin creating it; 0 for the bootstrap script. */
  createdBy: number;
}

/**
 * Creates a staff login exactly the way the seed shapes one: a tblMstrPerson row (where a
 * staff member's name and address live), the tblSecUser login pointing at it through NodeID,
 * and the tblSecMapUserRoles row login reads the role from — in one transaction, so a failure
 * cannot leave a login with no role mapping (which login would then treat as a candidate).
 *
 * The password is random and never shown to anyone; the person sets their own through a
 * reset link from `issuePasswordResetToken`. Shared by AdminService.createStaffUser and
 * scripts/create-admin.ts so the two cannot drift.
 */
export async function createStaffLogin(db: PrismaClient, input: NewStaffLogin): Promise<number> {
  const userName = input.userName.trim();
  const email = input.email.trim().toLowerCase();
  const taken = await db.secUser.findFirst({
    where: { userName: { equals: userName, mode: 'insensitive' } },
    select: { userID: true },
  });
  if (taken) throw new ConflictException('That username is already in use');

  const passwordHash = await argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });
  const user = await db.$transaction(async (tx) => {
    const person = await tx.mstrPerson.create({
      data: {
        descr: input.fullName.trim(),
        emailID: email,
        nodeType: 100,
        flgActive: 1,
        tImestampIns: new Date(),
        loginIDIns: input.createdBy,
        clientID: null,
      },
      select: { personNodeID: true },
    });
    const created = await tx.secUser.create({
      data: {
        userName,
        userMail: email,
        password: passwordHash,
        active: '1',
        pwdStatus: 1,
        nodeID: person.personNodeID,
        nodeType: 100,
        roleID: input.roleId,
        subscriberID: null,
      },
      select: { userID: true },
    });
    await tx.secMapUserRoles.create({
      data: { userID: created.userID, roleId: input.roleId, userNodeId: person.personNodeID, userNodeType: 100 },
    });
    return created;
  });
  return Number(user.userID);
}

/**
 * A single-use reset token in tblAuthPasswordReset — the same hashed-token row
 * AuthService.forgotPassword writes, consumed by POST /auth/reset-password. Returns the raw
 * token; only its hash is stored.
 */
export async function issuePasswordResetToken(db: PrismaClient, userId: number, ttlMs: number): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await db.authPasswordReset.create({
    data: {
      userID: BigInt(userId),
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return token;
}
