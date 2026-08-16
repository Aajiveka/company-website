-- Key skills as the candidate typed them.
--
-- Key skills were stored only as rows in tblSubscriberTags, which is a join to tblMstrTags —
-- a master list. Saving therefore matched the typed names against that list and silently
-- dropped everything else, so a candidate who typed "reactjs" got a 200 back and an empty
-- Key Skills card: the chips they had just added were gone on the next read.
--
-- The typed list now lives here verbatim and is what the profile renders. tblSubscriberTags
-- is still written for the names that do match a master tag, so recruiter-side search by tag
-- keeps working exactly as before — this column is the display copy, not a replacement.
ALTER TABLE "tblSubscriberProfileExtra"
  ADD COLUMN "KeySkills" VARCHAR(1000);

-- Backfill from the tag join so profiles saved before this column existed keep their chips
-- instead of appearing to lose them the first time the new read path runs.
UPDATE "tblSubscriberProfileExtra" e
SET "KeySkills" = sub.names
FROM (
  SELECT st."SubscriberID" AS sid, string_agg(t."TagName", ', ' ORDER BY t."TagName") AS names
  FROM "tblSubscriberTags" st
  JOIN "tblMstrTags" t ON t."TagID" = st."TagID"
  GROUP BY st."SubscriberID"
) sub
WHERE e."SubscriberID" = sub.sid
  AND e."KeySkills" IS NULL;
