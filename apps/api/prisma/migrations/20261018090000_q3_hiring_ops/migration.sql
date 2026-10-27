-- Q3 hiring-ops workspace (Figma "Q3" page).
--
-- Additive only. Every table Q3 works on already existed — tblCvReferral, tblInterviewRound,
-- tblInterviewSlot, tblOfferLetter and the candidate document tables — and every column below
-- is nullable or defaulted, so existing rows and the code that writes them are unaffected.

-- 1. CV referrals: why a CV went back to Q2, and what Q2 has done about it since.
--
-- The designs' "Returned to Q2" screen reports a reason per CV, when the status mail went to
-- Q2, and whether Q2 has acknowledged or re-referred it. None of that was recorded: a referral
-- could only be Expired, and nothing could set Returned at all.
ALTER TABLE "tblCvReferral"
    ADD COLUMN "ReturnedAt"           TIMESTAMP(6),
    ADD COLUMN "ReturnedBy"           BIGINT,
    -- CV missing | Incomplete profile | Role mismatch | Duplicate referral | Auto-expired
    ADD COLUMN "ReturnReason"         VARCHAR(50),
    ADD COLUMN "ReturnNote"           VARCHAR(1000),
    ADD COLUMN "Q2MailSentAt"         TIMESTAMP(6),
    ADD COLUMN "Q2AcknowledgedAt"     TIMESTAMP(6),
    ADD COLUMN "ReReferredAt"         TIMESTAMP(6),
    -- When the company shortlisted the CV. Stops the 14-day clock: the designs' flow is
    -- "not shortlisted: auto-expire · shortlisted: company submits slots".
    ADD COLUMN "CompanyShortlistedAt" TIMESTAMP(6);

CREATE INDEX "tblCvReferral_ReturnedAt_idx" ON "tblCvReferral"("ReturnedAt");

-- 2. Interview rounds: what the shortlist captured, and the round's day-of progress.
ALTER TABLE "tblInterviewRound"
    -- [{ "name", "title", "email" }]. The designs list several interviewers per round; the
    -- existing InterviewerName/InterviewerEmail pair holds one and is kept in step with the
    -- first entry so older readers still see someone.
    ADD COLUMN "Interviewers"          TEXT,
    ADD COLUMN "HRTitle"               VARCHAR(200),
    ADD COLUMN "DurationMins"          SMALLINT     NOT NULL DEFAULT 45,
    ADD COLUMN "IsFinal"               BOOLEAN      NOT NULL DEFAULT false,
    ADD COLUMN "SlotsSharedAt"         TIMESTAMP(6),
    ADD COLUMN "SlotsRequestedAt"      TIMESTAMP(6),
    ADD COLUMN "InvitesSentAt"         TIMESTAMP(6),
    ADD COLUMN "ReminderSentAt"        TIMESTAMP(6),
    ADD COLUMN "CandidateConfirmedAt"  TIMESTAMP(6),
    ADD COLUMN "CandidateJoinedAt"     TIMESTAMP(6),
    ADD COLUMN "ConductedAt"           TIMESTAMP(6),
    ADD COLUMN "ResultDueAt"           TIMESTAMP(6),
    -- NextRound | FinalRound | Hold | Rejected | Selected — the company's decision as Q3
    -- recorded it. Result keeps its Passed | Failed | Hold meaning for existing readers.
    ADD COLUMN "Decision"              VARCHAR(20),
    ADD COLUMN "DecidedAt"             TIMESTAMP(6),
    ADD COLUMN "DecisionMailSentAt"    TIMESTAMP(6);

CREATE INDEX "tblInterviewRound_ScheduledAt_idx" ON "tblInterviewRound"("ScheduledAt");
CREATE INDEX "tblInterviewRound_Status_idx" ON "tblInterviewRound"("Status");

-- "Candidate unavailable" on a company slot.
ALTER TABLE "tblInterviewSlot"
    ADD COLUMN "IsUnavailable" BOOLEAN NOT NULL DEFAULT false;

-- 3. Uploaded documents: the file line under each document ("aadhaar_ishita.pdf · 1.2 MB").
-- The storage key is deliberately not the client's filename, so the name was lost.
ALTER TABLE "tblCandidateDocumentUploaded"
    ADD COLUMN "FileName"  VARCHAR(255),
    ADD COLUMN "SizeBytes" INTEGER;

-- 4. Q3's per-application state that has no home elsewhere: the document hand-off to the
-- company and joining.
CREATE TABLE "tblApplicationHiring" (
    "JobSubscriberMapID" BIGINT       NOT NULL,
    "SelectedAt"         TIMESTAMP(6),
    "DocsRequestedAt"    TIMESTAMP(6),
    "DocsDueAt"          DATE,
    "DocsForwardedAt"    TIMESTAMP(6),
    "DocsApprovedAt"     TIMESTAMP(6),
    "JoinedAt"           TIMESTAMP(6),
    "OnHoldAt"           TIMESTAMP(6),
    "TimestampIns"       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "TimestampUpd"       TIMESTAMP(6),

    CONSTRAINT "tblApplicationHiring_pkey" PRIMARY KEY ("JobSubscriberMapID")
);

ALTER TABLE "tblApplicationHiring"
    ADD CONSTRAINT "tblApplicationHiring_JobSubscriberMapID_fkey"
    FOREIGN KEY ("JobSubscriberMapID")
    REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Everything Q3 does to an application: calls, mails, nudges, reminders, slot requests.
-- Append-only, like tblScreeningContactLog — the row is the record of what was said and how.
CREATE TABLE "tblQ3Activity" (
    "Q3ActivityID"       BIGSERIAL    NOT NULL,
    "JobSubscriberMapID" BIGINT       NOT NULL,
    "InterviewRoundID"   BIGINT,
    -- Contact | Nudge | Reminder | SlotRequest | DecisionMail | DocRequest | DocVerified |
    -- DocSentBack | DocsForwarded | Q2Mail
    "Kind"               VARCHAR(30)  NOT NULL,
    -- Call | Mail | WhatsApp
    "Channel"            VARCHAR(20),
    "Note"               VARCHAR(2000),
    "CreatedAt"          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy"          BIGINT,

    CONSTRAINT "tblQ3Activity_pkey" PRIMARY KEY ("Q3ActivityID")
);

CREATE INDEX "tblQ3Activity_JobSubscriberMapID_idx" ON "tblQ3Activity"("JobSubscriberMapID");
CREATE INDEX "tblQ3Activity_CreatedAt_idx" ON "tblQ3Activity"("CreatedAt");

ALTER TABLE "tblQ3Activity"
    ADD CONSTRAINT "tblQ3Activity_JobSubscriberMapID_fkey"
    FOREIGN KEY ("JobSubscriberMapID")
    REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Masters the designs need.
--
-- The Documents & Offer screen asks for marksheets, a degree certificate, an internship
-- certificate, a passport-size photo and bank details; tblMstrDocuments had none of them.
-- tblMstrDocumentType gets the same ids and names, because recruitment.service joins uploads
-- to it by the ids stored from tblMstrDocuments (see the note on documentReviews()).
INSERT INTO "tblMstrDocuments" ("DocumentID", "DocumentName", "FolderName", "flgCandidateUpload", "RootFolder") VALUES
    (7,  '10th & 12th marksheets',        'marksheets',  1, 'files'),
    (8,  'Degree certificate',            'degree',      1, 'files'),
    (9,  'Internship certificate',        'internship',  1, 'files'),
    (10, 'Passport-size photo',           'photo',       1, 'files'),
    (11, 'Bank details (cancelled cheque)', 'bankdetails', 1, 'files')
ON CONFLICT ("DocumentID") DO NOTHING;

INSERT INTO "tblMstrDocumentType" ("DocumentTypeID", "DocumentType") VALUES
    (7,  '10th & 12th marksheets'),
    (8,  'Degree certificate'),
    (9,  'Internship certificate'),
    (10, 'Passport-size photo'),
    (11, 'Bank details (cancelled cheque)')
ON CONFLICT ("DocumentTypeID") DO NOTHING;

-- Interview modes: the designs offer Virtual, Telephonic, Face-to-Face and Walk-in. The first
-- three are Video (3), Telephonic (2) and In-person (1); Walk-in is new.
INSERT INTO "tblMstrInterviewMode" ("InterviewModeID", "Descr") VALUES (4, 'Walk-in')
ON CONFLICT ("InterviewModeID") DO NOTHING;

-- Explicit ids above do not advance the SERIAL sequences.
SELECT setval(pg_get_serial_sequence('"tblMstrDocuments"', 'DocumentID'),
              GREATEST((SELECT MAX("DocumentID") FROM "tblMstrDocuments"), 1));
SELECT setval(pg_get_serial_sequence('"tblMstrDocumentType"', 'DocumentTypeID'),
              GREATEST((SELECT MAX("DocumentTypeID") FROM "tblMstrDocumentType"), 1));
SELECT setval(pg_get_serial_sequence('"tblMstrInterviewMode"', 'InterviewModeID'),
              GREATEST((SELECT MAX("InterviewModeID") FROM "tblMstrInterviewMode"), 1));
