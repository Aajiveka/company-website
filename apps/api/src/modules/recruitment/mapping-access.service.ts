import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { RequestUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@/shared/roles';

/**
 * Ownership check for routes that take an application (job–subscriber mapping), interview
 * round or offer id. @Roles only says *which kind* of user may call them; without this a
 * candidate could read — or accept — any other candidate's offer by walking the ids, and an
 * employer could record results on another company's applications.
 *
 * Staff roles (QC2, Q3, Admin) work across all applications and pass straight through.
 * Failures are 404, not 403, so ids belonging to someone else are indistinguishable from
 * ids that do not exist.
 */
@Injectable()
export class MappingAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async assertMapping(mapId: number | bigint, user: RequestUser): Promise<void> {
    if (user.roleId !== Role.Subscriber && user.roleId !== Role.Client) return;

    const map = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: BigInt(mapId) },
      select: { subscriberID: true, job: { select: { clientID: true } } },
    });
    const caller = await this.db.secUser.findUnique({
      where: { userID: user.userId },
      select: { subscriberID: true, nodeID: true },
    });

    let owns = false;
    if (map && caller) {
      if (user.roleId === Role.Subscriber) {
        owns = caller.subscriberID != null && caller.subscriberID === map.subscriberID;
      } else if (caller.nodeID != null && map.job?.clientID != null) {
        const person = await this.db.mstrPerson.findUnique({
          where: { personNodeID: caller.nodeID },
          select: { clientID: true },
        });
        owns = person?.clientID != null && person.clientID === map.job.clientID;
      }
    }
    if (!owns) throw new NotFoundException('Application not found');
  }

  async assertRound(roundId: number, user: RequestUser): Promise<void> {
    if (user.roleId !== Role.Subscriber && user.roleId !== Role.Client) return;
    const round = await this.db.interviewRound.findUnique({
      where: { id: BigInt(roundId) },
      select: { jobSubscriberMapID: true },
    });
    if (!round) throw new NotFoundException('Interview round not found');
    await this.assertMapping(round.jobSubscriberMapID, user);
  }

  async assertOffer(offerId: number, user: RequestUser): Promise<void> {
    if (user.roleId !== Role.Subscriber && user.roleId !== Role.Client) return;
    const offer = await this.db.offerLetter.findUnique({
      where: { id: BigInt(offerId) },
      select: { jobSubscriberMapID: true },
    });
    if (!offer) throw new NotFoundException('Offer letter not found');
    await this.assertMapping(offer.jobSubscriberMapID, user);
  }
}
