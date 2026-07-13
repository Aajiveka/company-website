CREATE PROC [dbo].[spQC1GetDashboardData]
@StartDate DATE, @EndDate DATE,@CityID INT,@IndustryTypeID INT,@FunctionAreaID INT, @LoginID BIGINT,@UserID BIGINT, @RoleID INT
AS

BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	IF @StartDate IS NULL OR YEAR(@StartDate)=1900
		SET @StartDate = @DT
	IF @EndDate IS NULL OR YEAR(@EndDate)=1900
		SET @EndDate = @DT

	IF @CityID = 0
		SET @CityID = NULL
	IF @IndustryTypeID = 0
		SET @IndustryTypeID = NULL
	IF @FunctionAreaID = 0
		SET @FunctionAreaID = NULL

	select SubscriberID,RegistrationMobileNo as MobileNo,  CAST('' AS VARCHAR(100)) AS [Name],
	CAST('' AS VARCHAR(200)) AS CVName, flgCVUploaded, 0 as flgEducation, 0 AS flgExp 
	INTO #TMPSubscriber
	FROM tblSubscriberRegistration
	WHERE CAST(RegistrationDateTime AS DATE) BETWEEN @StartDate AND @EndDate AND flgstatus=0


	UPDATE b SET flgEducation = 1 FROM tblSubscriberEducation a INNER JOIN #TMPSubscriber b ON a.SubscriberID = b.SubscriberID

	UPDATE a SET Name = ISNULL(b.FullName,''), CVName = ISNULL(b.CVPath,'')
	FROM #TMPSubscriber a  LEFT OUTER JOIN tblSubscriberCVDetails b
	ON a.SubscriberID = b.SubscriberID 
	WHERE b.CityID = ISNULL(@CityID,b.CityID) AND b.SubFunctionID = ISNULL(@FunctionAreaID,b.SubFunctionID) AND
	b.IndustryTypeID = ISNULL(@IndustryTypeID,b.IndustryTypeID)

	UPDATE b SET flgExp = 1 FROM tblSubscriberEmployer a INNER JOIN #TMPSubscriber b ON a.SubscriberID = b.SubscriberID

	SELECT SubscriberID,MobileNo,[Name],dbo.fncGetDocumentFolder(1)+CVName AS CVName,CASE WHEN flgCVUploaded = 0 THEN 'CV not uploaded' END as CVStatus,
	CASE WHEN flgEducation = 0 THEN 'Education Not updated' END as EducationStatus,
	CASE WHEN flgExp = 0 THEN 'Employment Not updated' END as EmploymentStatus
	FROM #TMPSubscriber
END
GO
