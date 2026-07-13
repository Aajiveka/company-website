CREATE PROC [dbo].[spClientGetDataForInterview]
@JobMapStatusID udt_MultipleBIGINTIds READONLY, @LoginID BIGINT, @RoleID INT, @UserID BIGINT, @JobID BIGINT
AS
BEGIN

	CREATE TABLE #JobStatus(JobMapStatusID INT)
	IF @RoleID = 3
		IF NOT EXISTS(SELECT * FROM @JobMapStatusID WHERE id <>0)
			INSERT INTO #JobStatus VALUES(7),(9),(11)
		ELSE
			INSERT INTO #JobStatus Select id FROM @JobMapStatusID
	ELSE
		IF NOT EXISTS(SELECT * FROM @JobMapStatusID WHERE id <>0)
			INSERT INTO #JobStatus VALUES(6),(7),(10)
		ELSE
			INSERT INTO #JobStatus Select id FROM @JobMapStatusID

	IF ISNULL(@JobID,0) = 0
		SET @JobID = NULL

	CREATE TABLE #MaxStatus(JobSubscriberMapID BIGINT,JobMapStatusID BIGINT, SubscriberID BIGINT,JobDescr VARCHAR(1000))

	IF EXISTS(SELECT * FROM @JobMapStatusID WHERE id <> 0)
		INSERT INTO #MaxStatus
		SELECT a.JobSubscriberMapID, a.JobMapStatusID, a.SubscriberID, d.Descr AS JobDescr
		FROM tblSubscriberJobStatusLatest a INNER JOIN #JobStatus b ON a.JobMapStatusID = b.JobMapStatusID INNER JOIN 
		tblClientJobs j ON j.JobID = a.JobID INNER JOIN tblMstrDesignation d ON j.DesignationID = d.DesignationID
		WHERE a.JobID = ISNULL(@JobID,a.JobID) AND a.flgClose=0 AND flgApprovedByQC=1
	ELSE
		INSERT INTO #MaxStatus
		SELECT a.JobSubscriberMapID, a.JobMapStatusID, a.SubscriberID,  d.Descr AS JobDescr
		FROM tblSubscriberJobStatusLatest a INNER JOIN tblClientJobs j ON j.JobID = a.JobID
		INNER JOIN tblMstrDesignation d ON j.DesignationID = d.DesignationID
		WHERE a.JobID = ISNULL(@JobID,a.JobID) AND a.flgClose=0 AND a.JobMapStatusID IN(6, 7, 11) AND flgApprovedByQC=1
	
	--SELECT * FROM #MaxStatus
	
	SELECT b.JobSubscriberMapID,d.FullName, d.MobileNo1 AS Mobile,b.JobDescr AS JobName, 
	CASE WHEN b.JobMapStatusID = 10 THEN FORMAT(s.PraposedTime,'yyyy-MM-dd HH:mm') ELSE FORMAT(s.InterviewTime,'yyyy-MM-dd HH:mm') END AS
	InterviewTime, w.Descr AS InterviewMode, c.Descr AS JobStatus,
	b.JobMapStatusID, ISNULL(d.FullName,'')+' '+ISNULL(w.Descr,'')+' '+ISNULL(c.Descr,'')+' '+ISNULL(b.JobDescr,'')+' '+
	ISNULL(FORMAT(s.InterviewTime,'yyyy-MM-dd HH:mm'),'')AS strSearch, w.InterviewModeID
	FROM     [#MaxStatus] AS b INNER JOIN
					  tblMstrStatus AS c ON c.StatusID = b.JobMapStatusID INNER JOIN
					  tblSubscriberCVDetails AS d ON d.SubscriberID = b.SubscriberID INNER JOIN
					  tblMstrCily AS e ON e.CityID = d.CityID INNER JOIN
					  tblMstrIndustryType AS i ON d.IndustryTypeID = i.IndustryTypeID INNER JOIN
					  tblMstrFunctions AS f ON d.SubFunctionID = f.FunctionID
					  LEFT OUTER JOIN [tblJobInterviewStatus] s ON b.JobSubscriberMapID = s.JobSubscriberMapID
					  LEFT OUTER JOIN [dbo].[tblMstrInterviewMode] w ON s.InterviewModeID = w.InterviewModeID

	--select 10 AS JobSubscriberMapID,'Anuj Garg' AS FullName,'Test Job' AS JobName,
	--'10-May-202313:00' AS InterviewTime, 'Offline' AS InterviewMode,1 as InterviewModeID ,'Anuj Garg '+'Test Job '+'10-May-202313:00' AS strSearch, 1 AS JobMapStatusID

	if @RoleID = 4
		select '1' as buttonID, 'Schedule' AS buttontext
	ELSE if @RoleID = 3
		select '2' as buttonID, 'Send to Candidate' AS buttontext
		UNION
		select '3' as buttonID, 'Send to Client' AS buttontext

	--IF ISNULL(@JobID,0) = 0
	--	SET @JobID = NULL

	--CREATE TABLE #MaxStatus(JobSubscriberMapID BIGINT,StatusID BIGINT, SubscriberID BIGINT,JobDescr VARCHAR(1000))

	--IF EXISTS(SELECT * FROM @JobMapStatusID)
	--	SELECT a.JobSubscriberMapID, a.JobMapStatusID, a.SubscriberID, j.JobDescr
	--	FROM tblSubscriberJobStatusLatest a INNER JOIN @JobMapStatusID b ON a.JobMapStatusID = b.id INNER JOIN 
	--	tblClientJobs j ON j.JobID = a.JobID
	--	WHERE a.JobID = ISNULL(@JobID,a.JobID) AND a.flgClose=0 AND flgApprovedByQC=1
	--ELSE	
	--	SELECT a.JobSubscriberMapID, a.JobMapStatusID, a.SubscriberID, j.JobDescr
	--	FROM tblSubscriberJobStatusLatest a INNER JOIN tblClientJobs j ON j.JobID = a.JobID
	--	WHERE a.JobID = ISNULL(@JobID,a.JobID) AND a.flgClose=0 AND a.JobMapStatusID IN(2, 7, 3) AND flgApprovedByQC=1

	--SELECT b.JobSubscriberMapID,d.FullName, d.PhotoName,b.JobDescr AS JobName, 
	--FORMAT(s.InterviewTime,'yyyy-MM-dd HH:mm') AS InterviewTime, w.Descr AS InterviewMode, c.Descr AS JobStatus,
	--c.JobMapStatusID, d.FullName+' '+w.Descr+' '+c.Descr+' '+b.JobDescr+' '+
	--FORMAT(s.InterviewTime,'yyyy-MM-dd HH:mm')AS strSearch
	--FROM     tblJobSubscriberStatus AS a INNER JOIN
	--				  [#MaxStatus] AS b ON a.StatusID = b.StatusID INNER JOIN
	--				  tblMstrJobMappingStatus AS c ON c.JobMapStatusID = a.JobMapStatusID INNER JOIN
	--				  tblSubscriberCVDetails AS d ON d.SubscriberID = b.SubscriberID INNER JOIN
	--				  tblMstrCily AS e ON e.CityID = d.CityID INNER JOIN
	--				  tblMstrIndustryType AS i ON d.IndustryTypeID = i.IndustryTypeID INNER JOIN
	--				  tblMstrFunctions AS f ON d.SubFunctionID = f.FunctionID
	--				  LEFT OUTER JOIN [tblJobInterviewStatus] s ON a.JobSubscriberMapID = s.JobSubscriberMapID
	--				  LEFT OUTER JOIN [dbo].[tblMstrInterviewMode] w ON s.InterviewModeID = w.InterviewModeID
END
GO
