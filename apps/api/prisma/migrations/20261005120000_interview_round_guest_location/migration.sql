-- Employer interview scheduling: an optional guest panelist, and a venue for face-to-face
-- rounds that previously had to be squeezed into MeetingLink.

ALTER TABLE "tblInterviewRound"
    ADD COLUMN IF NOT EXISTS "GuestName" VARCHAR(200),
    ADD COLUMN IF NOT EXISTS "GuestEmail" VARCHAR(200),
    ADD COLUMN IF NOT EXISTS "Location" VARCHAR(500);
