-- Preferred work mode is its own answer, not a shift.
--
-- The Job Preferences wizard step asks two independent questions: where you work
-- (Remote / Hybrid / On-site) and, elsewhere, which hours you work (Day / Night / Flexible).
-- Only the second had a column, so the step packed its multi-select work modes into
-- PreferredShift as a joined string. The API validates PreferredShift against the shift
-- vocabulary, so every save of that step failed with a 400 and the candidate saw
-- "Could not save your preferences" with no way past it.
--
-- Comma-separated like the neighbouring DesiredJobType/DesiredEmploymentType columns, since a
-- candidate can accept more than one mode and these lists have no master table.
ALTER TABLE "tblSubscriberProfileExtra"
  ADD COLUMN "PreferredWorkModes" VARCHAR(100);
