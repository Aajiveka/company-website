CREATE PROC [dbo].[spClientGetDataForInterviewStatus]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT, @JobID BIGINT
AS
BEGIN

	--SELECT 11 AS JobSubscriberMapID,'Anuj Garg' AS FullName,'Test Job' AS JobName,'10-May-2023' AS InterviewTime,'1' AS InterviewStatus,'Anuj Garg, Test Job' AS strSearch

	IF @RoleID = 4
		BEGIN
			CREATE TABLE #Clients(ClientID INT, ClientName VARCHAR(100))
			INSERT INTO #Clients
			EXEC [dbo].[spClientGetClintsofUser] @LoginID,@RoleID, @UserID

			SELECT a.JobSubscriberMapID, s.FullName, d.Descr AS JobName, FORMAT(i.InterviewTime,'dd-MMM-yyyy HH:mm') AS InterviewTime,
			0 AS InterviewStatus, s.FullName+' '+ d.Descr+' '+FORMAT(i.InterviewTime,'dd-MMM-yyyy HH:mm') AS strSearch
			FROM tblSubscriberJobStatusLatest a INNER JOIN #Clients b ON a.ClientID = b.ClientID
			INNER JOIN tblClientJobs J ON J.JobID = a.JobID INNER JOIN tblMstrDesignation d ON d.DesignationID = J.DesignationID
			INNER JOIN tblSubscriberCVDetails S ON s.SubscriberID = a.SubscriberID INNER JOIN tblJobInterviewStatus i ON 
			i.JobSubscriberMapID = a.JobSubscriberMapID 
			WHERE a.JobMapStatusID IN(7,8) AND a.JobID = ISNULL(@JobID, a.JobID)

		END
END
GO
