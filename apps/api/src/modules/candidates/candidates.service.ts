import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import type { CreateJobAlertDto } from './dto/candidates.dto';

/**
 * The subscriber (candidate) side.
 *
 * A login does NOT imply a subscriber id. The legacy schema has no link between
 * tblSecUser and tblSubscriberRegistration — the C# put SubscriberID straight into
 * Session, and we did not recover it. This used to pass user.userId straight through as
 * the subscriber id, which only worked because UserID 1 and SubscriberID 1 happened to
 * collide in the dev data. They are independent identity sequences.
 *
 * The link is now explicit (tblSecUser.SubscriberID). It is NULL for the migrated legacy
 * rows, because the mapping is not discoverable from the data and guessing it would hand
 * one candidate another candidate's CV.
 */
@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  /** Resolves the caller's own subscriber id, or fails loudly. */
  async subscriberIdFor(userId: number): Promise<number> {
    const user = await this.db.secUser.findUnique({
      where: { userID: userId },
      select: { subscriberID: true },
    });
    if (!user?.subscriberID) {
      throw new NotFoundException('This login is not linked to a candidate profile');
    }
    return Number(user.subscriberID);
  }

  /** Port of spSubscriberGetCVToDisplay. */
  async profile(subscriberId: number) {
    const cv = await this.db.subscriberCVDetails.findUnique({
      where: { subscriberID: subscriberId },
      include: {
        city: { select: { descr: true } },
        subFunction: { select: { descr: true } },
        industryType: { select: { industryType: true } },
      },
    });
    if (!cv) throw new NotFoundException('Candidate profile not found');

    const [tags, education, employers] = await Promise.all([
      // Skills are tags, not tblMstrSkills — the proc builds them from tblSubscriberTags.
      this.db.subscriberTags.findMany({
        where: { subscriberID: subscriberId },
        include: { tag: { select: { tagName: true } } },
      }),
      this.db.subscriberEducation.findMany({
        where: { subscriberID: subscriberId },
        include: { degree: { select: { degreeName: true } } },
        orderBy: { subscriberEducationID: 'asc' },
      }),
      this.db.subscriberEmployer.findMany({
        where: { subscriberID: subscriberId },
        include: { designation: { select: { descr: true } } },
        orderBy: { joiningDate: 'desc' },
      }),
    ]);

    const gender = cv.gender === 'M' ? 'Male' : cv.gender === 'F' ? 'Female' : 'Others';
    const date = (d: Date | null) => (d && d.getFullYear() > 1900 ? d.toISOString().slice(0, 10) : '');

    return {
      subscriberId,
      fullName: cv.fullName?.trim() || cv.mobileNo1 || '',
      email: cv.emailID ?? '',
      mobile: cv.mobileNo1 ?? '',
      gender,
      city: cv.city?.descr ?? '',
      designation: cv.subFunction?.descr ?? '',
      totalExperience: cv.totalExp != null ? String(cv.totalExp) : '',
      photoUrl: cv.photoName?.trim() ? `/files/${cv.photoName}` : null,
      skills: tags.map((t) => t.tag?.tagName ?? '').filter(Boolean),
      education: education.map((e) => ({
        degree: e.degree?.degreeName ?? '',
        institute: '', // tblSubscriberEducation records no institute — the column does not exist.
        year: date(e.timestampIns).slice(0, 4),
      })),
      experience: employers.map((e) => ({
        company: e.employer ?? '',
        designation: e.designation?.descr ?? '',
        from: date(e.joiningDate),
        to: e.flgCurrent ? 'Present' : date(e.releavingDate),
      })),
    };
  }

  /** Jobs the candidate has applied to (tblJobSubscriberMapping + its status). */
  async appliedJobs(subscriberId: number) {
    const rows = await this.db.jobSubscriberMapping.findMany({
      where: { subscriberID: subscriberId },
      orderBy: { mapDate: 'desc' },
      include: {
        job: {
          include: {
            client: { select: { clientName: true } },
            jobCity: { select: { descr: true } },
            designation: { select: { descr: true } },
          },
        },
        jobMapStatus: { select: { descr: true } },
      },
    });

    return rows.map((r) => ({
      jobId: Number(r.jobID),
      designation: r.job?.designation?.descr ?? '',
      company: r.job?.client?.clientName ?? '',
      city: r.job?.jobCity?.descr ?? '',
      appliedOn: r.mapDate?.toISOString().slice(0, 10) ?? '',
      status: r.jobMapStatus?.descr ?? 'Applied',
    }));
  }

  /** Documents mapped to the candidate, and whether each has been uploaded yet. */
  async documents(subscriberId: number) {
    const [mapped, uploaded, master] = await Promise.all([
      this.db.candidateDocumentMap.findMany({ where: { subscriberID: subscriberId } }),
      this.db.candidateDocumentUploaded.findMany({ where: { subscriberID: subscriberId } }),
      this.db.mstrDocuments.findMany(),
    ]);
    const nameOf = new Map(master.map((m) => [Number(m.documentID), m.documentName ?? '']));

    return mapped.map((m) => {
      const up = uploaded.find((u) => Number(u.documentMapID) === Number(m.documentMapID));
      return {
        documentId: Number(m.documentMapID),
        name: nameOf.get(Number(m.documentTypeID)) ?? '',
        status: up ? (up.flgStatus === 1 ? 'Verified' : up.flgStatus === 2 ? 'Rejected' : 'Uploaded') : 'Pending',
        uploadedOn: up?.timestampIns?.toISOString().slice(0, 10) ?? null,
      };
    });
  }

  /**
   * Job alerts. There is NO legacy table for these — the feature existed only in the
   * mocks — so this reads and writes tblSubscriberJobAlert, which is new.
   */
  async jobAlerts(subscriberId: number) {
    const rows = await this.db.subscriberJobAlert.findMany({
      where: { subscriberID: subscriberId },
      orderBy: { alertID: 'desc' },
    });
    return rows.map((a) => ({
      alertId: Number(a.alertID),
      keyword: a.keyword,
      location: a.location,
      frequency: a.frequency as 'Daily' | 'Weekly',
    }));
  }

  async createJobAlert(subscriberId: number, dto: CreateJobAlertDto) {
    const a = await this.db.subscriberJobAlert.create({
      data: {
        subscriberID: subscriberId,
        keyword: dto.keyword,
        location: dto.location,
        frequency: dto.frequency,
      },
    });
    return {
      alertId: Number(a.alertID),
      keyword: a.keyword,
      location: a.location,
      frequency: a.frequency as 'Daily' | 'Weekly',
    };
  }

  /** Verifies the current password against the Argon2 hash before replacing it. */
  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.db.secUser.findUnique({
      where: { userID: userId },
      select: { password: true },
    });
    const ok = user?.password
      ? await argon2.verify(user.password, currentPassword).catch(() => false)
      : false;
    if (!ok) throw new BadRequestException('Current password is incorrect');

    await this.db.secUser.update({
      where: { userID: userId },
      data: {
        password: await argon2.hash(newPassword, { type: argon2.argon2id }),
        // The legacy PwdStatus flag: 1 = the user has set their own password.
        pwdStatus: 1,
      },
    });
    return { message: 'Password changed successfully' };
  }
}
