CREATE PROC [spSubscriberAPIManageDetails_Degree]
@LoginID BIGINT, @SubscriberID BIGINT, @DegreeID INT, @CourseTypeID INT, @flgDelete TINYINT, @SubscriberEducationID BIGINT
AS
	DECLARE @dt DATETIME =dbo.fnGetCurrentDateTime()

	IF @flgDelete = 1
		DELETE FROM tblSubscriberEducation WHERE SubscriberID = @SubscriberID AND CourseTypeID = @CourseTypeID
	ELSE
		BEGIN
			UPDATE tblSubscriberEducation SET CourseTypeID = @CourseTypeID,DegreeID = @DegreeID, loginIDUpd = @LoginID, TimestampUpd = @dt
				WHERE SubscriberEducationID = @SubscriberEducationID
			INSERT INTO tblSubscriberEducation(SubscriberID,CourseTypeID,DegreeID,TimestampIns,LoginIDIns)
			VALUES(@SubscriberID,@CourseTypeID,@DegreeID, @dt, @LoginID)
		END
	SELECT 1 AS flgStaus
GO
