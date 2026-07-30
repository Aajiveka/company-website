-- tblSubscriberEducation.CourseTypeID points at tblMstrCourse, not tblMstrCourseType.
--
-- The extraction inferred the original constraint from the column name and recorded it in
-- foreign-keys.psv flagged "dirty" (unverified). The legacy procs settle it:
--
--   spSubscriberCVGetDetails:      tblMstrCourse AS b ON a.CourseTypeID = b.DegreeID
--   spSubscriberCVUpdate_Education: INSERT ... CourseTypeID ... VALUES (..., @CoureID, ...)
--
-- tblMstrCourseType has no rows and no dumped source anywhere in db/seed, so the inferred
-- constraint could never be satisfied: choosing any course in the CV editor failed the key.
--
-- Safe to re-point: CourseTypeID is nullable and no row has ever held a non-null value.

-- DropForeignKey
ALTER TABLE "tblSubscriberEducation"
  DROP CONSTRAINT IF EXISTS "tblSubscriberEducation_CourseTypeID_fkey";

-- AddForeignKey
ALTER TABLE "tblSubscriberEducation"
  ADD CONSTRAINT "tblSubscriberEducation_CourseTypeID_fkey"
  FOREIGN KEY ("CourseTypeID") REFERENCES "tblMstrCourse"("DegreeID")
  ON UPDATE CASCADE ON DELETE SET NULL;
