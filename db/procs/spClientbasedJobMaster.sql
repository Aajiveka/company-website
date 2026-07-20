CREATE PROC [dbo].[spClientbasedJobMaster]
@ClientID BIGINT, @RoleID BIGINT, @LoginID BIGINT, @UserID BIGINT
AS
BEGIN
	IF @ClientID = 0
		SET @ClientID = NULL

	IF @ROleID = 4
		BEGIN
			select a.JobID, d.Descr AS JobName from tblSubscriberJobStatusLatest a INNER JOIN tblClientJobs J
			ON j.JobID = a.JobID INNER JOIN tblMstrDesignation d ON d.DesignationID = j.DesignationID
			WHERE a.JobMapStatusID IN(13) AND a.ClientID = @ClientID
		END
	ELSE
		BEGIN
			select a.JobID, d.Descr AS JobName from tblSubscriberJobStatusLatest a INNER JOIN tblClientJobs J
			ON j.JobID = a.JobID INNER JOIN tblMstrDesignation d ON d.DesignationID = j.DesignationID
			WHERE a.JobMapStatusID IN(15,22) AND a.ClientID = ISNULL(@ClientID, a.ClientID)
		END
END
GO
