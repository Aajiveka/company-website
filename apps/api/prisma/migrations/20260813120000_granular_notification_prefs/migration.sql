-- Per-topic notification preferences.
--
-- The preference record only had three delivery channels (email / push / SMS) plus a digest
-- frequency, so the Email Preferences screen could offer nothing finer than "all email on or
-- off". The design asks the candidate which *topics* they want — job alerts separately from
-- interview reminders separately from marketing — which is also what makes an unsubscribe
-- link meaningful.
--
-- Separate columns rather than a JSON blob: a mail job has to filter on "who wants this
-- topic" in SQL, which a blob cannot do with an index.
ALTER TABLE "tblNotificationPreference"
  ADD COLUMN "NewJobAlerts"             BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "WeeklyJobDigest"          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "ProfileViewAlerts"        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "ApplicationStatusUpdates" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "RecruiterMessages"        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "InterviewReminders"       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "ProductUpdates"           BOOLEAN NOT NULL DEFAULT TRUE,
  -- Marketing is opt-in: existing candidates never agreed to it, so it starts off.
  ADD COLUMN "MarketingOffers"          BOOLEAN NOT NULL DEFAULT FALSE;
