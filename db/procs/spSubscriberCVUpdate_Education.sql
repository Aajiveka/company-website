CREATE PROC [dbo].[spSubscriberCVUpdate_Education]
@SubscriberID bigint,
@LoginID bigint,
@UserID bigint,
@RoleID INT,
@Education udt_CourseDegree READONLY,
@SubscriberEducationID BIGINT

AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	DECLARE @DegreeID INT,@CoureID INT

	IF NOT EXISTS(SELECT * FROM @Education)
		BEGIN
			DELETE tblSubscriberEducation WHERE SubscriberEducationID = @SubscriberEducationID
		END
	ELSE
		BEGIN
			SELECT @DegreeID = DegreeID,@CoureID = CoureID FROM @Education

			IF ISNULL(@SubscriberEducationID,0)=0
				BEGIN
					INSERT INTO tblSubscriberEducation(SubscriberID,DegreeID,CourseTypeID, TimestampIns, LoginIDIns)
					VALUES(@SubscriberID,@DegreeID,@CoureID, @dt, @LoginID)
					SET @SubscriberEducationID = SCOPE_IDENTITY()
				END
			ELSE
				BEGIN
					UPDATE tblSubscriberEducation SET CourseTypeID = @CoureID, DegreeID = @DegreeID
					WHERE SubscriberEducationID = @SubscriberEducationID
				END
		END

	SELECT 1 AS flgSuccess, @SubscriberEducationID As MappingID
END
GO
