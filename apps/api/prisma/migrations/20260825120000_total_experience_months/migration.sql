-- Months half of total work experience.
--
-- tblSubscriberCVDetails.TotalExp is a whole-number years column on the legacy CV row, so the
-- months a candidate enters ("5 years 6 months", the way every job portal asks) land on the
-- extras row instead of widening the migrated table.
ALTER TABLE "tblSubscriberProfileExtra" ADD COLUMN IF NOT EXISTS "TotalExpMonths" smallint;
