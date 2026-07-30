-- tblSubscriberEducation.DegreeID holds an EducationTypeID, not a course id.
--
-- The reference UI (reference/MainProject/candidate-profile.aspx) is explicit about the pair
-- of dropdowns this table stores:
--
--   fnBindDegreeDropdown()  builds "-- Select Degree --" from EducationTypeID / Descr
--                           (tblMstrEducationType: 10th, 12th, Gradution, Post Graduation)
--   fnDegree(ctrl)          rebuilds "-- Select Course --" from tblMstrCourse, keeping only
--                           rows whose EducationTypeID matches the chosen degree
--
-- and on load it restores them as:
--   ddlDegree.val(DegreeID)        <- so DegreeID is an EducationTypeID
--   ddlCourse.val(CourseTypeID)    <- so CourseTypeID is a tblMstrCourse.DegreeID
--
-- The extraction inferred DegreeID -> tblMstrEducationDegree from the column name and flagged
-- it "dirty". tblMstrEducationDegree is a byte-identical duplicate of tblMstrCourse, so that
-- constraint made the Degree dropdown offer courses instead of levels, and would reject the
-- "Gradution" level outright (no row with id 3 exists in the course list).
--
-- Existing DegreeID values are course ids under the old meaning and cannot be reinterpreted as
-- levels, so they are cleared rather than silently mislabelled.

-- Clear values that were stored under the old (incorrect) meaning.
UPDATE "tblSubscriberEducation"
   SET "DegreeID" = NULL
 WHERE "DegreeID" IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM "tblMstrEducationType" t WHERE t."EducationTypeID" = "tblSubscriberEducation"."DegreeID"
   );

-- DropForeignKey
ALTER TABLE "tblSubscriberEducation"
  DROP CONSTRAINT IF EXISTS "tblSubscriberEducation_DegreeID_fkey";

-- AddForeignKey
ALTER TABLE "tblSubscriberEducation"
  ADD CONSTRAINT "tblSubscriberEducation_DegreeID_fkey"
  FOREIGN KEY ("DegreeID") REFERENCES "tblMstrEducationType"("EducationTypeID")
  ON UPDATE CASCADE ON DELETE SET NULL;
