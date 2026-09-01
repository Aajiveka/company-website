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
    const jobRoleScore = this.scoreJobRole(candidateData.subFunctionID, jobData.designationID);
    const educationScore = this.scoreEducation(candidateData.educationTypeIds, jobData.requiredEducationTypeIds);
    const locationScore = this.scoreLocation(candidateData.currentCityID, candidateData.cityID, jobData.jobCityID);
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

  private async loadCandidate(subscriberId: number) {
    const [cv, skills, education] = await Promise.all([
      this.db.subscriberCVDetails.findUnique({
        where: { subscriberID: subscriberId },
        select: {
          totalExp: true,
          currentCityID: true,
          cityID: true,
          subFunctionID: true,
          noticePeriod: true,
          currentCTC: true,
        },
      }),
      this.db.subscriberITSkill.findMany({
        where: { subscriberID: subscriberId },
        select: { skillName: true },
      }),
      this.db.subscriberEducation.findMany({
        where: { subscriberID: subscriberId },
        select: { degreeID: true },
      }),
    ]);
    return {
      totalExp: cv?.totalExp ?? null,
      currentCityID: cv?.currentCityID ?? null,
      cityID: cv?.cityID ?? null,
      subFunctionID: cv?.subFunctionID ?? null,
      noticePeriod: cv?.noticePeriod ?? null,
      currentCTC: cv?.currentCTC ? Number(cv.currentCTC) : null,
      skills: skills.map((s) => s.skillName.toLowerCase().trim()),
      educationTypeIds: education.map((e) => e.degreeID).filter((id): id is number => id != null),
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
      minExp: job?.minExp ?? null,
      maxExp: job?.maxExp ?? null,
      minCTC: job?.minCTC ?? 0,
      maxCTC: job?.maxCTC ?? 0,
      jobCityID: job?.jobCityID ?? null,
      requiredSkills: skills.map((s) => (s.skill?.descr ?? '').toLowerCase().trim()).filter(Boolean),
      requiredEducationTypeIds: education.map((e) => e.educationTypeID),
    };
  }

  /** Jaccard similarity of candidate skills vs job required skills. */
  private scoreSkills(candidateSkills: string[], requiredSkills: string[]): number {
    if (!requiredSkills.length) return 100; // no requirements = full match
    if (!candidateSkills.length) return 0;
    const candidateSet = new Set(candidateSkills);
    const matched = requiredSkills.filter((s) => candidateSet.has(s)).length;
    // Jaccard = intersection / union
    const union = new Set([...candidateSkills, ...requiredSkills]).size;
    return Math.round((matched / union) * 100);
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

  /** Compare candidate sub-function/designation vs job designation. */
  private scoreJobRole(candidateSubFunctionID: number | null, jobDesignationID: number | null): number {
    if (candidateSubFunctionID == null || jobDesignationID == null) return 50;
    // Exact match on function/designation mapping
    return candidateSubFunctionID === jobDesignationID ? 100 : 30;
  }

  /** Check if candidate has the required education level. */
  private scoreEducation(candidateEdTypeIds: number[], requiredEdTypeIds: number[]): number {
    if (!requiredEdTypeIds.length) return 100;
    if (!candidateEdTypeIds.length) return 0;
    const candidateSet = new Set(candidateEdTypeIds);
    const hasMatch = requiredEdTypeIds.some((id) => candidateSet.has(id));
    return hasMatch ? 100 : 30;
  }

  /** Candidate preferred/current location matches job location. */
  private scoreLocation(currentCityID: number | null, preferredCityID: number | null, jobCityID: number | null): number {
    if (jobCityID == null) return 100;
    if (currentCityID === jobCityID || preferredCityID === jobCityID) return 100;
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
