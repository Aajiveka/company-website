-- The legacy schema has NO link between tblSecUser and tblSubscriberRegistration. The C#
-- that knew the mapping (it put SubscriberID straight into Session) was not recovered, and
-- /candidates/me only appeared to work because UserID 1 and SubscriberID 1 collided in the
-- dev data — they are independent identity sequences and diverge immediately.
--
-- This makes the link explicit. It is deliberately left NULL for the migrated legacy rows:
-- the mapping is not discoverable from the data, and guessing it would silently hand one
-- candidate another candidate's CV.
ALTER TABLE "tblSecUser" ADD COLUMN "SubscriberID" BIGINT;

ALTER TABLE "tblSecUser"
  ADD CONSTRAINT "tblSecUser_SubscriberID_key" UNIQUE ("SubscriberID");

ALTER TABLE "tblSecUser"
  ADD CONSTRAINT "tblSecUser_SubscriberID_fkey"
  FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID")
  ON DELETE SET NULL ON UPDATE CASCADE;
