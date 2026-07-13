CREATE PROC [dbo].[spClientGetJoblisting]
@ClientID BIGINT, @LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	IF @ClientID = 0
		SET @ClientID = NULL
		
	Select b.JobID,c.Descr AS Designation, d.Descr AS City,CASE WHEN b.StatusID=1 THEN 'Active' ELSE 'Closed' END as JobStatus, 
	FORMAT(b.TimestampIns,'dd-MMM-yyyy') AS CreationDate,b.TimestampIns INTO #JobDetail
	FROM tblClientJobs b 
	INNER JOIN tblMstrDesignation c ON c.DesignationID = b.DesignationID INNER JOIN tblMstrCily d ON d.CityID = b.JobCityID
	WHERE b.ClientID=ISNULL(@ClientID,b.ClientID)
	
	

	Select a.JobID, COUNT(*) as cnt INTO #JobCount 
	FROM tblSubscriberJobStatusLatest a INNER JOIN #JobDetail b ON a.JobID = b.JobID 
	WHERE a.flgClose=0 GROUP BY a.JobID


	SELECT a.JobID, a.Designation, a.City, CAST(ISNULL(b.cnt,0) AS VARCHAR)+' Applied' AS Applications,a.CreationDate, a.JobStatus,
	a.Designation+' '+a.City+' '+CAST(a.CreationDate AS VARCHAR)+' '+a.JobStatus AS strSearch
	FROM #JobDetail a LEFT OUTER JOIN #JobCount b ON a.JobID = b.JobID
	ORDER BY a.JobStatus,a.TimestampIns
END
GO
