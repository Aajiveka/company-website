-- Records that a candidate finished the onboarding wizard.
--
-- ProtectedRoute sends any candidate with a falsy isOnboarded to /candidate/onboarding, but
-- nothing ever persisted that flag: the API had no such field, so /auth/me always omitted it
-- and every candidate was redirected back into the wizard on every page load. The frontend's
-- one attempt to clear it (PATCH /candidates/me/profile) hit a route that does not exist.
--
-- Existing rows are treated as already onboarded. They predate the wizard entirely, and
-- forcing established candidates through it — or worse, trapping them in it — would be a
-- regression for every migrated account.
ALTER TABLE "tblSubscriberCVDetails"
  ADD COLUMN "OnboardedAt" TIMESTAMP(6);

UPDATE "tblSubscriberCVDetails" SET "OnboardedAt" = CURRENT_TIMESTAMP WHERE "OnboardedAt" IS NULL;
