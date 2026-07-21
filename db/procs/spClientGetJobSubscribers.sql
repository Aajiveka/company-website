CREATE PROC [dbo].[spClientGetJobSubscribers]
@JobID BIGINT, @LoginID BIGINT, @RoleID INT, @UserID BIGINT, @flgAll TINYINT=1--0:All 1: Applied only
AS
BEGIN

	DECLARE @TOtal INT, @Shortlisted INT, @Rejected INT, @JobName VARCHAR(100)
	DECLARE @MinExp INT, @MaxExp INT,@MinCTC BIGINT, @MaxCTC BIGINT, @JobCityID INT, @IndustryID INT

	CREATE TABLE [#TMpFinal](SubscriberID BIGINT,JobStatus VARCHAR(100),FullName VARCHAR(100),
		City VARCHAR(50),JobMapStatusID INT,PhotoName VARCHAR(200),IndustryType VARCHAR(100),FunctionalArea VARCHAR(100),SubFunctionalArea VARCHAR(100))

	Select @JobName = c.Descr, @IndustryID = IndustryTypeID, @MaxCTC = ISNULL(MaxCTC,0), @MinCTC = ISNULL(MinCTC,999999999999999999), 
	@MaxExp = ISNULL(MaxEmp,0), @MinExp = ISNULL(MinCTC,99999)
	FROM tblClientJobs b INNER JOIN tblMstrDesignation c ON c.DesignationID = b.DesignationID 
	WHERE b.JobID = @JobID

	CREATE TABLE #tags(SubscriberID BIGINT, Tags VARCHAR(1000))

	
	IF ISNULL(@flgAll,0)<>0
		BEGIN
		
			INSERT INTO [#TMpFinal]
			SELECT L.SubscriberID, c.Descr AS JobStatus, d.FullName, e.Descr AS City, c.JobMapStatusID, dbo.fncGetDocumentFolder(20)+d.PhotoName, i.IndustryType, f.Descr AS FunctionalArea, sf.Descr AS SubFunction
			FROM     tblMstrSubFunctions AS sf INNER JOIN
							  tblMstrFunctions AS f ON sf.FunctionID = f.FunctionID INNER JOIN
							  tblSubscriberCVDetails d ON d.subFunctionID = sf.SubFunctionID INNER JOIN
							  tblSubscriberJobStatusLatest AS L ON d.SubscriberID = L.SubscriberID INNER JOIN
							  tblMstrJobMappingStatus AS c ON c.JobMapStatusID = L.JobMapStatusID INNER JOIN
							  tblMstrCily AS e ON e.CityID = d.CityID INNER JOIN
							  tblMstrIndustryType AS i ON d.IndustryTypeID = i.IndustryTypeID 
			WHERE -- (d.CurrentCTC BETWEEN @MinCTC AND @MaxCTC) AND (d.TotalExp BETWEEN @MinExp AND @MaxCTC) AND 
			(d.IndustryTypeID = @IndustryID)
			
		END
	ELSE
		BEGIN
		
			INSERT INTO [#TMpFinal]
			SELECT DISTINCT d.SubscriberID, 'Not Mapped' AS JobStatus, d.FullName, e.Descr AS City, 0 AS Expr1, dbo.fncGetDocumentFolder(20)+d.PhotoName, i.IndustryType, f.Descr AS FunctionalArea,
			sf.Descr
			FROM     tblSubscriberCVDetails AS d INNER JOIN
							  tblMstrCily AS e ON e.CityID = d.CityID INNER JOIN
							  tblMstrIndustryType AS i ON d.IndustryTypeID = i.IndustryTypeID LEFT OUTER JOIN
							  tblMstrSubFunctions SF ON sf.SubFunctionID = d.SubFunctionID LEFT OUTER JOIN
							  tblMstrFunctions AS f ON sf.FunctionID = f.FunctionID INNER JOIN
							  tblSubscriberJobStatusLatest L ON L.SubscriberID = d.SubscriberID
			WHERE L.JobID = @JobID AND L.flgClose = 0
		
		END


	Select @TOtal = COUNT(*) FROM #TMpFinal
	Select @Shortlisted = COUNT(*) FROM #TMpFinal WHERE JobMapStatusID IN(2)
	Select @Rejected = COUNT(*) FROM #TMpFinal WHERE JobMapStatusID IN(5)

	SELECT a.SubscriberID, c.TagName INTO #tmpTags 
	FROM tblSubscriberTags a INNER JOIN tblMstrTags c ON a.TagID = c.TagID INNER JOIN #TMpFinal s ON s.SubscriberID = a.SubscriberID

	INSERT INTO #tags
	SELECT   SubscriberID, STUFF((SELECT DISTINCT ' ' + t2.TagName FROM #tmpTags t2 WHERE t2.SubscriberID = t1.SubscriberID FOR XML PATH('')),1,1,'')
	FROM #tmpTags t1 GROUP BY SubscriberID

	
	SELECT @JobName AS JobName, @TOtal AS Total, @Shortlisted AS Shortlisted, @Rejected AS Rejected
	
	SELECT a.SubscriberID, JobStatus, FullName,City,PhotoName,IndustryType,FunctionalArea,SubFunctionalArea, b.Tags,
	a.FullName+' '+a.FunctionalArea+' '+a.IndustryType+' '+a.JobStatus+' '+a.SubFunctionalArea+' '+ISNULL(b.Tags,'') as strSearch
	FROM #TMpFinal a LEFT OUTER JOIN #tags b ON a.SubscriberID  =b.SubscriberID
END
GO
