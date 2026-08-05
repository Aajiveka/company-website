-- Profile sections the legacy CV had no room for.
--
-- The candidate profile could only ever show what tblSubscriberCVDetails holds: a name, one
-- primary skill, one function, and a flat list of tag chips. A candidate had no way to say
-- what they are looking for next, what they have built, which tools they know at what depth,
-- or anything about themselves beyond gender and date of birth — all of that lived only
-- inside the uploaded resume PDF, invisible to search and impossible to edit.
--
-- Everything single-valued goes in one 1:1 side table rather than as new columns on
-- tblSubscriberCVDetails, so a migrated legacy row is untouched until the candidate fills a
-- section in. Repeating sections get their own tables.

-- ── Education: what and where, not just which course ─────────────────────────
-- The year shown on a degree came from TimestampIns, i.e. when the row was typed in, which
-- is not when the candidate graduated. There was nowhere at all to record the institute.
ALTER TABLE "tblSubscriberEducation"
  ADD COLUMN "InstituteName" VARCHAR(500),
  ADD COLUMN "PassingYear"   INTEGER,
  ADD COLUMN "CourseMode"    VARCHAR(50),
  ADD COLUMN "Marks"         VARCHAR(100);

-- ── Certificates: link + validity ────────────────────────────────────────────
-- flgNeverExpires is not the same as "no expiry recorded", so it cannot be inferred from a
-- NULL ValidTill*.
ALTER TABLE "tblSubscriberCertificate"
  ADD COLUMN "CertificateUrl"  VARCHAR(2000),
  ADD COLUMN "CertificationID" VARCHAR(200),
  ADD COLUMN "ValidFromMonth"  SMALLINT,
  ADD COLUMN "ValidFromYear"   INTEGER,
  ADD COLUMN "ValidTillMonth"  SMALLINT,
  ADD COLUMN "ValidTillYear"   INTEGER,
  ADD COLUMN "flgNeverExpires" BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Languages: the name has to live on the row ───────────────────────────────
-- LanguageID references a master table that does not exist anywhere in this schema — there
-- is no tblMstrLanguage — so the column is unusable on its own. It stays, nullable, so
-- migrated rows are not rewritten.
ALTER TABLE "tblSubscriberLanguage"
  ADD COLUMN "LanguageName" VARCHAR(100);

CREATE INDEX "tblSubscriberLanguage_SubscriberID_idx" ON "tblSubscriberLanguage" ("SubscriberID");

-- ── Single-valued sections: headline, summary, career profile, personal, D&I ──
CREATE TABLE "tblSubscriberProfileExtra" (
  "SubscriberID"          BIGINT       NOT NULL,
  "ResumeHeadline"        VARCHAR(500),
  "ProfileSummary"        VARCHAR(4000),
  "Department"            VARCHAR(200),
  "RoleCategory"          VARCHAR(200),
  "JobRole"               VARCHAR(200),
  "DesiredJobType"        VARCHAR(100),
  "DesiredEmploymentType" VARCHAR(100),
  "PreferredShift"        VARCHAR(50),
  "PreferredSalary"       DECIMAL(18,0),
  "PreferredJobRoles"     VARCHAR(1000),
  "MaritalStatus"         VARCHAR(50),
  "PersonalTraits"        VARCHAR(500),
  "Category"              VARCHAR(50),
  "WorkPermitCountries"   VARCHAR(500),
  "USWorkPermit"          VARCHAR(100),
  "DisabilityStatus"      VARCHAR(100),
  "DisabilityType"        VARCHAR(200),
  "DisabilityPercent"     SMALLINT,
  "AssistanceRequired"    VARCHAR(500),
  "MilitaryStatus"        VARCHAR(100),
  "MilitaryServiceType"   VARCHAR(200),
  "MilitaryRank"          VARCHAR(200),
  "MilitaryEnrolmentDate" DATE,
  "CareerBreakStatus"     VARCHAR(100),
  "CareerBreakReason"     VARCHAR(200),
  "CareerBreakFrom"       DATE,
  "CareerBreakTo"         DATE,
  "TimestampIns"          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "TimestampUpd"          TIMESTAMP(6),
  "LoginIDIns"            BIGINT       NOT NULL,
  "loginIDUpd"            BIGINT,

  CONSTRAINT "tblSubscriberProfileExtra_pkey" PRIMARY KEY ("SubscriberID")
);

-- ── IT skills ────────────────────────────────────────────────────────────────
-- Distinct from tblSubscriberTags (flat keyword chips) and CVDetails.SkillID (the single
-- primary skill used for job matching): this is depth per tool.
CREATE TABLE "tblSubscriberITSkill" (
  "SubscriberITSkillID" BIGSERIAL    NOT NULL,
  "SubscriberID"        BIGINT       NOT NULL,
  "SkillName"           VARCHAR(200) NOT NULL,
  "Version"             VARCHAR(50),
  "LastUsedYear"        INTEGER,
  "ExpYears"            SMALLINT,
  "ExpMonths"           SMALLINT,
  "TimestampIns"        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "TimestampUpd"        TIMESTAMP(6),
  "LoginIDIns"          BIGINT       NOT NULL,
  "loginIDUpd"          BIGINT,

  CONSTRAINT "tblSubscriberITSkill_pkey" PRIMARY KEY ("SubscriberITSkillID")
);

CREATE INDEX "tblSubscriberITSkill_SubscriberID_idx" ON "tblSubscriberITSkill" ("SubscriberID");

-- ── Projects ─────────────────────────────────────────────────────────────────
-- Not folded into tblSubscriberEmployer: a project can be personal, span two employers, or
-- still be running after the job it started under ended. Month/year pairs rather than dates
-- because that is all the form collects — a synthesised day would read as false precision.
CREATE TABLE "tblSubscriberProject" (
  "SubscriberProjectID" BIGSERIAL    NOT NULL,
  "SubscriberID"        BIGINT       NOT NULL,
  "Title"               VARCHAR(500) NOT NULL,
  "ClientName"          VARCHAR(500),
  "ProjectStatus"       VARCHAR(50),
  "WorkedFromMonth"     SMALLINT,
  "WorkedFromYear"      INTEGER,
  "WorkedTillMonth"     SMALLINT,
  "WorkedTillYear"      INTEGER,
  "ProjectSite"         VARCHAR(50),
  "NatureOfEmployment"  VARCHAR(100),
  "TeamSize"            INTEGER,
  "RoleDescr"           VARCHAR(500),
  "SkillsUsed"          VARCHAR(1000),
  "Details"             VARCHAR(4000),
  "TimestampIns"        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "TimestampUpd"        TIMESTAMP(6),
  "LoginIDIns"          BIGINT       NOT NULL,
  "loginIDUpd"          BIGINT,

  CONSTRAINT "tblSubscriberProject_pkey" PRIMARY KEY ("SubscriberProjectID")
);

CREATE INDEX "tblSubscriberProject_SubscriberID_idx" ON "tblSubscriberProject" ("SubscriberID");

-- ── Accomplishments ──────────────────────────────────────────────────────────
-- One table with a Kind discriminator instead of five near-identical ones: every kind is
-- (title, link, description, date) and they are always read together as one block.
-- Certifications keep their own table, which already existed.
CREATE TABLE "tblSubscriberAccomplishment" (
  "SubscriberAccomplishmentID" BIGSERIAL    NOT NULL,
  "SubscriberID"               BIGINT       NOT NULL,
  "Kind"                       VARCHAR(30)  NOT NULL,
  "Title"                      VARCHAR(500) NOT NULL,
  "Url"                        VARCHAR(2000),
  "Descr"                      VARCHAR(4000),
  "EventMonth"                 SMALLINT,
  "EventYear"                  INTEGER,
  "PatentStatus"               VARCHAR(50),
  "PatentOffice"               VARCHAR(200),
  "TimestampIns"               TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "TimestampUpd"               TIMESTAMP(6),
  "LoginIDIns"                 BIGINT       NOT NULL,
  "loginIDUpd"                 BIGINT,

  CONSTRAINT "tblSubscriberAccomplishment_pkey" PRIMARY KEY ("SubscriberAccomplishmentID")
);

CREATE INDEX "tblSubscriberAccomplishment_SubscriberID_Kind_idx"
  ON "tblSubscriberAccomplishment" ("SubscriberID", "Kind");

-- ── Foreign keys ─────────────────────────────────────────────────────────────
ALTER TABLE "tblSubscriberProfileExtra"
  ADD CONSTRAINT "tblSubscriberProfileExtra_SubscriberID_fkey"
  FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tblSubscriberITSkill"
  ADD CONSTRAINT "tblSubscriberITSkill_SubscriberID_fkey"
  FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tblSubscriberProject"
  ADD CONSTRAINT "tblSubscriberProject_SubscriberID_fkey"
  FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tblSubscriberAccomplishment"
  ADD CONSTRAINT "tblSubscriberAccomplishment_SubscriberID_fkey"
  FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
  ON DELETE RESTRICT ON UPDATE CASCADE;
