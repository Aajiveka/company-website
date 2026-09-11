-- Q1 screening workspace (Figma "Q1 Flow").
--
-- Additive only. Nothing here touches tblSubscriberRegistration.flgstatus, the
-- candidate-decision space, or tblMstrJobMappingStatus — the existing QC screens keep
-- behaving exactly as they do today.

-- 1. Per-candidate screening state
CREATE TABLE "tblSubscriberScreening" (
    "SubscriberID"           BIGINT       NOT NULL,
    "Status"                 VARCHAR(20)  NOT NULL DEFAULT 'New',
    "Priority"               VARCHAR(10)  NOT NULL DEFAULT 'Medium',
    "ChkNameVerified"        BOOLEAN      NOT NULL DEFAULT false,
    "ChkCvAvailable"         BOOLEAN      NOT NULL DEFAULT false,
    "ChkDesignationVerified" BOOLEAN      NOT NULL DEFAULT false,
    "ChkExperienceChecked"   BOOLEAN      NOT NULL DEFAULT false,
    "ChkEducationChecked"    BOOLEAN      NOT NULL DEFAULT false,
    "ChkSkillsReviewed"      BOOLEAN      NOT NULL DEFAULT false,
    "ChkLocationVerified"    BOOLEAN      NOT NULL DEFAULT false,
    "RelevantExpMonths"      SMALLINT,
    "FollowUpDate"           DATE,
    "FollowUpTime"           VARCHAR(30),
    "ContactAttempts"        SMALLINT     NOT NULL DEFAULT 0,
    "NextAttemptAt"          DATE,
    "NotInterestedReason"    VARCHAR(200),
    "FirstReviewedAt"        TIMESTAMP(6),
    "VerifiedAt"             TIMESTAMP(6),
    "VerifiedBy"             BIGINT,
    "TimestampIns"           TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "TimestampUpd"           TIMESTAMP(6),
    "LoginIDUpd"             BIGINT,

    CONSTRAINT "tblSubscriberScreening_pkey" PRIMARY KEY ("SubscriberID")
);

CREATE INDEX "tblSubscriberScreening_Status_idx"       ON "tblSubscriberScreening"("Status");
CREATE INDEX "tblSubscriberScreening_Priority_idx"     ON "tblSubscriberScreening"("Priority");
CREATE INDEX "tblSubscriberScreening_FollowUpDate_idx" ON "tblSubscriberScreening"("FollowUpDate");

ALTER TABLE "tblSubscriberScreening"
    ADD CONSTRAINT "tblSubscriberScreening_SubscriberID_fkey"
    FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Append-only contact log
CREATE TABLE "tblScreeningContactLog" (
    "ScreeningContactLogID" BIGSERIAL    NOT NULL,
    "SubscriberID"          BIGINT       NOT NULL,
    "Kind"                  VARCHAR(30)  NOT NULL DEFAULT 'Contact',
    "Channel"               VARCHAR(20)  NOT NULL,
    "Reason"                VARCHAR(500),
    "MissingItems"          VARCHAR(1000),
    "InternalNote"          VARCHAR(2000),
    "ContactedAt"           TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ContactedBy"           BIGINT,

    CONSTRAINT "tblScreeningContactLog_pkey" PRIMARY KEY ("ScreeningContactLogID")
);

CREATE INDEX "tblScreeningContactLog_SubscriberID_idx" ON "tblScreeningContactLog"("SubscriberID");
CREATE INDEX "tblScreeningContactLog_ContactedAt_idx"  ON "tblScreeningContactLog"("ContactedAt");

ALTER TABLE "tblScreeningContactLog"
    ADD CONSTRAINT "tblScreeningContactLog_SubscriberID_fkey"
    FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
    ON DELETE RESTRICT ON UPDATE CASCADE;
