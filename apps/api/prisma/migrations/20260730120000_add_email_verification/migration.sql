-- Email verification for candidate registration.
--
-- Existing rows come from the legacy import, which had no verification step at all. They
-- default to false rather than being retroactively trusted: an address nobody ever proved
-- must not be treated as proved.

-- AlterTable
ALTER TABLE "tblSubscriberCVDetails"
  ADD COLUMN "EmailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "EmailVerifiedAt" TIMESTAMP(6);

-- CreateIndex
-- Registration looks up EmailID on every signup to reject an address that already has a
-- verified account.
CREATE INDEX "tblSubscriberCVDetails_EmailID_idx" ON "tblSubscriberCVDetails"("EmailID");
