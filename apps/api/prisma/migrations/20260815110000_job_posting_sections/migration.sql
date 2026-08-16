-- Job posting: responsibilities and preferred qualifications.
--
-- The job page presents four headed sections — About the role, Key responsibilities,
-- Requirements, Preferred qualifications — but the row only had two free-text columns
-- (JobDescr, JobCandidateProfile). Employers were folding all four into those two, so the
-- page could only ever render half the structure the design asks for.
ALTER TABLE "tblClientJobs"
  ADD COLUMN "KeyResponsibilities"     TEXT,
  ADD COLUMN "PreferredQualifications" TEXT;
