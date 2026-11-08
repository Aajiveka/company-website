import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Weights from the Figma flow's 7-criteria scoring model.
 * Each sub-score is 0–100, and the weighted total is also 0–100.
 */
const WEIGHTS = {
  skill: 0.30,
  experience: 0.25,
  jobRole: 0.20,
  education: 0.10,
  location: 0.05,
  salary: 0.05,
  noticePeriod: 0.05,
} as const;

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  /**
   * Score a candidate–job pair and persist the result in tblCandidateJobScore.
   * Called when an application arrives at QC1 (or on-demand from the candidate detail page).
   */
  async scoreApplication(jobSubscriberMapId: number, scoredBy?: number) {
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      select: { subscriberID: true, jobID: true },
    });
    if (!mapping?.subscriberID || !mapping?.jobID) return null;

    const subscriberId = Number(mapping.subscriberID);
    const jobId = Number(mapping.jobID);

    const [candidateData, jobData] = await Promise.all([
      this.loadCandidate(subscriberId),
      this.loadJob(jobId),
    ]);

    const skillScore = this.scoreSkills(candidateData.skills, jobData.requiredSkills);
    const experienceScore = this.scoreExperience(candidateData.totalExp, jobData.minExp, jobData.maxExp);
    const jobRoleScore = this.scoreJobRole(candidateData, jobData.designationID, jobData.designationName);
    const educationScore = this.scoreEducation(candidateData.educationTypeIds, jobData.requiredEducationTypeIds);
    const locationScore = this.scoreLocation(
      [candidateData.currentCityID, candidateData.cityID, ...candidateData.preferredCityIds],
      jobData.jobCityID,
    );
    const salaryScore = this.scoreSalary(candidateData.currentCTC, jobData.minCTC, jobData.maxCTC);
    const noticePeriodScore = this.scoreNoticePeriod(candidateData.noticePeriod);

    const totalScore = Math.round(
      skillScore * WEIGHTS.skill +
      experienceScore * WEIGHTS.experience +
      jobRoleScore * WEIGHTS.jobRole +
      educationScore * WEIGHTS.education +
      locationScore * WEIGHTS.location +
      salaryScore * WEIGHTS.salary +
      noticePeriodScore * WEIGHTS.noticePeriod,
    );

    const score = await this.db.candidateJobScore.upsert({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      create: {
        jobSubscriberMapID: jobSubscriberMapId,
        skillScore,
        experienceScore,
        jobRoleScore,
        educationScore,
        locationScore,
        salaryScore,
        noticePeriodScore,
        totalScore,
        scoredBy: scoredBy ? BigInt(scoredBy) : null,
      },
      update: {
        skillScore,
        experienceScore,
        jobRoleScore,
        educationScore,
        locationScore,
        salaryScore,
        noticePeriodScore,
        totalScore,
        scoredAt: new Date(),
        scoredBy: scoredBy ? BigInt(scoredBy) : null,
      },
    });

    return {
      totalScore,
      skillScore,
      experienceScore,
      jobRoleScore,
      educationScore,
      locationScore,
      salaryScore,
      noticePeriodScore,
      id: Number(score.id),
    };
  }

  /**
   * Every skill the candidate has stated, as typed: the IT-skills rows plus the Key Skills
   * chips (kept as text on the extras row). Scoring used to read the IT-skills table alone, so a
   * candidate who filled in only Key Skills — the section the profile leads with — scored 0 on
   * the heaviest criterion. Shared with Q2's coverage panel so the two cannot disagree.
   */
  async candidateSkills(subscriberId: number): Promise<string[]> {
    const [itSkills, extra] = await Promise.all([
      this.db.subscriberITSkill.findMany({ where: { subscriberID: subscriberId }, select: { skillName: true } }),
      this.db.subscriberProfileExtra.findUnique({ where: { subscriberID: subscriberId }, select: { keySkills: true } }),
    ]);
    const seen = new Map<string, string>();
    for (const s of [...itSkills.map((x) => x.skillName), ...(extra?.keySkills ?? '').split(',')]) {
      const t = s.trim();
      if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
    }
    return [...seen.values()];
  }

  private async loadCandidate(subscriberId: number) {
    const [cv, skills, education, employment, preferred, extra] = await Promise.all([
      this.db.subscriberCVDetails.findUnique({
        where: { subscriberID: subscriberId },
        select: {
          totalExp: true,
          currentCityID: true,
          cityID: true,
          subFunctionID: true,
          noticePeriod: true,
          currentCTC: true,
          subFunction: { select: { descr: true } },
        },
      }),
      this.candidateSkills(subscriberId),
      this.db.subscriberEducation.findMany({
        where: { subscriberID: subscriberId },
        select: { degreeID: true },
      }),
      this.db.subscriberEmployer.findMany({
        where: { subscriberID: subscriberId },
        select: { designationID: true, designation: { select: { descr: true } } },
      }),
      this.db.subscriberPrefferedLocations.findMany({
        where: { subscriberID: subscriberId },
        select: { cityID: true },
      }),
      this.db.subscriberProfileExtra.findUnique({
        where: { subscriberID: subscriberId },
        select: { preferredJobRoles: true },
      }),
    ]);
    return {
      totalExp: cv?.totalExp ?? null,
      currentCityID: cv?.currentCityID ?? null,
      cityID: cv?.cityID ?? null,
      subFunctionID: cv?.subFunctionID ?? null,
      noticePeriod: cv?.noticePeriod ?? null,
      currentCTC: cv?.currentCTC ? Number(cv.currentCTC) : null,
      skills: skills.map((s) => s.toLowerCase()),
      educationTypeIds: education.map((e) => e.degreeID).filter((id): id is number => id != null),
      preferredCityIds: preferred.map((p) => p.cityID),
      // Role evidence, in the masters each one actually uses: designations held (same master as
      // the job's), and free-text role names (function, past titles, stated preferences).
      designationIds: employment.map((e) => e.designationID).filter((id): id is number => id != null),
      roleNames: [
        cv?.subFunction?.descr,
        ...employment.map((e) => e.designation?.descr),
        ...(extra?.preferredJobRoles ?? '').split(','),
      ].filter((s): s is string => !!s?.trim()),
    };
  }

  private async loadJob(jobId: number) {
    const [job, skills, education] = await Promise.all([
      this.db.clientJobs.findUnique({
        where: { jobID: jobId },
        select: {
          designationID: true,
          minExp: true,
          maxExp: true,
          minCTC: true,
          maxCTC: true,
          jobCityID: true,
          designation: { select: { descr: true } },
        },
      }),
      this.db.clientJobSkill.findMany({
        where: { jobID: jobId },
        include: { skill: { select: { descr: true } } },
      }),
      this.db.clientJobs_EducationType.findMany({
        where: { jobID: jobId },
        select: { educationTypeID: true },
      }),
    ]);
    return {
      designationID: job?.designationID ?? null,
      designationName: job?.designation?.descr ?? null,
      minExp: job?.minExp ?? null,
      maxExp: job?.maxExp ?? null,
      minCTC: job?.minCTC ?? 0,
      maxCTC: job?.maxCTC ?? 0,
      jobCityID: job?.jobCityID ?? null,
      requiredSkills: skills.map((s) => (s.skill?.descr ?? '').toLowerCase().trim()).filter(Boolean),
      requiredEducationTypeIds: education.map((e) => e.educationTypeID),
    };
  }

  /**
   * Share of the job's required skills the candidate has. This was Jaccard (matched / union),
   * which docked a candidate for every skill beyond the job's list — someone holding all three
   * required skills plus three more scored 50, below a candidate holding exactly two of them.
   */
  private scoreSkills(candidateSkills: string[], requiredSkills: string[]): number {
    if (!requiredSkills.length) return 100; // no requirements = full match
    if (!candidateSkills.length) return 0;
    const candidateSet = new Set(candidateSkills);
    const required = [...new Set(requiredSkills)];
    const matched = required.filter((s) => candidateSet.has(s)).length;
    return Math.round((matched / required.length) * 100);
  }

  /** Gaussian-like around required experience range. */
  private scoreExperience(totalExp: number | null, minExp: number | null, maxExp: number | null): number {
    if (totalExp == null || (minExp == null && maxExp == null)) return 50;
    const midpoint = ((minExp ?? 0) + (maxExp ?? (minExp ?? 0) + 5)) / 2;
    const diff = Math.abs(totalExp - midpoint);
    if (diff <= 2) return 100;
    if (diff <= 5) return 50;
    return 25;
  }

  /**
   * Does the candidate's role match the job's designation?
   *
   * The old check compared the candidate's SubFunctionID with the job's DesignationID — ids from
   * two unrelated masters — so a genuine match ("Front End Developer" applying for "Frontend
   * Developer") scored 30 like everyone else and an unrelated pair could score 100 by id
   * coincidence. Now: a designation the candidate has held (same master as the job's), or a role
   * name that is the same once case, spaces and punctuation are ignored.
   */
  private scoreJobRole(
    c: { subFunctionID: number | null; designationIds: number[]; roleNames: string[] },
    jobDesignationID: number | null,
    jobDesignationName: string | null,
  ): number {
    if (jobDesignationID == null) return 50;
    if (c.designationIds.includes(jobDesignationID)) return 100;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const job = jobDesignationName ? norm(jobDesignationName) : '';
    if (job && c.roleNames.some((n) => norm(n) === job)) return 100;
    if (c.subFunctionID == null && !c.designationIds.length && !c.roleNames.length) return 50;
    return 30;
  }

  /** Check if candidate has the required education level. */
  private scoreEducation(candidateEdTypeIds: number[], requiredEdTypeIds: number[]): number {
    if (!requiredEdTypeIds.length) return 100;
    if (!candidateEdTypeIds.length) return 0;
    const candidateSet = new Set(candidateEdTypeIds);
    const hasMatch = requiredEdTypeIds.some((id) => candidateSet.has(id));
    return hasMatch ? 100 : 30;
  }

  /** The job's city is the candidate's current, home or a stated preferred city. */
  private scoreLocation(candidateCityIds: (number | null)[], jobCityID: number | null): number {
    if (jobCityID == null) return 100;
    if (candidateCityIds.includes(jobCityID)) return 100;
    return 20;
  }

  /** Candidate expected salary within job CTC range. */
  private scoreSalary(currentCTC: number | null, minCTC: number, maxCTC: number): number {
    if (currentCTC == null || maxCTC === 0) return 50;
    if (currentCTC >= minCTC && currentCTC <= maxCTC) return 100;
    if (currentCTC < minCTC) return Math.max(0, Math.round(100 - ((minCTC - currentCTC) / minCTC) * 100));
    // Above max
    return Math.max(0, Math.round(100 - ((currentCTC - maxCTC) / maxCTC) * 100));
  }

  /** Shorter notice = higher score. */
  private scoreNoticePeriod(noticePeriod: number | null): number {
    if (noticePeriod == null) return 50;
    if (noticePeriod <= 30) return 100;
    if (noticePeriod <= 60) return 75;
    if (noticePeriod <= 90) return 50;
    return 25;
  }
}
