-- The application form submitted for one job.
--
-- Candidate self-apply previously wrote only tblJobSubscriberMapping — the fact that someone
-- applied, and nothing about what they sent. The redesigned apply flow collects a form
-- (contact details, expected salary, notice period, links, cover letter), and a recruiter has
-- to be able to read back exactly what was submitted.
--
-- Deliberately a snapshot, not a view over the live CV: the candidate may edit their profile
-- the day after applying, and that must not silently rewrite what the recruiter received.
CREATE TABLE "tblJobApplicationDetail" (
  "JobSubscriberMapID" BIGINT       PRIMARY KEY,
  "FullName"           VARCHAR(200) NOT NULL,
  "Email"              VARCHAR(320) NOT NULL,
  "Phone"              VARCHAR(20)  NOT NULL,
  "TotalExperience"    VARCHAR(50),
  "CurrentLocation"    VARCHAR(200),
  -- Free text: candidates write "20 LPA", "2000000" and "negotiable" in equal measure.
  "ExpectedSalary"     VARCHAR(100),
  "NoticePeriod"       VARCHAR(50),
  "LinkedInUrl"        VARCHAR(2000),
  "PortfolioUrl"       VARCHAR(2000),
  "ResumeFileName"     VARCHAR(400),
  "CoverLetter"        TEXT,
  "SubmittedAt"        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tblJobApplicationDetail_JobSubscriberMapID_fkey"
    FOREIGN KEY ("JobSubscriberMapID")
    REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID")
    -- Deleting the application takes its submitted form with it; the form has no meaning
    -- without the application. Declared on the relation too, so the two cannot drift.
    ON DELETE CASCADE ON UPDATE CASCADE
);
