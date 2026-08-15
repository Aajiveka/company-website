/**
 * Enrich demo candidate (subscriber 1 / Anuj) with full profile sections + a real PDF resume
 * so employer applicant profile pages can show details and preview.
 *
 *   npx tsx scripts/seed-applicant-profile-resume.ts
 */
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createPrismaClient } from '../src/prisma/prisma.client';

const prisma = createPrismaClient();
const STORAGE_ROOT = resolve(process.env.STORAGE_LOCAL_ROOT || './storage');

/** Minimal valid PDF with one line of text. */
function buildDemoPdf(title: string): Buffer {
  const text = title.replace(/[()\\]/g, ' ');
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj T* /F1 12 Tf (Email: anuj@example.com) Tj T* (Phone: 9873174794) Tj T* (Experience: Frontend developer) Tj ET`;
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n',
    `4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function main() {
  const subscriberId = 1n;
  const cv = await prisma.subscriberCVDetails.findUnique({ where: { subscriberID: subscriberId } });
  if (!cv) {
    console.error('SubscriberCVDetails missing for subscriber 1');
    process.exit(1);
  }

  const docs = await prisma.mstrDocuments.findMany({ take: 20 });
  const resumeDoc =
    docs.find((d) => (d.documentName ?? '').toLowerCase().includes('resume')) ||
    docs.find((d) => (d.documentName ?? '').toLowerCase().includes('cv')) ||
    docs[0];
  const folder =
    resumeDoc?.rootFolder && resumeDoc?.folderName
      ? `${resumeDoc.rootFolder}/${resumeDoc.folderName}`
      : 'CV/Resume';

  const key = `${folder}/1-demo-anuj-resume.pdf`;
  const full = join(STORAGE_ROOT, key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, buildDemoPdf('Anuj Candidate — Resume'));
  console.log('Wrote resume to', full);

  const now = new Date();
  await prisma.subscriberCVDetails.update({
    where: { subscriberID: subscriberId },
    data: {
      cVPath: key,
      dOB: new Date('1998-05-12'),
      flgReadyToRelocate: 1,
      timestampUpd: now,
    },
  });

  await prisma.subscriberCVUploaded.upsert({
    where: { subscriberID: subscriberId },
    create: {
      subscriberID: subscriberId,
      latestCVPath: key,
      cVName: 'Anuj_Candidate_Resume.pdf',
      timestampIns: now,
      loginIDIns: 4,
    },
    update: {
      latestCVPath: key,
      cVName: 'Anuj_Candidate_Resume.pdf',
      tImestampUpd: now,
      loginIDUpd: 4,
    },
  });

  await prisma.subscriberRegistration.update({
    where: { subscriberID: subscriberId },
    data: { flgCVUploaded: 1 },
  });

  await prisma.subscriberProfileExtra.upsert({
    where: { subscriberID: subscriberId },
    create: {
      subscriberID: subscriberId,
      resumeHeadline: 'Frontend developer · React & TypeScript',
      profileSummary:
        'Frontend engineer with hands-on experience building ATS and hiring portals. Comfortable with React, NestJS APIs, and PostgreSQL. Looking for a full-time role in product engineering.',
      department: 'Engineering',
      roleCategory: 'Software Development',
      jobRole: 'Frontend Developer',
      desiredJobType: 'Permanent',
      desiredEmploymentType: 'Full Time',
      preferredShift: 'Day',
      preferredWorkModes: 'Hybrid, Remote',
      preferredSalary: 600000,
      preferredJobRoles: 'Frontend Developer, Full Stack Developer',
      maritalStatus: 'Single',
      timestampIns: now,
      loginIDIns: 4,
    },
    update: {
      resumeHeadline: 'Frontend developer · React & TypeScript',
      profileSummary:
        'Frontend engineer with hands-on experience building ATS and hiring portals. Comfortable with React, NestJS APIs, and PostgreSQL. Looking for a full-time role in product engineering.',
      department: 'Engineering',
      roleCategory: 'Software Development',
      jobRole: 'Frontend Developer',
      desiredJobType: 'Permanent',
      desiredEmploymentType: 'Full Time',
      preferredShift: 'Day',
      preferredWorkModes: 'Hybrid, Remote',
      preferredSalary: 600000,
      preferredJobRoles: 'Frontend Developer, Full Stack Developer',
      maritalStatus: 'Single',
      timestampUpd: now,
      loginIDUpd: 4,
    },
  });

  await prisma.subscriberITSkill.deleteMany({ where: { subscriberID: subscriberId } });
  await prisma.subscriberITSkill.createMany({
    data: [
      {
        subscriberID: subscriberId,
        skillName: 'React',
        version: '18',
        lastUsedYear: 2026,
        expYears: 2,
        expMonths: 0,
        timestampIns: now,
        loginIDIns: 4,
      },
      {
        subscriberID: subscriberId,
        skillName: 'TypeScript',
        version: '5',
        lastUsedYear: 2026,
        expYears: 2,
        expMonths: 0,
        timestampIns: now,
        loginIDIns: 4,
      },
      {
        subscriberID: subscriberId,
        skillName: 'PostgreSQL',
        lastUsedYear: 2026,
        expYears: 1,
        expMonths: 6,
        timestampIns: now,
        loginIDIns: 4,
      },
    ],
  });

  await prisma.subscriberCertificate.deleteMany({ where: { subscriberID: subscriberId } });
  await prisma.subscriberCertificate.create({
    data: {
      subscriberID: subscriberId,
      certificateName: 'Meta Front-End Developer',
      certificateUrl: 'https://www.coursera.org/',
      certificationID: 'META-FE-2024',
      validFromMonth: 3,
      validFromYear: 2024,
      flgNeverExpires: true,
      timestampIns: now,
      loginIDIns: 4,
    },
  });

  await prisma.subscriberProject.deleteMany({ where: { subscriberID: subscriberId } });
  await prisma.subscriberProject.create({
    data: {
      subscriberID: subscriberId,
      title: 'Aajiveka Candidate Portal',
      clientName: 'Aajiveka',
      projectStatus: 'In Progress',
      workedFromMonth: 1,
      workedFromYear: 2025,
      projectSite: 'Remote',
      natureOfEmployment: 'Full Time',
      teamSize: 4,
      roleDescr: 'Frontend developer',
      skillsUsed: 'React, TypeScript, Tailwind',
      details: 'Built candidate profile, resume upload, and job application flows.',
      timestampIns: now,
      loginIDIns: 4,
    },
  });

  await prisma.subscriberAccomplishment.deleteMany({ where: { subscriberID: subscriberId } });
  await prisma.subscriberAccomplishment.create({
    data: {
      subscriberID: subscriberId,
      kind: 'ONLINE_PROFILE',
      title: 'GitHub',
      url: 'https://github.com/',
      descr: 'Open-source contributions and personal projects.',
      timestampIns: now,
      loginIDIns: 4,
    },
  });

  const cityId = cv.cityID ?? cv.currentCityID;
  if (cityId) {
    await prisma.subscriberPrefferedLocations.deleteMany({ where: { subscriberID: subscriberId } });
    await prisma.subscriberPrefferedLocations.create({
      data: { subscriberID: subscriberId, cityID: cityId },
    });
  }

  const tags = await prisma.mstrTags.findMany({ take: 5, orderBy: { tagID: 'asc' } });
  if (tags.length) {
    await prisma.subscriberTags.deleteMany({ where: { subscriberID: subscriberId } });
    await prisma.subscriberTags.createMany({
      data: tags.map((t) => ({ subscriberID: subscriberId, tagID: t.tagID })),
      skipDuplicates: true,
    });
  }

  console.log('Enriched subscriber 1 profile + resume. Open /company/applicants/7');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
