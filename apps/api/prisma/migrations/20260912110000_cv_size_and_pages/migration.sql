-- The resume card's "2 pages · 240 KB" line (Figma "Q2", applicant detail).
--
-- tblSubscriberCVUploaded recorded the candidate's filename and when they uploaded it, but
-- neither the byte size nor the page count — so the card could only ever say "Click to
-- preview". Both are known at upload time from the multipart buffer; nullable because every
-- CV already stored predates these columns, and they are backfilled lazily on first read
-- rather than by a migration that would have to pull the whole corpus out of S3.

ALTER TABLE "tblSubscriberCVUploaded"
    ADD COLUMN IF NOT EXISTS "SizeBytes" INTEGER,
    ADD COLUMN IF NOT EXISTS "PageCount" SMALLINT;
