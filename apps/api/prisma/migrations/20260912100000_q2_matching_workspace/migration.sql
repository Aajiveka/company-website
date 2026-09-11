-- Q2 job-matching workspace (Figma "Q2" page).
--
-- Additive only. Q2's decision space is a string here, deliberately NOT an id in
-- tblMstrJobMappingStatus, for the same reason tblSubscriberScreening.Status is: ids 10 and 11
-- of that master mean different things in a fresh dev database than in a restored production
-- one. Forwarding still writes JobMapStatus.REFERRED_TO_Q3 and a tblCvReferral row through the
-- existing CvReferralService, so Q3's screens are unaffected.

CREATE TABLE "tblApplicationMatchReview" (
    "JobSubscriberMapID" BIGINT       NOT NULL,
    "Status"             VARCHAR(20)  NOT NULL DEFAULT 'New',

    -- "Tick the criteria to include in the match" on the Candidate Scoring panel. All seven
    -- default to false, which the API reads as "no subset chosen" and scores on all seven —
    -- so an untouched application shows the full weighted total, as the designs do.
    "IncSkill"           BOOLEAN      NOT NULL DEFAULT false,
    "IncExperience"      BOOLEAN      NOT NULL DEFAULT false,
    "IncJobRole"         BOOLEAN      NOT NULL DEFAULT false,
    "IncEducation"       BOOLEAN      NOT NULL DEFAULT false,
    "IncLocation"        BOOLEAN      NOT NULL DEFAULT false,
    "IncSalary"          BOOLEAN      NOT NULL DEFAULT false,
    "IncNoticePeriod"    BOOLEAN      NOT NULL DEFAULT false,

    "DecisionNote"       VARCHAR(500),
    "FirstViewedAt"      TIMESTAMP(6),
    "DecidedAt"          TIMESTAMP(6),
    "DecidedBy"          BIGINT,
    "TimestampIns"       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "TimestampUpd"       TIMESTAMP(6),
    "LoginIDUpd"         BIGINT,

    CONSTRAINT "tblApplicationMatchReview_pkey" PRIMARY KEY ("JobSubscriberMapID")
);

CREATE INDEX "tblApplicationMatchReview_Status_idx"
    ON "tblApplicationMatchReview"("Status");
CREATE INDEX "tblApplicationMatchReview_DecidedAt_idx"
    ON "tblApplicationMatchReview"("DecidedAt");

ALTER TABLE "tblApplicationMatchReview"
    ADD CONSTRAINT "tblApplicationMatchReview_JobSubscriberMapID_fkey"
    FOREIGN KEY ("JobSubscriberMapID")
    REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- The Employer Jobs and All Applicants tables both sort on the match score and both join
-- every application of a job. tblCandidateJobScore had no index on TotalScore.
CREATE INDEX IF NOT EXISTS "tblCandidateJobScore_TotalScore_idx"
    ON "tblCandidateJobScore"("TotalScore");
