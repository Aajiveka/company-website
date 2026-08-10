-- Employer Post Job fields that were missing on tblClientJobs.
ALTER TABLE "tblClientJobs" ADD COLUMN IF NOT EXISTS "MaxExp" INTEGER;
ALTER TABLE "tblClientJobs" ADD COLUMN IF NOT EXISTS "EducationDetail" VARCHAR(500);
ALTER TABLE "tblClientJobs" ADD COLUMN IF NOT EXISTS "ReportTo" VARCHAR(200);
ALTER TABLE "tblClientJobs" ADD COLUMN IF NOT EXISTS "TeamSize" INTEGER;
ALTER TABLE "tblClientJobs" ADD COLUMN IF NOT EXISTS "Department" VARCHAR(200);
ALTER TABLE "tblClientJobs" ADD COLUMN IF NOT EXISTS "SubDepartment" VARCHAR(200);
ALTER TABLE "tblClientJobs" ADD COLUMN IF NOT EXISTS "InterviewProcess" TEXT;

-- Ensure employment-type labels used by the employer UI exist (idempotent).
INSERT INTO "tblMstrEmpType" ("Descr")
SELECT v.d
FROM (VALUES ('Internship'), ('Contract')) AS v(d)
WHERE NOT EXISTS (
  SELECT 1 FROM "tblMstrEmpType" e WHERE lower(trim(e."Descr")) = lower(trim(v.d))
);

-- Ensure work-mode labels used by the employer UI exist (idempotent).
INSERT INTO "tblMstrWorkMode" ("Descr")
SELECT v.d
FROM (VALUES ('In-office'), ('Hybrid'), ('Remote')) AS v(d)
WHERE NOT EXISTS (
  SELECT 1 FROM "tblMstrWorkMode" w WHERE lower(trim(w."Descr")) = lower(trim(v.d))
);
