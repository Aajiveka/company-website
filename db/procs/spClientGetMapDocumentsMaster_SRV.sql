CREATE PROC [dbo].[spClientGetMapDocumentsMaster_SRV]
@ROleID BIGINT, @LoginID BIGINT, @UserID BIGINT, @ClientID BIGINT, @JobID BIGINT
AS
BEGIN
	IF @JobID = 0
		SET @JobID = NULL
	IF @ClientID = 0
		SET @ClientID = NULL

	IF @ROleID = 4
		BEGIN
			select DocumentID, DocumentName FROM tblMstrDocuments ORDER BY 2
			select a.JobID, d.Descr AS JobName from tblSubscriberJobStatusLatest a INNER JOIN tblClientJobs J
			ON j.JobID = a.JobID INNER JOIN tblMstrDesignation d ON d.DesignationID = j.DesignationID
			WHERE a.JobMapStatusID IN(13) AND a.ClientID = @ClientID AND a.JobID = ISNULL(@JobID,a.JobID)
		END
	ELSE
		BEGIN
			select DocumentID, DocumentName FROM tblMstrDocuments ORDER BY 2
			select a.JobID, d.Descr AS JobName from tblSubscriberJobStatusLatest a INNER JOIN tblClientJobs J
			ON j.JobID = a.JobID INNER JOIN tblMstrDesignation d ON d.DesignationID = j.DesignationID
			WHERE a.JobMapStatusID IN(15,22) AND a.ClientID = ISNULL(@ClientID, a.ClientID)
			AND a.JobID = ISNULL(@JobID,a.JobID)
		END
END
GO
