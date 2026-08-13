-- Referrals and candidate privacy settings.
--
-- The candidate portal shipped a "Refer a Friend" screen and an Account Settings privacy tab
-- whose endpoints were never implemented, so the UI called /candidates/me/referrals and got a
-- 404. These are the two tables those screens need.

-- ── Referrals ────────────────────────────────────────────────────────────────
-- Kept as its own table rather than a flag on the invitee: most invitees never register, and
-- the reward has to be tracked whether or not they do.
CREATE TABLE "tblCandidateReferral" (
  "ReferralID"   SERIAL       PRIMARY KEY,
  "SubscriberID" BIGINT       NOT NULL,
  "Name"         VARCHAR(200) NOT NULL,
  "Email"        VARCHAR(320),
  "Mobile"       VARCHAR(15),
  "Status"       VARCHAR(30)  NOT NULL DEFAULT 'Invited',
  -- Money in paise so rewards never touch a float.
  "RewardPaise"  INTEGER      NOT NULL DEFAULT 0,
  "RewardPaid"   BOOLEAN      NOT NULL DEFAULT FALSE,
  "InvitedAt"    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tblCandidateReferral_SubscriberID_fkey"
    FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
);

CREATE INDEX "tblCandidateReferral_SubscriberID_idx" ON "tblCandidateReferral"("SubscriberID");

-- ── Privacy / account lifecycle ──────────────────────────────────────────────
-- 1:1 with the candidate, created on first write. An account that never opened the privacy
-- tab has no row at all and reads fall back to the defaults declared here.
CREATE TABLE "tblCandidatePrivacy" (
  "SubscriberID"           BIGINT       PRIMARY KEY,
  "ShowCurrentEmployer"    BOOLEAN      NOT NULL DEFAULT TRUE,
  "AllowRecruiterMessages" BOOLEAN      NOT NULL DEFAULT TRUE,
  "ExportRequestedAt"      TIMESTAMP(6),
  -- Deletion is a request, not an immediate DROP: it stays auditable and reversible inside
  -- the grace period, and the candidate's applications remain attached to the employer's ATS.
  "DeletionRequestedAt"    TIMESTAMP(6),
  "UpdatedAt"              TIMESTAMP(6),
  CONSTRAINT "tblCandidatePrivacy_SubscriberID_fkey"
    FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
);
