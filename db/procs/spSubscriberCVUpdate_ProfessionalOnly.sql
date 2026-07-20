CREATE PROC [dbo].[spSubscriberCVUpdate_ProfessionalOnly]
@SubscriberID bigint,
@LoginID bigint,
@UserID bigint,
@RoleID INT,
@Experience udt_Employers READONLY,
@SubscriberEmployerID BIGINT
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	DECLARE @EmployerName VARCHAR(1000), @DesignationID INT,@StartDt DATE, @EndDate DATE,@Responsibilities VARCHAR(1000),
	@flgCurrent TINYINT

	IF NOT EXISTS(SELECT * FROM @Experience)
		BEGIN
			DELETE FROM tblSubscriberEmployer WHERE SubscriberEmployerID = @SubscriberEmployerID
		END
	ELSE
		BEGIN
			SELECT @EmployerName = EmployerName,@StartDt = StartDt, @EndDate = EndDate, @Responsibilities  =Responsibilities, 
			@flgCurrent = flgCurrent
			FROM @Experience

			IF ISNULL(@SubscriberEmployerID,0)=0
				BEGIN
					INSERT INTO tblSubscriberEmployer(SubscriberID, Employer, DesignationID,JoiningDate,ReleavingDate,JobDescr,
					TimestampIns,LoginIDIns,flgCurrent)
					VALUES(@SubscriberID,@EmployerName, @DesignationID,@StartDt, 
					CASE WHEN @flgCurrent <> 1 THEN @EndDate END,@Responsibilities,@dt, @LoginID,@flgCurrent)
					SET @SubscriberEmployerID = SCOPE_IDENTITY()
				END
			ELSE
				BEGIN
					UPDATE tblSubscriberEmployer SET Employer = @EmployerName, DesignationID = @DesignationID, JoiningDate = @StartDt, ReleavingDate = CASE WHEN @flgCurrent <> 1 THEN @EndDate END,JobDescr = @Responsibilities,
					TimestampUpd = @dt,LoginIDUpd = @LoginID,flgCurrent = @flgCurrent
					WHERE SubscriberEmployerID = @SubscriberEmployerID
				END
		END
	SELECT 1 AS flgSuccess, @SubscriberEmployerID AS MappingID
END
GO
