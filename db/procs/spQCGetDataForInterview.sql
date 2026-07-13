CREATE PROC [dbo].[spQCGetDataForInterview]
@JobMapStatusID udt_MultipleBIGINTIds READONLY, @LoginID BIGINT, @RoleID INT, @UserID BIGINT, @JobID BIGINT
AS
BEGIN
	IF ISNULL(@JobID,0) = 0
		SET @JobID = NULL

	CREATE TABLE #MaxStatus(JobSubscriberMapID BIGINT,StatusID BIGINT, SubscriberID BIGINT,JobDescr VARCHAR(1000),ClientName VARCHAR(100))

	IF EXISTS(SELECT * FROM @JobMapStatusID)
		SELECT a.JobSubscriberMapID, a.JobMapStatusID, a.SubscriberID, j.JobDescr, c.ClientName
		FROM tblSubscriberJobStatusLatest a INNER JOIN @JobMapStatusID b ON a.JobMapStatusID = b.id INNER JOIN 
		tblClientJobs j ON j.JobID = a.JobID INNER JOIN tblClientMstr c ON c.ClientID = j.ClientID
		WHERE a.JobID = ISNULL(@JobID,a.JobID) AND a.flgClose=0 
	ELSE	
		SELECT a.JobSubscriberMapID, a.JobMapStatusID, a.SubscriberID, j.JobDescr, c.ClientName
		FROM tblSubscriberJobStatusLatest a INNER JOIN tblClientJobs j ON j.JobID = a.JobID
		INNER JOIN tblClientMstr c ON c.ClientID = j.ClientID
		WHERE a.JobID = ISNULL(@JobID,a.JobID) AND a.flgClose=0 AND a.JobMapStatusID IN(6,8,10)

	SELECT b.JobSubscriberMapID,d.FullName, d.PhotoName,b.JobDescr AS JobName, 
	FORMAT(s.InterviewTime,'yyyy-MM-dd HH:mm') AS InterviewTime, w.Descr AS InterviewMode, c.Descr AS JobStatus,
	b.ClientName,c.JobMapStatusID, d.FullName+' '+w.Descr+' '+c.Descr+' '+b.JobDescr+' '+b.ClientName+' '+
	FORMAT(s.InterviewTime,'yyyy-MM-dd HH:mm') AS strSearch
	FROM     tblJobSubscriberStatus AS a INNER JOIN
					  [#MaxStatus] AS b ON a.StatusID = b.StatusID INNER JOIN
					  tblMstrJobMappingStatus AS c ON c.JobMapStatusID = a.JobMapStatusID INNER JOIN
					  tblSubscriberCVDetails AS d ON d.SubscriberID = b.SubscriberID INNER JOIN
					  tblMstrCily AS e ON e.CityID = d.CityID INNER JOIN
					  tblMstrIndustryType AS i ON d.IndustryTypeID = i.IndustryTypeID INNER JOIN
					  tblMstrFunctions AS f ON d.SubFunctionID = f.FunctionID
					  LEFT OUTER JOIN [tblJobInterviewStatus] s ON a.JobSubscriberMapID = s.JobSubscriberMapID
					  LEFT OUTER JOIN [dbo].[tblMstrInterviewMode] w ON s.InterviewModeID = w.InterviewModeID
END
GO
