CREATE PROC [dbo].[spQC2GetMappedDocuments]
@RoleID INT, @LoginID BIGINT,@JobMapStatusID INT, @JobID BIGINT, @ClientID BIGINT
AS
BEGIN
	IF ISNULL(@JobID,0)=0
		SET @JobID = NULL
	IF ISNULL(@ClientID,0)=0
		SET @ClientID = NULL

	SELECT a.SubscriberID, b.FullName, j.JobDescr AS JobName, FORMAT(a.TimestampIns, 'dd-MMM-yyyy') AS SelectedOn, 
	b.FullName + ' ' + j.JobDescr +' '+ c.ClientName AS strSearch, a.JobSubscriberMapID,c.ClientName
	FROM     tblSubscriberJobStatusLatest AS a INNER JOIN
						tblSubscriberCVDetails AS b ON a.SubscriberID = b.SubscriberID INNER JOIN
						tblClientJobs AS j ON j.JobID = a.JobID INNER JOIN tblClientMstr c ON j.ClientID = c.ClientID
	WHERE  (a.JobMapStatusID = @JobMapStatusID) AND (a.ClientID = ISNULL(@ClientID,a.ClientID)
) AND 
	(a.JobID = ISNULL(@JobID, a.JobID)) AND a.flgClose=0

	SELECT a.JobSubscriberMapID, d.DocumentName
	FROM #tmpData a INNER JOIN tblCandidateDocumentMap b ON a.JobSubscriberMapID = b.JobSubscriberMapID
	INNER JOIN tblMstrDocuments d ON d.DocumentID = b.DocumentTypeID
END
GO
