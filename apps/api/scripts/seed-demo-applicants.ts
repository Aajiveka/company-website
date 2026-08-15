/**
 * One-off: create full demo applicants for employer anuj@aajiveka.com
 * so /company/applicants has real rows to work with.
 *
 *   npx tsx scripts/seed-demo-applicants.ts
 */
import 'dotenv/config';
import { createPrismaClient } from '../src/prisma/prisma.client';

const prisma = createPrismaClient();

const JobMapStatus = {
  MAPPED: 1,
  SHORTLISTED: 2,
  INTERVIEW_SCHEDULED: 3,
  SELECTED: 4,
  REJECTED: 5,
} as const;

const SubscriberStatus = {
  MAPPED_TO_JOB: 5,
  SHORTLISTED: 6,
  INTERVIEW_SCHEDULED: 7,
  SELECTED: 13,
  REJECTED: 14,
} as const;

const APPLICANTS = [
  {
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    mobile: '9811110001',
    gender: 'F',
    totalExp: 4,
    currentCtc: 900000,
    notice: 30,
    employer: 'Infosys',
    jobDescr: 'Built React dashboards and design systems.',
    address: 'Koramangala, Bengaluru',
    status: JobMapStatus.MAPPED as number,
    histStatus: SubscriberStatus.MAPPED_TO_JOB,
  },
  {
    fullName: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    mobile: '9811110002',
    gender: 'M',
    totalExp: 6,
    currentCtc: 1400000,
    notice: 60,
    employer: 'TCS',
    jobDescr: 'Led Node.js / PostgreSQL API services.',
    address: 'Sector 62, Noida',
    status: JobMapStatus.SHORTLISTED as number,
    histStatus: SubscriberStatus.SHORTLISTED,
  },
  {
    fullName: 'Aisha Khan',
    email: 'aisha.khan@example.com',
    mobile: '9811110003',
    gender: 'F',
    totalExp: 3,
    currentCtc: 750000,
    notice: 15,
    employer: 'Wipro',
    jobDescr: 'QA automation with Selenium and Cypress.',
    address: 'Hinjewadi, Pune',
    status: JobMapStatus.INTERVIEW_SCHEDULED as number,
    histStatus: SubscriberStatus.INTERVIEW_SCHEDULED,
  },
  {
    fullName: 'Vikram Singh',
    email: 'vikram.singh@example.com',
    mobile: '9811110004',
    gender: 'M',
    totalExp: 8,
    currentCtc: 2200000,
    notice: 90,
    employer: 'Amazon',
    jobDescr: 'Owned checkout microservices on AWS.',
    address: 'Gurugram, Haryana',
    status: JobMapStatus.SELECTED as number,
    histStatus: SubscriberStatus.SELECTED,
  },
  {
    fullName: 'Neha Patel',
    email: 'neha.patel@example.com',
    mobile: '9811110005',
    gender: 'F',
    totalExp: 2,
    currentCtc: 550000,
    notice: 0,
    employer: 'StartupXYZ',
    jobDescr: 'Full-stack features with React and NestJS.',
    address: 'Ahmedabad',
    status: JobMapStatus.REJECTED as number,
    histStatus: SubscriberStatus.REJECTED,
  },
  {
    fullName: 'Anuj Candidate',
    email: 'anuj@example.com',
    mobile: '9873174794',
    gender: 'M',
    totalExp: 1,
    currentCtc: 400000,
    notice: 30,
    employer: 'Freelance',
    jobDescr: 'Junior frontend work.',
    address: 'Delhi',
    status: JobMapStatus.MAPPED as number,
    histStatus: SubscriberStatus.MAPPED_TO_JOB,
    reuseDemoUser: true,
  },
] as const;

async function main() {
  const employer = await prisma.secUser.findFirst({
    where: { userName: 'anuj@aajiveka.com' },
    select: { userID: true, nodeID: true },
  });
  if (!employer?.nodeID) {
    throw new Error('Employer anuj@aajiveka.com not found. Run seed with SEED_DEMO_USERS=1 first.');
  }

  const person = await prisma.mstrPerson.findUnique({
    where: { personNodeID: employer.nodeID },
    select: { clientID: true },
  });
  if (!person?.clientID) {
    throw new Error('Employer has no linked company (ClientID).');
  }
  const clientId = person.clientID;
  const actorUserId = employer.userID;

  let jobs = await prisma.clientJobs.findMany({
    where: { clientID: clientId, statusID: 1 },
    orderBy: { jobID: 'desc' },
    take: 3,
    select: {
      jobID: true,
      designationID: true,
      designation: { select: { descr: true } },
    },
  });

  if (!jobs.length) {
    const designation = await prisma.mstrDesignation.findFirst({ orderBy: { designationID: 'asc' } });
    const empType = await prisma.mstrEmpType.findFirst({ orderBy: { employeeTypeID: 'asc' } });
    const workMode = await prisma.mstrWorkMode.findFirst({ orderBy: { workModeID: 'asc' } });
    const city = await prisma.mstrCily.findFirst({ orderBy: { cityID: 'asc' } });
    if (!designation || !empType || !workMode || !city) {
      throw new Error('Masters missing — run prisma seed first.');
    }
    const created = await prisma.clientJobs.create({
      data: {
        clientID: clientId,
        designationID: designation.designationID,
        employeeTypeID: empType.employeeTypeID,
        workModeID: workMode.workModeID,
        jobCityID: city.cityID,
        jobDescr: 'Demo job for applicant seeding.',
        minExp: 1,
        maxExp: 5,
        minCTC: 500000,
        maxCTC: 1200000,
        educationDetail: 'B.Tech',
        department: 'Engineering',
        statusID: 1,
        timestampIns: new Date(),
        loginIDIns: actorUserId,
      },
      select: {
        jobID: true,
        designationID: true,
        designation: { select: { descr: true } },
      },
    });
    jobs = [created];
    console.log(`Created demo job #${created.jobID} (${created.designation?.descr})`);
  }

  const city =
    (await prisma.mstrCily.findFirst({ where: { descr: { contains: 'Bengaluru', mode: 'insensitive' } } })) ??
    (await prisma.mstrCily.findFirst());
  const skill =
    (await prisma.mstrSkills.findFirst({ where: { descr: { contains: 'React', mode: 'insensitive' } } })) ??
    (await prisma.mstrSkills.findFirst());
  const industry = await prisma.mstrIndustryType.findFirst();
  const course = await prisma.mstrCourse.findFirst();
  const eduType = await prisma.mstrEducationType.findFirst();
  const designation =
    (await prisma.mstrDesignation.findFirst({ where: { descr: { contains: 'Developer', mode: 'insensitive' } } })) ??
    (await prisma.mstrDesignation.findFirst());

  const demoCandidateUser = await prisma.secUser.findFirst({
    where: { userName: 'anuj' },
    select: { userID: true, subscriberID: true },
  });

  let createdApps = 0;
  let skipped = 0;

  for (let i = 0; i < APPLICANTS.length; i++) {
    const a = APPLICANTS[i]!;
    const job = jobs[i % jobs.length]!;
    const now = new Date();
    const appliedOn = new Date(now.getTime() - i * 86400000);

    let subscriberId: bigint;

    if (a.reuseDemoUser && demoCandidateUser?.subscriberID) {
      subscriberId = demoCandidateUser.subscriberID;
      await prisma.subscriberCVDetails.update({
        where: { subscriberID: subscriberId },
        data: {
          fullName: a.fullName,
          emailID: a.email,
          mobileNo1: a.mobile,
          gender: a.gender,
          addressLine1: a.address,
          totalExp: a.totalExp,
          currentCTC: a.currentCtc,
          noticePeriod: a.notice,
          cityID: city?.cityID ?? null,
          currentCityID: city?.cityID ?? null,
          skillID: skill?.skillID ?? null,
          industryTypeID: industry?.industryTypeID ?? null,
          onboardedAt: now,
          emailVerified: true,
          emailVerifiedAt: now,
          timestampUpd: now,
        },
      });
    } else {
      const existingCv = await prisma.subscriberCVDetails.findFirst({
        where: { emailID: a.email },
        select: { subscriberID: true },
      });
      if (existingCv) {
        subscriberId = existingCv.subscriberID;
      } else {
        const reg = await prisma.subscriberRegistration.create({
          data: {
            registrationMobileNo: a.mobile,
            registrationCountryCode: '+91',
            registrationIPNo: '127.0.0.1',
            registrationDateTime: now,
            flgCVUploaded: 1,
            flgstatus: 1,
          },
        });
        subscriberId = reg.subscriberID;
        await prisma.subscriberCVDetails.create({
          data: {
            subscriberID: subscriberId,
            fullName: a.fullName,
            emailID: a.email,
            mobileNo1: a.mobile,
            gender: a.gender,
            addressLine1: a.address,
            totalExp: a.totalExp,
            currentCTC: a.currentCtc,
            noticePeriod: a.notice,
            cityID: city?.cityID ?? null,
            currentCityID: city?.cityID ?? null,
            skillID: skill?.skillID ?? null,
            industryTypeID: industry?.industryTypeID ?? null,
            onboardedAt: now,
            emailVerified: true,
            emailVerifiedAt: now,
            cVPath: `/uploads/demo/${a.mobile}-cv.pdf`,
            timestampIns: now,
            loginIDIns: actorUserId,
          },
        });
      }
    }

    const already = await prisma.jobSubscriberMapping.findFirst({
      where: { jobID: job.jobID, subscriberID: subscriberId },
      select: { jobSubscriberMapID: true },
    });
    if (already) {
      skipped++;
      console.log(`Skip (already applied): ${a.fullName} → job #${job.jobID}`);
      continue;
    }

    const eduCount = await prisma.subscriberEducation.count({ where: { subscriberID: subscriberId } });
    if (!eduCount) {
      await prisma.subscriberEducation.create({
        data: {
          subscriberID: subscriberId,
          courseTypeID: course?.degreeID ?? null,
          degreeID: eduType?.educationTypeID ?? null,
          instituteName: 'Demo Institute of Technology',
          passingYear: 2018 + (a.totalExp % 5),
          courseMode: 'Full Time',
          marks: '78%',
          timestampIns: now,
          loginIDIns: actorUserId,
        },
      });
    }

    const empCount = await prisma.subscriberEmployer.count({ where: { subscriberID: subscriberId } });
    if (!empCount) {
      await prisma.subscriberEmployer.create({
        data: {
          subscriberID: subscriberId,
          employer: a.employer,
          designationID: designation?.designationID ?? job.designationID,
          joiningDate: new Date('2021-01-15'),
          releavingDate: null,
          salary: a.currentCtc,
          jobDescr: a.jobDescr,
          noticePeriodDays: a.notice,
          timestampIns: now,
          loginIDIns: actorUserId,
        },
      });
    }

    const map = await prisma.jobSubscriberMapping.create({
      data: {
        jobID: job.jobID,
        subscriberID: subscriberId,
        mapDate: appliedOn,
        jobMapStatusID: a.status,
        timestampIns: appliedOn,
        loginIDIns: actorUserId,
      },
    });

    await prisma.jobSubscriberStatus.create({
      data: {
        jobSubscriberMapID: map.jobSubscriberMapID,
        jobMapStatusID: a.status,
        mappedbyUserID: Number(actorUserId),
        timestampIns: appliedOn,
        comments: `Seeded as ${Object.keys(JobMapStatus).find((k) => JobMapStatus[k as keyof typeof JobMapStatus] === a.status) ?? a.status}`,
      },
    });

    await prisma.subscriberJobStatusLatest.upsert({
      where: { subscriberID: subscriberId },
      create: {
        subscriberID: subscriberId,
        clientID: clientId,
        jobID: job.jobID,
        jobSubscriberMapID: map.jobSubscriberMapID,
        jobMapStatusID: a.status,
        timestampIns: appliedOn,
        flgClose: 0,
      },
      update: {
        clientID: clientId,
        jobID: job.jobID,
        jobSubscriberMapID: map.jobSubscriberMapID,
        jobMapStatusID: a.status,
        timestampIns: appliedOn,
        flgClose: 0,
      },
    });

    await prisma.subscriberStatusHistory.create({
      data: {
        subscriberID: subscriberId,
        jobID: job.jobID,
        clientID: clientId,
        jobSubscriberMapID: map.jobSubscriberMapID,
        statusID: a.histStatus,
        userID: actorUserId,
        timestampIns: appliedOn,
        loginIDIns: actorUserId,
      },
    });

    await prisma.applicantNote.create({
      data: {
        jobSubscriberMapID: map.jobSubscriberMapID,
        note: `Demo note for ${a.fullName}: strong fit for ${job.designation?.descr ?? 'role'}.`,
        updatedBy: Number(actorUserId),
      },
    });

    createdApps++;
    console.log(
      `Applied: ${a.fullName} → job #${job.jobID} (${job.designation?.descr}) status=${a.status} map=#${map.jobSubscriberMapID}`,
    );
  }

  console.log(`\nDone. Created ${createdApps} application(s), skipped ${skipped}.`);
  console.log('Refresh /company/applicants while logged in as anuj@aajiveka.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
