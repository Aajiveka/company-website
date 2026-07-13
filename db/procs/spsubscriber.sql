-- ============ spSubscriberAPIGetDetails_Certificate ============
CREATE PROC [dbo].[spSubscriberAPIGetDetails_Certificate]
@LoginID BIGINT, @SubscriberID BIGINT
AS
	SELECT CertificateName, SubscriberCertificateID
	FROM     tblSubscriberCertificate
	WHERE  (SubscriberID = @SubscriberID)

	
0
GO

-- ============ spSubscriberAPIGetDetails_Degree ============
CREATE PROC [dbo].[spSubscriberAPIGetDetails_Degree]
@LoginID BIGINT, @SubscriberID BIGINT
AS
	SELECT b.DegreeName AS Course, c.DegreeName AS Degree, a.CourseTypeID, a.DegreeID, a.SubscriberEducationID, c.HighestSeq
	FROM     tblSubscriberEducation AS a INNER JOIN
					  tblMstrCourse AS b ON a.CourseTypeID = b.DegreeID INNER JOIN
					  tblMstrDegreeType AS c ON b.EducationTypeID = c.DegreeTypeID
	WHERE  (a.SubscriberID = @SubscriberID) ORDER BY c.HighestSeq

	0
GO

-- ============ spSubscriberAPIGetDetails_Education ============
CREATE PROC [dbo].spSubscriberAPIGetDetails_Education
@SubscriberID BIGINT
AS
BEGIN

	SELECT b.DegreeName AS Course, c.DegreeName AS Degree, a.CourseTypeID, a.DegreeID, a.SubscriberEducationID, c.HighestSeq
	FROM     tblSubscriberEducation AS a INNER JOIN
					  tblMstrCourse AS b ON a.CourseTypeID = b.DegreeID INNER JOIN
					  tblMstrDegreeType AS c ON b.EducationTypeID = c.DegreeTypeID
	WHERE  (a.SubscriberID = @SubscriberID) ORDER BY c.HighestSeq

	SELECT CertificateName, SubscriberCertificateID
	FROM     tblSubscriberCertificate
	WHERE  (SubscriberID = @SubscriberID)


END0
GO

-- ============ spSubscriberAPIGetDetails_Exp ============
CREATE PROC [dbo].[spSubscriberAPIGetDetails_Exp]
@SubscriberID BIGINT
AS
BEGIN

		SELECT Employer, DesignationID, FORMAT(JoiningDate, 'dd-MMM-yyyy') AS JoiningDate, CASE WHEN flgCurrent = 1 THEN '' ELSE FORMAT(ReleavingDate, 'dd-MMM-yyyy') END AS ReleavingDate, flgCurrent, SubscriberEmployerID, 
						  JobDescr AS Responsibilities
		FROM     tblSubscriberEmployer
		WHERE  (SubscriberID = @SubscriberID)



END0
GO

-- ============ spSubscriberAPIGetDetails_Personal ============
CREATE PROC [dbo].[spSubscriberAPIGetDetails_Personal]
@SubscriberID bigint
AS
BEGIN

SELECT a.FullName AS Name, a.MobileNo1 AS MobileNo, CASE WHEN YEAR(DOB) = 1900 THEN '' ELSE FORMAT(DOB, 'dd-MMM-yyyy') END AS DOB, a.Gender, a.AddressLine1 AS Address, 
dbo.fncGetDocumentFolder(20)+a.PhotoName AS PhotoName, a.CityID, b.StateID, b.Descr AS City, 
                  s.StateID AS Expr1, s.Descr AS State, a.EmailID, dbo.fncGetDocumentFolder(1)+a.CVPath AS CVPath
FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
                  tblMstrCily AS b ON a.CityID = b.CityID LEFT OUTER JOIN
                  tblMstrState AS s ON b.StateID = s.StateID
WHERE  (a.SubscriberID = @SubscriberID)


END0
GO

-- ============ spSubscriberAPIGetDetails_Professional ============
CREATE PROC [dbo].[spSubscriberAPIGetDetails_Professional]
@SubscriberID BIGINT
AS
BEGIN

		SELECT a.IndustryTypeID, IndustryType,s.FunctionID,F.Descr AS [Function],a.SubFunctionID,s.Descr AS SubFunction,
		a.TotalExp, a.CurrentCTC,a.CurrentCityID,c.Descr AS CurrentCity,a.flgReadyToRelocate,a.NoticePeriod,a.SkillID, sk.Descr AS Skill
		FROM tblSubscriberCVDetails a INNER JOIN [tblMstrSubFunctions] s ON a.SubFunctionID = s.SubfunctionID INNER JOIN [tblMstrFunctions] F ON s.FunctionID = F.FunctionID
		INNER JOIN [tblMstrIndustryType] I ON I.IndustryTypeID = a.IndustryTypeID INNER JOIN [tblMstrSkills] sk ON sk.SkillID = a.SkillID INNER JOIN tblMstrCily C ON
		c.CityID = a.CurrentCityID 
		WHERE  (SubscriberID = @SubscriberID)

		SELECT Employer, DesignationID, FORMAT(JoiningDate, 'dd-MMM-yyyy') AS JoiningDate, CASE WHEN flgCurrent = 1 THEN '' ELSE FORMAT(ReleavingDate, 'dd-MMM-yyyy') END AS ReleavingDate, flgCurrent, SubscriberEmployerID, 
						  JobDescr AS Responsibilities
		FROM     tblSubscriberEmployer
		WHERE  (SubscriberID = @SubscriberID)

	select a.CityID, b.Descr AS City 
	FROM tblSubscriberPrefferedLocations a INNER JOIN tblMstrCily b ON a.CityID = b.CityID
	WHERE SubscriberID = @SubscriberID



END0
GO

-- ============ spSubscriberAPIManageDetails_Certificate ============
CREATE PROC [dbo].[spSubscriberAPIManageDetails_Certificate]
@LoginID BIGINT, @SubscriberID BIGINT, @SubscriberCertificateID BIGINT, @flgDelete TINYINT, @CertificateName VARCHAR(1000)
AS
	DECLARE @dt DATETIME =dbo.fnGetCurrentDateTime()
	IF @flgDelete = 1
		DELETE FROM tblSubscriberCertificate WHERE SubscriberCertificateID = @SubscriberCertificateID
	ELSE
		BEGIN
			UPDATE tblSubscriberCertificate SET CertificateName = @CertificateName, loginIDUpd = @LoginID, TimestampUpd = @dt
			WHERE SubscriberCertificateID = @SubscriberCertificateID

			INSERT INTO tblSubscriberCertificate(CertificateName,TimestampIns,LoginIDIns) VALUES(@CertificateName, @dt,@LoginID)
		END
	SELECT 1 AS flgStaus
<
GO

-- ============ spSubscriberCVGet ============
CREATE PROC [dbo].[spSubscriberCVGet]
@SubscriberID BIGINT, @LoginID bigint, @UserID bigint, @ROleID INT
AS
BEGIN
	select dbo.fncGetDocumentFolder(20)+LatestCVPath AS LatestCVPath,CVName FROM [dbo].[tblSubscriberCVUploaded] WHERE SubscriberID = @SubscriberID
END
0
GO

-- ============ spSubscriberCVGetDetails ============
CREATE PROC [dbo].[spSubscriberCVGetDetails]
@LoginID BIGINT,@UserID BIGINT, @SubscriberID BIGINT
AS
BEGIN

SELECT a.FullName AS Name, a.MobileNo1 AS MobileNo, CASE WHEN YEAR(DOB) = 1900 THEN '' ELSE FORMAT(DOB, 'dd-MMM-yyyy') END AS DOB, a.Gender, a.AddressLine1 AS Address, 
dbo.fncGetDocumentFolder(1)+a.CVPath AS CVPath, dbo.fncGetDocumentFolder(20)+a.PhotoName AS PhotoName, a.TotalExp, a.CurrentCTC, 
                  a.CurrentCityID, a.flgReadyToRelocate, a.NoticePeriod, a.CityID, b.StateID, a.SkillID, a.SubFunctionID, i.IndustryTypeID, i.IndustryType, a.EmailID, s.FunctionID, a.strTag,
				  CVPath AS CVPath_Name,a.PhotoName AS PhotoName_Name
INTO        [#Personl]
FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
                  tblMstrCily AS b ON a.CityID = b.CityID LEFT OUTER JOIN
                  tblMstrIndustryType AS i ON a.IndustryTypeID = i.IndustryTypeID LEFT OUTER JOIN
                  tblMstrSubFunctions AS s ON a.SubFunctionID = s.SubFunctionID
WHERE  (a.SubscriberID = @SubscriberID)

	SELECT [Name],MobileNo,DOB,Gender, EmailID As Email,[Address],CVPath,PhotoName,CityID,StateID,CVPath_Name, PhotoName_Name
	FROM #Personl

	SELECT b.DegreeName AS Course, c.DegreeName AS Degree, a.CourseTypeID, a.DegreeID, a.SubscriberEducationID, c.HighestSeq
	FROM     tblSubscriberEducation AS a INNER JOIN
					  tblMstrCourse AS b ON a.CourseTypeID = b.DegreeID INNER JOIN
					  tblMstrDegreeType AS c ON b.EducationTypeID = c.DegreeTypeID
	WHERE  (a.SubscriberID = @SubscriberID) ORDER BY c.HighestSeq

	SELECT CertificateName, SubscriberCertificateID
	FROM     tblSubscriberCertificate
	WHERE  (SubscriberID = @SubscriberID)

		SELECT TotalExp, CurrentCTC,CurrentCityID,flgReadyToRelocate,NoticePeriod,SkillID, SubFunctionID,FunctionID, 
		IndustryTypeID, IndustryType,strTag
		FROM #Personl

		SELECT Employer, DesignationID, FORMAT(JoiningDate, 'dd-MMM-yyyy') AS JoiningDate, CASE WHEN flgCurrent = 1 THEN '' ELSE FORMAT(ReleavingDate, 'dd-MMM-yyyy') END AS ReleavingDate, flgCurrent, SubscriberEmployerID, 
						  JobDescr AS Responsibilities
		FROM     tblSubscriberEmployer
		WHERE  (SubscriberID = @SubscriberID)

	select a.CityID, b.Descr AS City 
	FROM tblSubscriberPrefferedLocations a INNER JOIN tblMstrCily b ON a.CityID = b.CityID
	WHERE SubscriberID = @SubscriberID

	SELECT * FROM tblSubscriberTags WHERE SubscriberID = @SubscriberID
END0
GO

-- ============ spSubscriberCVUpdate ============
CREATE PROC [dbo].[spSubscriberCVUpdate]
@SubscriberID BIGINT, @LoginID bigint, @UserID bigint, @ROleID INT, @CVFileName VARCHAR(200),
@CVPath VARCHAR(1000), @Name VARCHAR(100),@CityID VARCHAR(100),@DOB DATE, @MobileNo VARCHAR(10)
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()

	IF EXISTS(SELECT * FROM [tblSubscriberCVUploaded] WHERE SubscriberID = @SubscriberID)
		UPDATE [tblSubscriberCVUploaded] SET LatestCVPath = @CVPath,CVName = @CVFileName,
		LoginIDUpd = @LoginID,TImestampUpd = @dt WHERE SubscriberID = @SubscriberID
	ELSE
		INSERT INTO [tblSubscriberCVUploaded](SubscriberID,LatestCVPath,CVName,TimestampIns,LoginIDIns)
		VALUES(@SubscriberID,@CVPath,@CVFileName,@dt,@LoginID)

	IF NOT EXISTS(Select * FROM tblSubscriberCVDetails WHERE SubscriberID = @SubscriberID)
		INSERT INTO tblSubscriberCVDetails(SubscriberID,FullName,MobileNo1,CityID,DOB)
		VALUES(@SubscriberID,@Name,@MobileNo,@CityID,@DOB)
	ELSE
		UPDATE tblSubscriberCVDetails SET FullName = @Name,MobileNo1 = @MobileNo,CityID = @CityID,
		DOB = @DOB WHERE SubscriberID = @SubscriberID
	SELECT 1 as flgSuccess
END
0
GO

-- ============ spSubscriberCVUpdate_Certificate ============
CREATE PROC [dbo].[spSubscriberCVUpdate_Certificate]
@SubscriberID bigint,
@LoginID bigint,
@UserID bigint,
@RoleID INT,
@SubscriberCertificateID BIGINT,
@Certificates udt_Certificate READONLY

AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	DECLARE @CertificateName VARCHAR(1000)

	IF NOT EXISTS(SELECT * FROM @Certificates)
		BEGIN
			DELETE tblSubscriberCertificate WHERE SubscriberCertificateID = @SubscriberCertificateID
		END
	ELSE
		BEGIN
			SELECT @CertificateName = CertificateName FROM @Certificates
			
			IF ISNULL(@SubscriberCertificateID,0)<>0
				BEGIN
					INSERT INTO tblSubscriberCertificate(SubscriberID,CertificateName, TimestampIns, LoginIDIns)
					VALUES(@SubscriberID,@CertificateName, @dt, @LoginID)
					SET @SubscriberCertificateID = SCOPE_IDENTITY()
					select 'a'
				END
			ELSE
				BEGIN
					UPDATE tblSubscriberCertificate SET CertificateName = @CertificateName
					WHERE SubscriberCertificateID = @SubscriberCertificateID
				END
		END

	SELECT 1 AS flgSuccess, @SubscriberCertificateID As MappingID
END


   SET Employer = @EmployerName, DesignationID = @DesignationID, JoiningDate = @StartDt, ReleavingDate = CASE WHEN @flgCurrent <> 1 THEN @EndDate END,JobDescr = @Responsibilities,
					TimestampUpd = @dt,LoginIDUpd = @LoginID,flgCurrent = @flgCurrent
					WHERE SubscriberEmployerID = @SubscriberEmployerID
				END
		END
	SELECT 1 AS flgSuccess, @SubscriberEmployerID AS MappingID
END


<
GO

-- ============ spSubscriberCVUpdate_Education ============
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


0
GO

-- ============ spSubscriberCVUpdate_GetMasters ============
CREATE PROC [dbo].[spSubscriberCVUpdate_GetMasters]
@SubscriberID INT,
@LoginID bigint,
@UserID bigint,
@RoleID INT
AS
BEGIN
	Select * FROM [dbo].[tblMstrGender]
	Select * FROM [dbo].[tblMstrState]
	Select * FROM [dbo].tblMstrCily
	Select [DegreeTypeID] AS EducationTypeID, [DegreeName] AS Descr FROM [dbo].[tblMstrDegreeType]  ORDER BY HighestSeq
	Select * FROM tblMstrCourse
	Select * FROM [dbo].[tblMstrSkills]
	Select * FROM [dbo].[tblMstrFunctions]
	Select IndustryTypeId, IndustryType FROM tblMstrIndustryType
	Select * from tblMstrSubFunctions
	Select * from tblmstrTags
END0
GO

-- ============ spSubscriberCVUpdate_Personal ============
CREATE PROC [dbo].[spSubscriberCVUpdate_Personal]
@SubscriberID bigint,
@LoginID BIGINT,
@UserID bigint,
@RoleID INT,
@Name VARCHAR(100),
@MobileNo VARCHAR(20),
@DOB DATE,
@Gender VARCHAR(1),
@Email VARCHAR(100),
@Address VARCHAR(200),
@CVPath VARCHAR(200),
@Photo VARCHAR(500),
@CityID INT
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	IF EXISTS(SELECT * FROM tblSubscriberCVDetails WHERE SubscriberID = @SubscriberID)
		BEGIN
			UPDATE tblSubscriberCVDetails
			SET FullName = @Name,AddressLine1 = @Address,MobileNo1 = @MobileNo,DOB = @DOB,PhotoName = @Photo,Gender = @Gender, TimestampUpd = @dt,CVPath = @CVPath, EmailID = @Email,
			loginIDUpd = @LoginID, CityID = @CityID WHERE SubscriberID = @SubscriberID
		END
	ELSE
		BEGIN
			INSERT INTO tblSubscriberCVDetails(SubscriberID,FullName,AddressLine1,MobileNo1,DOB,Gender, TimestampIns, LoginIDIns,PhotoName,CVPath,EmailID)
			VALUES(@SubscriberID,@Name,@Address,@MobileNo,@DOB,@Gender,@dt, @LoginID,@Photo,@CVPath,@Email )
		END
	IF ISNULL(@CVPath,'')<>''
		BEGIN
			UPDATE tblSubscriberRegistration SET flgCVUploaded = 1 WHERE SubscriberID = @SubscriberID
			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 3,TimestampIns = @dt WHERE SubscriberID = @SubscriberID AND JobMapStatusID = 1
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns])
			VALUES(@SubscriberID,3,@UserID,@dt)
		END
	SELECT 1 AS flgSuccess
END



  N
			UPDATE tblSubscriberCVDetails
			SET FullName = @Name,AddressLine1 = @Address,MobileNo1 = @MobileNo,DOB = @DOB,PhotoName = @Photo,Gender = @Gender, TimestampUpd = @dt,CVPath = @CVPath, EmailID = @Email,
			loginIDUpd = @LoginID WHERE SubscriberID = @SubscriberID
		END
	ELSE
		BEGIN
			INSERT INTO tblSubscriberCVDetails(SubscriberID,FullName,AddressLine1,MobileNo1,DOB,Gender, TimestampIns, LoginIDIns,PhotoName,CVPath,EmailID)
			VALUES(@SubscriberID,@Name,@Address,@MobileNo,@DOB,@Gender,@dt, @LoginID,@Photo,@CVPath,@Email )
		END
	IF ISNULL(@CVPath,'')<>''
		BEGIN
			UPDATE tblSubscriberRegistration SET flgCVUploaded = 1 WHERE SubscriberID = @SubscriberID
			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 2,TimestampIns = @dt WHERE SubscriberID = @SubscriberID AND JobMapStatusID = 1
		END
	SELECT 1 AS flgSuccess
END



<
GO

-- ============ spSubscriberCVUpdate_Professional ============
CREATE PROC [dbo].[spSubscriberCVUpdate_Professional]
@SubscriberID bigint,
@LoginID bigint,
@UserID bigint,
@RoleID INT,
@SkillSetID INT,
@SubFunctionID INT,
@TotalExp INT,
@CTC DECIMAL(18,2),
@NoticePeriod TINYINT,
@PrefferedCityID udt_Education READONLY,
@CurrentCityID INT,
@flgReadyToRelocate TINYINT,
@IndustryTypeID INT,
@Tags udt_Education READONLY,
@strTag VARCHAR(500)
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	print '1'
	DELETE FROM tblSubscriberPrefferedLocations WHERE SubscriberID = @SubscriberID
	INSERT INTO tblSubscriberPrefferedLocations(SubscriberID,CityID, LoginIDIns, TimestampIns)
	SELECT @SubscriberID,DegreeID, @LoginID, @DT FROM @PrefferedCityID
	print '2'
	UPDATE tblSubscriberCVDetails SET TotalExp = @TotalExp,CurrentCTC = @CTC,CurrentCityID = @CurrentCityID,
	flgReadyToRelocate = @flgReadyToRelocate,NoticePeriod = @NoticePeriod,TimestampUpd = @dt, loginIDUpd = @LoginID,
	IndustryTypeID = @IndustryTypeID, SkillID  =@SkillSetID, CityID = @CurrentCityID, SubFunctionID = @SubFunctionID,
	strTag = @strTag
	WHERE SubscriberID = @SubscriberID
	print '3'
	DELETE FROM tblSubscriberTags WHERE SubscriberID = @SubscriberID
	INSERT INTO tblSubscriberTags(SubscriberID,TagID)
	SELECT @SubscriberID,DegreeID FROM @Tags
	print '4'
	SELECT 1 AS flgSuccess
END

  xp INT,
@CTC DECIMAL(18,2),
@NoticePeriod TINYINT,
@PrefferedCityID udt_Education READONLY,
@CurrentCityID INT,
@flgReadyToRelocate TINYINT,
@IndustryTypeID INT,
@Tags udt_Education READONLY,
@strTag VARCHAR(500)
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()

	DELETE FROM tblSubscriberPrefferedLocations WHERE SubscriberID = @SubscriberID
	INSERT INTO tblSubscriberPrefferedLocations(SubscriberID,CityID, LoginIDIns, TimestampIns)
	SELECT @SubscriberID,DegreeID, @LoginID, @DT FROM @PrefferedCityID

	UPDATE tblSubscriberCVDetails SET TotalExp = @TotalExp,CurrentCTC = @CTC,CurrentCityID = @CurrentCityID,
	flgReadyToRelocate = @flgReadyToRelocate,NoticePeriod = @NoticePeriod,TimestampUpd = @dt, loginIDUpd = @LoginID,
	IndustryTypeID = @IndustryTypeID, SkillID  =@SkillSetID, CityID = @CurrentCityID, SubFunctionID = @SubFunctionID,
	strTag = @strTag
	WHERE SubscriberID = @SubscriberID

	DELETE FROM tblSubscriberTags WHERE SubscriberID = @SubscriberID
	INSERT INTO tblSubscriberTags(SubscriberID,TagID)
	SELECT @SubscriberID,DegreeID FROM @Tags

	SELECT 1 AS flgSuccess
END

0
GO

-- ============ spSubscriberCVUpdate_ProfessionalOnly ============
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


0
GO

-- ============ spSubscriberCVUpload ============
CREATE PROC [dbo].[spSubscriberCVUpload]
@SubscriberID BIGINT, @LoginID bigint, @UserID bigint, @ROleID INT, @CVFileName VARCHAR(200),
@CVPath VARCHAR(1000), @Name VARCHAR(100),@CityID VARCHAR(100),@DOB DATE, @MobileNo VARCHAR(10)
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()

	IF EXISTS(SELECT * FROM [tblSubscriberCVUploaded] WHERE SubscriberID = @SubscriberID)
		UPDATE [tblSubscriberCVUploaded] SET LatestCVPath = @CVPath,CVName = @CVFileName,
		LoginIDUpd = @LoginID,TImestampUpd = @dt WHERE SubscriberID = @SubscriberID
	ELSE
		INSERT INTO [tblSubscriberCVUploaded](SubscriberID,LatestCVPath,CVName,TimestampIns,LoginIDIns)
		VALUES(@SubscriberID,@CVPath,@CVFileName,@dt,@LoginID)

	IF NOT EXISTS(Select * FROM tblSubscriberCVDetails WHERE SubscriberID = @SubscriberID)
		INSERT INTO tblSubscriberCVDetails(SubscriberID,FullName,MobileNo1,CityID,DOB)
		VALUES(@SubscriberID,@Name,@MobileNo,@CityID,@DOB)
	ELSE
		UPDATE tblSubscriberCVDetails SET FullName = @Name,MobileNo1 = @MobileNo,CityID = @CityID,
		DOB = @DOB WHERE SubscriberID = @SubscriberID
	SELECT 1 as flgSuccess
END
0
GO

-- ============ spSubscriberDoc ============
CREATE PROCEDURE [dbo].[spSubscriberDoc]
	@SubscriberID BIGINT, @RoleID INT=1, @UserID bigint=0, @LoginID BIGINT
AS
BEGIN	

	DECLARE @cvName VARCHAR(1000)
	select @cvName = dbo.fncGetDocumentFolder(1)+CVPath FROM tblSubscriberCVDetails WHERE SubscriberID = @SubscriberID

	SELECT a.DocUploadID, MAX(DocStatusID) AS DocStatusID INTO #LatestSTS
	FROM tblCandidateDocumentStatus a INNER JOIN tblCandidateDocumentUploaded b ON a.DocUploadID  = b.DocUploadID
	WHERE b.SubscriberID = @SubscriberID
	GROUP BY a.DocUploadID

	SELECT a.StatusID,a.DocUploadID INTO #STS
	FROM tblCandidateDocumentStatus a INNER JOIN #LatestSTS b ON a.DocStatusID = b.DocStatusID
	
	SELECT a.DocUploadID AS DocMappingId,c.DocumentID AS DocTypeId,c.DocumentName AS Document,'' AS SampleFileName,
	dbo.fncGetDocumentFolder(c.DocumentID)+a.DocumentPath AS [FileName],a.DocumentPath AS [DocumentPath],s.Descr AS flgStatus,
	CASE WHEN s.StatusID IN(16,18) THEN 1 ELSE 0 END AS flgUpload, '0' As flgUrgent
	FROM tblCandidateDocumentUploaded a INNER JOIN #STS b ON a.DocUploadID = b.DocUploadID
	INNER JOIN tblMstrDocuments c ON c.DocumentID = a.DocumentTypeID INNER JOIN tblMstrStatus s ON
	s.StatusID = b.StatusID
	UNION
	SELECT 0 AS DocMappingId,c.DocumentID AS DocTypeId,c.DocumentName AS Document,'' AS SampleFileName,
	'' AS [FileName],'' AS [DocumentPath],'Document required' AS flgStatus,1 AS flgUpload, '0' As flgUrgent
	FROM tblCandidateDocumentMap a INNER JOIN tblMstrDocuments c ON c.DocumentID = a.DocumentTypeID 
	WHERE SubscriberID = @SubscriberID AND flgStatus=0
	UNION
	SELECT 1 As DocMappingId, '1' As DocTypeId, 'CV' as Document, 'CV.pdf' As SampleFileName, 
	@cvName As [FileName], 'Uplaoded',  '2' As flgStatus, '0' As flgUpload, '0' As flgUrgent

	--SELECT a.SubscriberDocID AS DocMappingId,a.DocumentTypeID AS DocTypeId,b.DocumentType AS Document,'' AS SampleFileName,
	--a.DocumentName AS [FileName],a.DocumentPath AS [DocumentPath], c.Descr AS [Status],
	--'' As ThumbImg, '2' As flgStatus, '1' As flgUpload, '0' As flgUrgent
	--FROM tblSubscriberDocs a INNER JOIN tblMstrDocumentType b ON a.DocumentTypeID = b.DocumentTypeID INNER JOIN #STS s ON
	--a.SubscriberDocID = s.SubscriberDocID INNER JOIN tblMstrJobMappingStatus c ON s.StatusID = c.JobMapStatusID
	
	--SELECT '1' As DocMappingId, '1' As DocTypeId, 'CV' as Document, 'CV.pdf' As SampleFileName, @cvName As [FileName], 'Uplaoded' As Status, '' As ThumbImg, '2' As flgStatus, '1' As flgUpload, '0' As flgUrgent
	--Union
	--SELECT '2' As DocMappingId, '2' As DocTypeId, 'PAN' as Document, 'PAN.pdf' As SampleFileName, 'MyPan.pdf' As [FileName], 'Verified' As Status, '' As ThumbImg, '3' As flgStatus, '0' As flgUpload, '0' As flgUrgent
	--Union
	--SELECT '3' As DocMappingId, '3' As DocTypeId, 'Aadhar' as Document, 'Aadhar.pdf' As SampleFileName, 'MyAadhar.pdf' As [FileName], 'Pending for verification' As Status, '' As ThumbImg, '1' As flgStatus, '1' As flgUpload, '0' As flgUrgent
	--Union
	--SELECT '4' As DocMappingId, '4' As DocTypeId, 'Police Verification Form' as Document,'PVF.pdf' As SampleFileName, '' As [FileName], 'Pending for uploading' As Status, '' As ThumbImg, '0' As flgStatus, '1' As flgUpload, '1' As flgUrgent
END
  TotalExp,
	FullName+ ' '+CityName+ ' '+IndustryType+' '+Skill+' '+FunctionArea AS strSearch
	FROM [#tmpSubscriber]
END

  
  ClientSaveSubscriberInterview
@JobSubscriberMapID BIGINT, @LoginID BIGINT, @RoleID INT, @UserID BIGINT, @InterviewTime DATETIME
AS
DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()

IF NOT EXISTS(SELECT * FROM [tblJobInterviewStatus] WHERE JobSubscriberMapID = @JobSubscriberMapID)
	BEGIN
		INSERT INTO [tblJobInterviewStatus](JobSubscriberMapID,InterviewTime, InterviewScheduledOn,TimestampIns, LoginIDIns) VALUES(@JobSubscriberMapID, @InterviewTime,@dt,@dt,@LoginID)
	END
ELSE
		UPDATE [tblJobInterviewStatus] SET InterviewTime = @InterviewTime,InterviewScheduledOn = @dt,
		TimestampUpd =@dt, LoginIDUpd = @LoginID WHERE JobSubscriberMapID = @JobSubscriberMapID
GO

-- ============ spSubscriberGetCVToDisplay ============
CREATE PROC [dbo].[spSubscriberGetCVToDisplay]
@LoginID BIGINT,@UserID BIGINT, @SubscriberID BIGINT, @RoleID INT=2
AS
BEGIN

DECLARE @Skills VARCHAR(200)
SELECT a.SubscriberID, c.TagName INTO #tmpTags 
FROM tblSubscriberTags a INNER JOIN tblMstrTags c ON a.TagID = c.TagID WHERE SubscriberID = @SubscriberID


SELECT   
@Skills = STUFF((SELECT DISTINCT ' ' + t2.TagName FROM #tmpTags t2 WHERE t2.SubscriberID = t1.SubscriberID FOR XML PATH('')),1,1,'')
FROM #tmpTags t1 

CREATE TABLE [#Personl]([Name] VARCHAR(100),MobileNo VARCHAR(20),DOB VARCHAR(20),Gender VARCHAR(10),[Address] VARCHAR(500),CVPath VARCHAR(500),PhotoName VARCHAR(1000),
TotalExp VARCHAR(100),CurrentCTC VARCHAR(100),flgReadyToRelocate VARCHAR(10),NoticePeriod VARCHAR(10),IndustryType VARCHAR(100),EmailID VARCHAR(100),
City VARCHAR(100),Skill VARCHAR(100),[Function] VARCHAR(100),Skills VARCHAR(1000))

IF @RoleID = 2
	INSERT INTO        [#Personl]
	SELECT CASE WHEN ISNULL(a.FullName,'')= '' THEN a.MobileNo1 ELSE a.FullName END AS Name, a.MobileNo1 AS MobileNo, CASE WHEN YEAR(DOB) = 1900 THEN '' ELSE FORMAT(DOB, 'dd-MMM-yyyy') END AS DOB, 
	CASE WHEN a.Gender = 'M' THEN 'Male' WHEN a.Gender = 'F' THEN 'Female' ELSE 'Others' END AS Gender
	, a.AddressLine1 AS Address, a.CVPath, dbo.fncGetDocumentFolder(20)+a.PhotoName, a.TotalExp, FORMAT(a.CurrentCTC,'N0','en-in') AS CurrentCTC, 
					  a.flgReadyToRelocate, a.NoticePeriod, i.IndustryType, a.EmailID, c.Descr AS City, 
					  s.Descr AS Skill, f.Descr AS [Function],@Skills AS Skills
	
	FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
					  tblMstrCily AS b ON a.CityID = b.CityID LEFT OUTER JOIN
					  tblMstrIndustryType AS i ON a.IndustryTypeID = i.IndustryTypeID LEFT OUTER JOIN
					  tblMstrCily AS c ON a.CityID = c.CityID LEFT OUTER JOIN
					  tblMstrSkills AS s ON a.SkillID = s.SkillID LEFT OUTER JOIN
					  tblMstrFunctions AS f ON a.SubFunctionID = f.FunctionID
	WHERE  (a.SubscriberID = @SubscriberID)
ELSE 
	INSERT INTO        [#Personl]
	SELECT a.FullName AS Name, a.MobileNo1 AS MobileNo, CASE WHEN YEAR(DOB) = 1900 THEN '' ELSE FORMAT(DOB, 'dd-MMM-yyyy') END AS DOB, 
	CASE WHEN a.Gender = 'M' THEN 'Male' WHEN a.Gender = 'F' THEN 'Female' ELSE 'Others' END AS Gender
	, a.AddressLine1 AS Address, [dbo].[fncGetDocumentFolder](1)+a.CVPath AS CVPath, [dbo].[fncGetDocumentFolder](1)+a.PhotoName AS PhotoName, a.TotalExp, FORMAT(a.CurrentCTC,'N0','en-in') AS CurrentCTC, 
					  a.flgReadyToRelocate, a.NoticePeriod, i.IndustryType, a.EmailID, c.Descr AS City, 
					  s.Descr AS Skill, f.Descr AS [Function],@Skills AS Skills
	
	FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
					  tblMstrCily AS b ON a.CityID = b.CityID LEFT OUTER JOIN
					  tblMstrIndustryType AS i ON a.IndustryTypeID = i.IndustryTypeID LEFT OUTER JOIN
					  tblMstrCily AS c ON a.CityID = c.CityID LEFT OUTER JOIN
					  tblMstrSkills AS s ON a.SkillID = s.SkillID LEFT OUTER JOIN
					  tblMstrFunctions AS f ON a.SubFunctionID = f.FunctionID
	WHERE  (a.SubscriberID = @SubscriberID)


SELECT * FROM #Personl

SELECT b.DegreeName AS Course, c.DegreeName AS Degree, c.HighestSeq
FROM     tblSubscriberEducation AS a INNER JOIN
                  tblMstrCourse AS b ON a.CourseTypeID = b.DegreeID INNER JOIN
                  tblMstrDegreeType AS c ON b.EducationTypeID = c.DegreeTypeID
WHERE  (a.SubscriberID = @SubscriberID)
ORDER BY c.HighestSeq DESC

	SELECT CertificateName
	FROM     tblSubscriberCertificate
	WHERE  (SubscriberID = @SubscriberID)

	SELECT a.Employer, FORMAT(a.JoiningDate, 'dd-MMM-yyyy') AS JoiningDate, CASE WHEN flgCurrent = 1 THEN '' ELSE FORMAT(ReleavingDate, 'dd-MMM-yyyy') END AS ReleavingDate, a.flgCurrent, a.SubscriberEmployerID, 
                  a.JobDescr AS Responsibilities, '' AS Designation
FROM     tblSubscriberEmployer AS a --INNER JOIN
                  --tblMstrDesignation AS b ON a.DesignationID = b.DesignationID
WHERE  (a.SubscriberID = @SubscriberID) ORDER BY 2 DESC  

	select b.Descr AS City 
	FROM tblSubscriberPrefferedLocations a INNER JOIN tblMstrCily b ON a.CityID = b.CityID
	WHERE SubscriberID = @SubscriberID
END
GO

-- ============ spSubscriberGetSubscriberForListing ============
CREATE PROC [dbo].[spSubscriberGetSubscriberForListing]
@RoleID INT,@UserID BIGINT, @LoginID BIGINT, 
@CityID udt_ContactDetails READONLY,
@SkillID udt_ContactDetails READONLY,
@MinMaxExp udt_exp READONLY,
@DegreeTypeID udt_ContactDetails READONLY,
@FunctionAreaID udt_ContactDetails READONLY, 
@Gender udt_Gender READONLY--M/F/T
AS
BEGIN
	CREATE TABLE #Skill(SkillID INT)
	CREATE TABLE #City(CityID INT)
	CREATE TABLE #DegreeTypeID(DegreeTypeID INT)
	CREATE TABLE #FunctionAreaID(FunctionAreaID INT)
	CREATE TABLE #Gender(Gender CHAR(1))
	CREATE TABLE #Exp(MinExp INT, MAXExp INT)

	IF EXISTS(SELECT * FROM @SkillID)
		INSERT INTO #Skill SELECT ClientContactsID FROM @SkillID
	ELSE
		INSERT INTO #Skill SELECT SkillID FROM tblMstrSkills
	IF EXISTS(SELECT * FROM @CityID)
		INSERT INTO #City SELECT ClientContactsID FROM @CityID
	ELSE
		INSERT INTO #City SELECT CityID FROM tblMstrCily
	IF EXISTS(SELECT * FROM @DegreeTypeID)
		INSERT INTO #DegreeTypeID SELECT ClientContactsID FROM @DegreeTypeID
	ELSE
		INSERT INTO #DegreeTypeID SELECT DegreeTypeID FROM tblMstrDegreeType
	IF EXISTS(SELECT * FROM @FunctionAreaID)
		INSERT INTO #FunctionAreaID SELECT ClientContactsID FROM @FunctionAreaID
	ELSE
		INSERT INTO #FunctionAreaID SELECT SubFunctionID FROM tblMstrSubFunctions
	IF EXISTS(SELECT * FROM @Gender)
		INSERT INTO #Gender SELECT gender FROM @Gender
	ELSE
		INSERT INTO #Gender VALUES('M'),('F'),('T')
	IF EXISTS(SELECT * FROM @MinMaxExp)
		INSERT INTO #Exp SELECT MinExp,MaxExp FROM @MinMaxExp
	ELSE
		INSERT INTO #Exp VALUES(0,99)


	CREATE TABLE #SubscriberIDs(SubscriberID BIGINT)
	IF @RoleID = 2
		INSERT INTO #SubscriberIDs
		SELECT SubscriberID FROM tblSubscriberJobStatusLatest WHERE JobMapStatusID IN(1,3)
	ELSE IF @RoleID = 3
		INSERT INTO #SubscriberIDs
		SELECT SubscriberID FROM tblSubscriberJobStatusLatest WHERE JobMapStatusID IN(4)		
		
SELECT DISTINCT a.SubscriberID, CASE WHEN ISNULL(a.FullName,'') = '' THEN a.MobileNo1 ELSE  a.FullName END AS FullName, b.Descr AS FunctionArea, c.Descr AS CityName, c.CityID, s.Descr AS Skill, dbo.fncGetDocumentFolder(20)+a.PhotoName AS PhotoName, I.IndustryType, a.TotalExp,
ISNULL(FullName,'')+ ' '+ISNULL(c.Descr,'')+ ' '+ISNULL(IndustryType,'')+' '+ISNULL(s.Descr,'')+' '+ISNULL(b.Descr,'') AS strSearch, CASE WHEN cv.flgCVUploaded = 1 THEN 'CV Uplaoded' ELSE 'CV not Uploaded' END AS CVStatus
INTO #subscribers
FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
                  tblMstrFunctions AS b ON a.SubFunctionID = b.FunctionID LEFT OUTER JOIN
                  tblMstrCily AS c ON c.CityID = a.CityID LEFT OUTER JOIN
                  tblMstrSkills AS s ON s.SkillID = a.SkillID LEFT OUTER JOIN
                  tblMstrIndustryType AS I ON I.IndustryTypeID = a.IndustryTypeID INNER JOIN
                  [#Skill] AS sk ON sk.SkillID = s.SkillID INNER JOIN
                  [#City] AS ct ON ct.CityID = a.CityID INNER JOIN
                  [#Gender] AS g ON g.Gender = a.Gender INNER JOIN
                  tblSubscriberEducation AS ed ON a.SubscriberID = ed.SubscriberID INNER JOIN
                  [#DegreeTypeID] AS dt ON dt.DegreeTypeID = ed.DegreeID INNER JOIN
                  [#FunctionAreaID] AS FA ON fa.FunctionAreaID = a.SubFunctionID INNER JOIN
                  [#Exp] AS ex ON a.TotalExp BETWEEN ex.MinExp AND ex.MAXExp INNER JOIN tblSubscriberRegistration cv
				  ON a.SubscriberID  =cv.SubscriberID
				  INNER JOIN #SubscriberIDs sub ON a.SubscriberID = sub.SubscriberID

DECLARE @Skills VARCHAR(200)
SELECT a.SubscriberID, c.TagName INTO #tmpTags 
FROM tblSubscriberTags a INNER JOIN #SubscriberIDs b ON a.SubscriberID = b.SubscriberID INNER JOIN tblMstrTags c ON
a.TagID = c.TagID

CREATE TABLE #Tags(SubscriberID BIGINT,Tags VARCHAR(200))

INSERT INTO #Tags
SELECT SubscriberID,  
STUFF((SELECT DISTINCT ' ' + t2.TagName FROM #tmpTags t2 WHERE t2.SubscriberID = t1.SubscriberID FOR XML PATH('')),1,1,'')
FROM #tmpTags t1 GROUP BY SubscriberID

SELECT  DISTINCT a.SubscriberID, a.FullName, a.FunctionArea, a.CityName, a.Skill, a.PhotoName, a.IndustryType, a.TotalExp,
a.strSearch+' '+CVStatus+' '+b.Tags AS strSearch, a.CVStatus,b.Tags
FROM #subscribers a LEFT OUTER JOIN #Tags b ON a.SubscriberID = b.SubscriberID

--select * FROM #tmpTags

END

  t * FROM #tmpTags

END

  ROM #tmpTags

END

  or:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================

CREATE PROCEDURE [dbo].[spSubscriberUploadDoc]
	@SubscriberID BIGINT, @RoleID INT=1, @UserID bigint=0, @LoginID BIGINT, 
	@Docs udt_keyPair READONLY
	--@UploadedDocStr varchar(100)  --DocMappingId^FileName|
AS
BEGIN	
	DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime]()

	INSERT INTO tblCandidateDocumentUploaded (DocumentMapID,SubscriberID,DocumentTypeID,DocumentPath,
	flgStatus,TimestampIns,LoginIDIns)
	SELECT b.DocumentMapID,@SubscriberID,b.DocumentTypeID,a.strValue,1,@dt,@LoginID
	FROM @Docs a INNER JOIN tblCandidateDocumentMap b ON a.id = b.DocumentTypeID
	WHERE b.SubscriberID = @SubscriberID

	INSERT INTO tblCandidateDocumentStatus(DocUploadID,StatusID,UserID,TimestampIns,LoginIDIns)
	SELECT  a.DocUploadID,17,@UserID,@dt, @LoginID
	FROM tblCandidateDocumentUploaded a INNER JOIN @Docs b ON a.DocumentTypeID = b.id
	WHERE a.SubscriberID = @SubscriberID

	IF EXISTS(SELECT * FROM @Docs WHERE id=1)
		BEGIN
			DECLARE @CV VARCHAR(500)
			SELECT @cv = strValue FROM @Docs WHERE id=1 
			UPDATE tblSubscriberCVDetails SET CVPath  =@CV WHERE SubscriberID = @SubscriberID

			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 3,TimestampIns = @dt WHERE SubscriberID = @SubscriberID AND JobMapStatusID = 1
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns])
			VALUES(@SubscriberID,3,@UserID,@dt)
		END

	select 1 as result
END
  t1 GROUP BY SubscriberID

SELECT  DISTINCT a.SubscriberID, a.FullName, a.FunctionArea, a.CityName, a.Skill, a.PhotoName, a.IndustryType, a.TotalExp,
a.strSearch+' '+b.Tags AS strSearch, a.CVStatus,b.Tags
FROM #subscribers a LEFT OUTER JOIN #Tags b ON a.SubscriberID = b.SubscriberID

select * FROM #tmpTags

END

  mG!ûÕ	ÜH"¬  ` Ò >
GO

-- ============ spSubscriberInterviews ============
CREATE PROCEDURE [dbo].[spSubscriberInterviews]
	@EmpNodeId BIGINT, @RoleID INT=1, @UserID bigint=0,	@LoginID BIGINT
AS
BEGIN	

	
	SELECT d.ClientName AS SearchText, a.JobSubscriberMapID AS InterviewMappingId, c.ClientID AS CompanyId, d.ClientName AS Company,
	FORMAT(a.InterviewTime, 'dd-MMM-yyyy hh:mm tt') AS [Schedule At], e.Descr AS Mode, 
					  a.InterviewLocation AS [Location],st.Descr as [Status],
					  CASE WHEN s.JobMapStatusID = 8 THEN 1 ELSE 0 END AS flgReschedule
					  
	--INTO        [#tmp]
	FROM     tblJobInterviewStatus AS a INNER JOIN
					  tblJobSubscriberMapping AS b ON a.JobSubscriberMapID = b.JobSubscriberMapID INNER JOIN
					  tblClientJobs AS c ON c.JobID = b.JobID INNER JOIN
					  tblClientMstr AS d ON d.ClientID = c.ClientID INNER JOIN
					  tblMstrInterviewMode AS e ON e.InterviewModeID = a.InterviewModeID INNER JOIN tblSubscriberJobStatusLatest s ON
					  a.JobSubscriberMapID = s.JobSubscriberMapID INNER JOIN tblMstrStatus st ON s.JobMapStatusID = st.StatusID
	WHERE b.SubscriberID = @EmpNodeId AND s.JobMapStatusID IN(8,9,10,11,12,13,14,29)


	--SELECT a.JobSubscriberMapID,c.Descr,a.JobMapStatusID INTO #STS
	--FROM tblJobSubscriberStatus a INNER JOIN 
	--(SELECT a.JobSubscriberMapID,MAX(StatusID) AS StatusID
	--FROM [#tmp] a INNER JOIN tblJobSubscriberStatus b ON a.JobSubscriberMapID = b.JobSubscriberMapID GROUP BY a.JobSubscriberMapID) b ON 
	--a.StatusID = b.StatusID INNER JOIN tblMstrJobMappingStatus c ON a.JobMapStatusID = c.JobMapStatusID
	

	--SELECT a.ClientName AS SearchText,a.JobSubscriberMapID AS InterviewMappingId,a.ClientID AS CompanyId,a.ClientName AS Company,
	--a.[Schedule At],a.Mode,a.InterviewLocation AS Location,b.Descr AS [Status],
	--CASE WHEN b.JobMapStatusID = 3 THEN 1 ELSE 0 END as flgReschedule
	--FROM [#tmp] a INNER JOIN #STS b ON a.JobSubscriberMapID = b.JobSubscriberMapID
END
  uthor,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[spSubscriberRescheduleReq]
	@EmpNodeId BIGINT, @InterviewMappingId BIGINT, @RoleID INT=1, @UserID bigint=0, @LoginID BIGINT, @SlotDate DATETIME
AS
BEGIN	
	DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime]()
	IF EXISTS(SELECT * FROM tblSubscriberJobStatusLatest WHERE JobSubscriberMapID = @InterviewMappingId AND JobMapStatusID = 8)
		BEGIN
			UPDATE tblJobInterviewStatus SET PraposedTime = @SlotDate WHERE JobSubscriberMapID = @InterviewMappingId
			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 9 WHERE JobSubscriberMapID = @InterviewMappingId 
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,JobID,ClientID,JobSubscriberMapID,StatusID,UserID,TimestampIns,LoginIDIns)
			SELECT SubscriberID, JobID, ClientID,JobSubscriberMapID, JobMapStatusID,@UserID, @dt, @LoginID
			FROM tblSubscriberJobStatusLatest WHERE JobSubscriberMapID = @InterviewMappingId
		END
END
0
GO

-- ============ spSubscriberRegistration ============
CREATE PROC [dbo].[spSubscriberRegistration]
@MobileNo VARCHAR(20),
@IpAddress VARCHAR(12)
AS
BEGIN
	
	SET @MobileNo = REPLACE(@MobileNo,'+91','')
	DECLARE @SubscriberID BIGINT = 0, @FullName VARCHAR(100)='', @RoleID INT=1, @UserID INT=0,	@LoginID BIGINT,
	@NodeType INT=100, @flgOld TINYINT=0
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()

	Select @SubscriberID = SubscriberID	FROM tblSubscriberRegistration WHERE RegistrationMobileNo = LTRIM(RTRIM(@MobileNo))

	IF @SubscriberID = 0
		BEGIN
			INSERT INTO tblSubscriberRegistration(RegistrationCountryCode,RegistrationMobileNo,RegistrationIPNo,RegistrationDateTime,
			flgstatus,flgCVUploaded)
			VALUES('91',LTRIM(RTRIM(@MobileNo)),@IpAddress,@dt,0,0)
			SET @SubscriberID = SCOPE_IDENTITY()
			INSERT INTO tblSubscriberCVDetails(SubscriberID,MobileNo1,LoginIDIns,TimestampIns)
			VALUES(@SubscriberID,@MobileNo,1,@dt)

			INSERT INTO tblSubscriberJobStatusLatest (ClientID,JobID,JobSubscriberMapID,JobMapStatusID,TimestampIns,flgClose,SubscriberID,flgApprovedByQC)
			VALUES(0,0,0,1,@dt,0,@SubscriberID,0)

			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[TimestampIns])
			VALUES(@SubscriberID,1,@dt)
		END
	ELSE
		BEGIN
			Select @FullName = [FullName]  FROM tblSubscriberCVDetails WHERE SubscriberID = @SubscriberID
			IF ISNULL(@FullName,'')<>''
				SET @FullName = @MobileNo
				SET @flgOld = 1
		END
	
	INSERT INTO tblsecuserlogin(UserID,LoginTime,Logouttime,SessionID,IPAddress,IsSessionEnd,NodeID,NodeType)
	VALUES(0,@dt,NULL,NULL,@IpAddress,0,@SubscriberID,@NodeType)
	SET @LoginID = SCOPE_IDENTITY()

	SELECT @SubscriberID AS SubscriberID, @FullName AS FullName, @LoginID AS LoginID, @RoleID AS RoleID, @SubscriberID AS UserID,@NodeType AS NodeType, @flgOld AS flgOld

END0
GO

-- ============ spSubscriberRescheduleReq ============
CREATE PROCEDURE [dbo].[spSubscriberRescheduleReq]
	@EmpNodeId BIGINT, @InterviewMappingId BIGINT, @RoleID INT=1, @UserID bigint=0, @LoginID BIGINT, @SlotDate DATETIME
AS
BEGIN	
	DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime]()
	IF EXISTS(SELECT * FROM tblSubscriberJobStatusLatest WHERE JobSubscriberMapID = @InterviewMappingId AND JobMapStatusID = 8)
		BEGIN
			UPDATE tblJobInterviewStatus SET PraposedTime = @SlotDate WHERE JobSubscriberMapID = @InterviewMappingId
			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 9 WHERE JobSubscriberMapID = @InterviewMappingId 
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,JobID,ClientID,JobSubscriberMapID,StatusID,UserID,TimestampIns,LoginIDIns)
			SELECT SubscriberID, JobID, ClientID,JobSubscriberMapID, JobMapStatusID,@UserID, @dt, @LoginID
			FROM tblSubscriberJobStatusLatest WHERE JobSubscriberMapID = @InterviewMappingId
		END
	select '1'
END
  D INNER JOIN
					  tblMstrInterviewMode AS e ON e.InterviewModeID = a.InterviewModeID INNER JOIN tblSubscriberJobStatusLatest s ON
					  a.JobSubscriberMapID = s.JobSubscriberMapID INNER JOIN tblMstrStatus st ON s.JobMapStatusID = st.StatusID
	WHERE b.SubscriberID = @EmpNodeId AND s.JobMapStatusID IN(8,9,10,11,12)


	--SELECT a.JobSubscriberMapID,c.Descr,a.JobMapStatusID INTO #STS
	--FROM tblJobSubscriberStatus a INNER JOIN 
	--(SELECT a.JobSubscriberMapID,MAX(StatusID) AS StatusID
	--FROM [#tmp] a INNER JOIN tblJobSubscriberStatus b ON a.JobSubscriberMapID = b.JobSubscriberMapID GROUP BY a.JobSubscriberMapID) b ON 
	--a.StatusID = b.StatusID INNER JOIN tblMstrJobMappingStatus c ON a.JobMapStatusID = c.JobMapStatusID
	

	--SELECT a.ClientName AS SearchText,a.JobSubscriberMapID AS InterviewMappingId,a.ClientID AS CompanyId,a.ClientName AS Company,
	--a.[Schedule At],a.Mode,a.InterviewLocation AS Location,b.Descr AS [Status],
	--CASE WHEN b.JobMapStatusID = 3 THEN 1 ELSE 0 END as flgReschedule
	--FROM [#tmp] a INNER JOIN #STS b ON a.JobSubscriberMapID = b.JobSubscriberMapID
END
GO

-- ============ spSubscriberUploadDoc ============
CREATE PROCEDURE [dbo].[spSubscriberUploadDoc]
	@SubscriberID BIGINT, @RoleID INT=1, @UserID bigint=0, @LoginID BIGINT, 
	@Docs udt_keyPair READONLY
	--@UploadedDocStr varchar(100)  --DocMappingId^FileName|
AS
BEGIN	
	DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime]()

	INSERT INTO tblCandidateDocumentUploaded (DocumentMapID,SubscriberID,DocumentTypeID,DocumentPath,
	flgStatus,TimestampIns,LoginIDIns)
	SELECT b.DocumentMapID,@SubscriberID,b.DocumentTypeID,a.strValue,1,@dt,@LoginID
	FROM @Docs a INNER JOIN tblCandidateDocumentMap b ON a.id = b.DocumentTypeID
	WHERE b.SubscriberID = @SubscriberID

	INSERT INTO tblCandidateDocumentStatus(DocUploadID,StatusID,UserID,TimestampIns,LoginIDIns)
	SELECT  a.DocUploadID,17,@UserID,@dt, @LoginID
	FROM tblCandidateDocumentUploaded a INNER JOIN @Docs b ON a.DocumentTypeID = b.id
	WHERE a.SubscriberID = @SubscriberID

	IF EXISTS(SELECT * FROM @Docs WHERE id=1)
		BEGIN
			DECLARE @CV VARCHAR(500)
			SELECT @cv = strValue FROM @Docs WHERE id=1 
			UPDATE tblSubscriberCVDetails SET CVPath  =@CV WHERE SubscriberID = @SubscriberID

			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 3,TimestampIns = @dt WHERE SubscriberID = @SubscriberID AND JobMapStatusID = 1
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns])
			VALUES(@SubscriberID,3,@UserID,@dt)
		END

	select 1 as result
END
  t1 GROUP BY SubscriberID

SELECT  DISTINCT a.SubscriberID, a.FullName, a.FunctionArea, a.CityName, a.Skill, a.PhotoName, a.IndustryType, a.TotalExp,
a.strSearch+' '+b.Tags AS strSearch, a.CVStatus,b.Tags
FROM #subscribers a LEFT OUTER JOIN #Tags b ON a.SubscriberID = b.SubscriberID

select * FROM #tmpTags

END

  mG!ûÕ	ÜH"¬  ` Ò >
GO

