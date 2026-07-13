CREATE PROC spQC2GetMapDocumentsMaster
@ROleID BIGINT, @LoginID BIGINT,@ClientID BIGINT
AS
BEGIN
	
	SELECT a.JobID, a.JobDescr AS JobName 
	FROM tblClientJobs a INNER JOIN [tblSubscriberJobStatusLatest] b ON 
	a.JobID = b.JobID
	WHERE b.ClientID = ISNULL(@ClientID,b.ClientID) AND StatusID IN(16,17,20,22) AND b.flgClose=0

	SELECT * from tblMstrStatus WHERE StatusID IN(16,17,20,22)
END
GO
