-- Education: years attended and branch of study.
--
-- The profile could record which course at which level, plus the year it was awarded. The
-- design asks for a start year as well ("2014 – 2018") and for the specialization, which a
-- course id cannot express: "B.E." is the qualification, "Computer Engineering" is the branch,
-- and the master list only carries the former.
ALTER TABLE "tblSubscriberEducation"
  ADD COLUMN "StartYear"      INTEGER,
  ADD COLUMN "Specialization" VARCHAR(300);
