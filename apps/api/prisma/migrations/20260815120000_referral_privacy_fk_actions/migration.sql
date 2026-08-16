-- Bring the referral / privacy foreign keys in line with the datamodel.
--
-- 20260811120000_add_referrals_and_privacy declared both constraints without referential
-- actions, so Postgres gave them NO ACTION / NO ACTION. A required Prisma relation with no
-- explicit onDelete/onUpdate means RESTRICT / CASCADE, so `migrate dev` reported drift on
-- every run and an update to tblSubscriberRegistration."SubscriberID" would have errored
-- instead of following the parent row.
--
-- Corrected here rather than by editing that migration: it has already been applied, and
-- rewriting an applied migration changes its checksum — `prisma migrate deploy` (which the
-- container entrypoint runs on every start) refuses to proceed against a history that no
-- longer matches, and databases that already ran it would never pick the change up anyway.

ALTER TABLE "tblCandidateReferral"
  DROP CONSTRAINT "tblCandidateReferral_SubscriberID_fkey";

ALTER TABLE "tblCandidateReferral"
  ADD CONSTRAINT "tblCandidateReferral_SubscriberID_fkey"
  FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tblCandidatePrivacy"
  DROP CONSTRAINT "tblCandidatePrivacy_SubscriberID_fkey";

ALTER TABLE "tblCandidatePrivacy"
  ADD CONSTRAINT "tblCandidatePrivacy_SubscriberID_fkey"
  FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
  ON DELETE RESTRICT ON UPDATE CASCADE;
