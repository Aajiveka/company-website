CREATE PROC [dbo].[spQCGetInterviewMaster]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	CREATE TABLE #Clients(ClientID INT, ClientName VARCHAR(100))

	INSERT INTO #Clients
	EXEC [dbo].[spClientGetClintsofUser] @LoginID, @RoleID, @UserID


	IF @RoleID = 4
		BEGIN
			select * from tblMstrStatus WHERE StatusID IN(6,7,8,10,11)
	
			SELECT DISTINCT j.JobID, j.JobDescr
			FROM tblSubscriberJobStatusLatest a INNER JOIN #Clients b ON a.ClientID = b.ClientID INNER JOIN tblClientJobs J ON j.JobID = a.JobID
			WHERE a.JobMapStatusID IN(6,7,8,10,11) AND flgClose=0 AND flgApprovedByQC=0

		END
	ELSE IF @RoleID = 4
		BEGIN
			select * from tblMstrStatus WHERE StatusID IN(7,9,11)

			SELECT DISTINCT j.JobID, j.JobDescr
			FROM tblSubscriberJobStatusLatest a INNER JOIN #Clients b ON a.ClientID = b.ClientID INNER JOIN tblClientJobs J ON j.JobID = a.JobID
			WHERE a.JobMapStatusID IN(7,9,11) AND flgClose=0 AND flgApprovedByQC=0

		END


END
GO
