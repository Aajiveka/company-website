CREATE PROC [dbo].[spClientManageJob]
@UserID BIGINT, @LoginID BIGINT, @RoleID INT,
@JobID BIGINT, @ClientID BIGINT,
@DesignationID INT,@EmpTypeID INT,@WorkModeID INT,
@JobDescr VARCHAR(MAX),@MinExp INT, @MaxExp INT,
@MinCTC INT, @MAXCTC INT,@CityID INT, @IndustryTypeID iNT, 
@SkillID [dbo].[udt_Education] READONLY,
@EducationTypeID [dbo].[udt_Education] READONLY,
@Gender [dbo].[udt_Gender] READONLY
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	IF ISNULL(@JobID,0) = 0
		BEGIN
			INSERT INTO [dbo].[tblClientJobs](ClientID,DesignationID,EmployeeTypeID,WorkModeID,JobDescr,
					MinExp,MaxEmp,MinCTC,MaxCTC,JobCityID,StatusID,TimestampIns,LoginIDIns,IndustryTypeID)
			VALUES(@ClientID, @DesignationID, @EmpTypeID, @WorkModeID, @JobDescr, @MinExp, @MaxExp,@MinCTC, @MAXCTC,
			@CityID,1, @dt,@LoginID,@IndustryTypeID)
			
			SET @JobID = SCOPE_IDENTITY()

			INSERT INTO [tblClientJobs_Gendermapping] SELECT @JobID, Gender FROM @Gender
			INSERT INTO [tblClientJobs_EducationType] SELECT @JobID, DegreeID FROM @EducationTypeID
			INSERT INTO [tblClientJobSkill] SELECT @JobID, DegreeID FROM @SkillID
		END
	ELSE
		BEGIN
			UPDATE [tblClientJobs] SET DesignationID = @DesignationID,EmployeeTypeID = @EmpTypeID,WorkModeID = @WorkModeID,
			JobDescr = @JobDescr,MinExp = @MinExp,MaxEmp = @MaxExp,MinCTC = @MinCTC,MaxCTC = @MAXCTC,
			JobCityID = @CityID,StatusID = 1,TimestampUpd = @dt,LoginIDIns = @LoginID,IndustryTypeID = @IndustryTypeID
			WHERE JobID  =@JobID

			DELETE FROM [tblClientJobs_Gendermapping] WHERE JobID = @JobID
			DELETE FROM [tblClientJobs_EducationType] WHERE JobID = @JobID
			DELETE FROM [tblClientJobSkill] WHERE JobID = @JobID

			INSERT INTO [tblClientJobs_Gendermapping] SELECT @JobID, Gender FROM @Gender
			INSERT INTO [tblClientJobs_EducationType] SELECT @JobID, DegreeID FROM @EducationTypeID
			INSERT INTO [tblClientJobSkill] SELECT @JobID, DegreeID FROM @SkillID
		END

	SELECT @JobID AS JobID
END
GO
