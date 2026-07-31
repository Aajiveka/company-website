-- Widen RegistrationMobileNo so signup is not India-only.
--
-- The column was varchar(10), matching India's fixed national number length, and RegisterDto
-- enforced /^[0-9]{10}$/ to match. The signup form now offers every country's dial code, and
-- national numbers are not ten digits everywhere — the UAE uses 9, Germany up to 11 — so any
-- non-Indian number was rejected at the DTO and would have overflowed the column regardless.
--
-- 15 is E.164's maximum length for a full number, so it is the ceiling for a national number
-- too. tblSubscriberCVDetails.MobileNo1 is already varchar(15); this brings the pair in line.
--
-- Widening a varchar is metadata-only in Postgres: no table rewrite, no lock beyond the brief
-- ACCESS EXCLUSIVE on the catalog update, and every existing value stays valid.
ALTER TABLE "tblSubscriberRegistration"
  ALTER COLUMN "RegistrationMobileNo" TYPE VARCHAR(15);
