-- Figma Flow gap models: employer registration, multi-round interviews,
-- CV referral pipeline, candidate scoring, and offer letters.
-- Also seeds the Q3 role and new job-mapping statuses.

-- 1. Employer Registration (pending signups awaiting admin approval)
CREATE TABLE "tblEmployerRegistration" (
    "EmployerRegistrationID" BIGSERIAL PRIMARY KEY,
    "CompanyName" VARCHAR(200) NOT NULL,
    "CompanyLogo" VARCHAR(500),
    "Location" VARCHAR(500),
    "ContactNumberCompany" VARCHAR(20),
    "ContactNumberHR" VARCHAR(20),
    "EmailCompany" VARCHAR(100) NOT NULL,
    "EmailHR" VARCHAR(100),
    "AboutCompany" VARCHAR(5000),
    "IndustryType" VARCHAR(100),
    "Website" VARCHAR(200),
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "AdminNotes" VARCHAR(2000),
    "ReviewedAt" TIMESTAMP(6),
    "ReviewedBy" BIGINT,
    "CreatedAt" TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX "tblEmployerRegistration_Status_idx" ON "tblEmployerRegistration"("Status");

-- 2. Interview Round (per-application, multi-round)
CREATE TABLE "tblInterviewRound" (
    "InterviewRoundID" BIGSERIAL PRIMARY KEY,
    "JobSubscriberMapID" BIGINT NOT NULL,
    "RoundNumber" SMALLINT NOT NULL,
    "RoundName" VARCHAR(100),
    "InterviewerName" VARCHAR(200),
    "InterviewerEmail" VARCHAR(200),
    "HRName" VARCHAR(200),
    "HREmail" VARCHAR(200),
    "InterviewModeID" INT,
    "MeetingLink" VARCHAR(500),
    "ScheduledAt" TIMESTAMP(6),
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "Result" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "CompanyFeedback" VARCHAR(5000),
    "CreatedAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "UpdatedAt" TIMESTAMP(6),
    CONSTRAINT "tblInterviewRound_JobSubscriberMapID_fkey"
        FOREIGN KEY ("JobSubscriberMapID") REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID") ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT "tblInterviewRound_InterviewModeID_fkey"
        FOREIGN KEY ("InterviewModeID") REFERENCES "tblMstrInterviewMode"("InterviewModeID") ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE INDEX "tblInterviewRound_JobSubscriberMapID_idx" ON "tblInterviewRound"("JobSubscriberMapID");

-- 3. Interview Slot (3-4 time slots per round)
CREATE TABLE "tblInterviewSlot" (
    "InterviewSlotID" BIGSERIAL PRIMARY KEY,
    "InterviewRoundID" BIGINT NOT NULL,
    "SlotDateTime" TIMESTAMP(6) NOT NULL,
    "IsSelected" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "tblInterviewSlot_InterviewRoundID_fkey"
        FOREIGN KEY ("InterviewRoundID") REFERENCES "tblInterviewRound"("InterviewRoundID") ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX "tblInterviewSlot_InterviewRoundID_idx" ON "tblInterviewSlot"("InterviewRoundID");

-- 4. CV Referral (Q2 → Q3 → Company pipeline with 14-day expiry)
CREATE TABLE "tblCvReferral" (
    "CvReferralID" BIGSERIAL PRIMARY KEY,
    "JobSubscriberMapID" BIGINT NOT NULL,
    "ReferredByQ2At" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "ReferredByUserID" BIGINT,
    "ValidatedByQ3At" TIMESTAMP(6),
    "ValidatedByUserID" BIGINT,
    "SentToCompanyAt" TIMESTAMP(6),
    "ExpiresAt" TIMESTAMP(6),
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Referred',
    "CompanyReviewStatus" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    CONSTRAINT "tblCvReferral_JobSubscriberMapID_fkey"
        FOREIGN KEY ("JobSubscriberMapID") REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID") ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX "tblCvReferral_JobSubscriberMapID_idx" ON "tblCvReferral"("JobSubscriberMapID");
CREATE INDEX "tblCvReferral_Status_idx" ON "tblCvReferral"("Status");
CREATE INDEX "tblCvReferral_ExpiresAt_idx" ON "tblCvReferral"("ExpiresAt");

-- 5. Candidate Job Score (weighted match scoring for Q1)
CREATE TABLE "tblCandidateJobScore" (
    "CandidateJobScoreID" BIGSERIAL PRIMARY KEY,
    "JobSubscriberMapID" BIGINT NOT NULL,
    "SkillScore" SMALLINT NOT NULL DEFAULT 0,
    "ExperienceScore" SMALLINT NOT NULL DEFAULT 0,
    "JobRoleScore" SMALLINT NOT NULL DEFAULT 0,
    "EducationScore" SMALLINT NOT NULL DEFAULT 0,
    "LocationScore" SMALLINT NOT NULL DEFAULT 0,
    "SalaryScore" SMALLINT NOT NULL DEFAULT 0,
    "NoticePeriodScore" SMALLINT NOT NULL DEFAULT 0,
    "TotalScore" SMALLINT NOT NULL DEFAULT 0,
    "ScoredAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "ScoredBy" BIGINT,
    CONSTRAINT "tblCandidateJobScore_JobSubscriberMapID_fkey"
        FOREIGN KEY ("JobSubscriberMapID") REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID") ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "tblCandidateJobScore_JobSubscriberMapID_key" ON "tblCandidateJobScore"("JobSubscriberMapID");

-- 6. Offer Letter
CREATE TABLE "tblOfferLetter" (
    "OfferLetterID" BIGSERIAL PRIMARY KEY,
    "JobSubscriberMapID" BIGINT NOT NULL,
    "OfferDetails" TEXT,
    "GeneratedAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "SentAt" TIMESTAMP(6),
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Draft',
    "CandidateResponseAt" TIMESTAMP(6),
    "JoiningDate" DATE,
    CONSTRAINT "tblOfferLetter_JobSubscriberMapID_fkey"
        FOREIGN KEY ("JobSubscriberMapID") REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID") ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "tblOfferLetter_JobSubscriberMapID_key" ON "tblOfferLetter"("JobSubscriberMapID");

-- 7. Seed Q3 role
INSERT INTO "tblSecRoles" ("RoleId", "RoleName", "TimestampIns")
VALUES (7, 'Q3', now())
ON CONFLICT ("RoleId") DO NOTHING;

-- 8. Seed new job mapping statuses
INSERT INTO "tblMstrJobMappingStatus" ("JobMapStatusID", "Descr") VALUES
    (10, 'On Hold'),
    (11, 'Need More Info'),
    (12, 'Duplicate'),
    (13, 'Withdrawn'),
    (14, 'Referred to Q3'),
    (15, 'Sent to Company'),
    (16, 'Interview R1'),
    (17, 'Interview R2'),
    (18, 'Interview R3'),
    (19, 'Final Round'),
    (20, 'Offer Sent'),
    (21, 'Offer Accepted'),
    (22, 'Joined'),
    (23, 'CV Expired')
ON CONFLICT ("JobMapStatusID") DO NOTHING;
