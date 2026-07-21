CREATE PROC [dbo].[spClientGetMapDocumentsToCandiate]
@ROleID BIGINT, @LoginID BIGINT, /*@JobMapStatusID INT,*/ @ClientID BIGINT, @JobID BIGINT
AS
BEGIN
	IF ISNULL(@JobID,0)=0
		SET @JobID = NULL

	--IF @JobMapStatusID = 13
	--	BEGIN
			SELECT a.SubscriberID, b.FullName, j.JobDescr AS JobName, FORMAT(a.TimestampIns, 'dd-MMM-yyyy') AS SelectedOn, b.FullName + ' ' + j.JobDescr AS strSearch, a.JobSubscriberMapID
			FROM     tblSubscriberJobStatusLatest AS a INNER JOIN
								tblSubscriberCVDetails AS b ON a.SubscriberID = b.SubscriberID INNER JOIN
								tblClientJobs AS j ON j.JobID = a.JobID
			WHERE  --(a.JobMapStatusID = @JobMapStatusID) AND 
			(a.ClientID = @ClientID) AND 
			(a.JobID = ISNULL(@JobID, a.JobID)) AND a.flgClose=0
		--END
	--ELSE IF @JobMapStatusID = 21
	--	BEGIN
	--		SELECT a.SubscriberID, b.FullName, j.JobDescr AS JobName, FORMAT(a.TimestampIns, 'dd-MMM-yyyy') AS SelectedOn, b.FullName + ' ' + j.JobDescr AS strSearch, a.JobSubscriberMapID
	--		INTO #tmpData
	--		FROM     tblSubscriberJobStatusLatest AS a INNER JOIN
	--							tblSubscriberCVDetails AS b ON a.SubscriberID = b.SubscriberID INNER JOIN
	--							tblClientJobs AS j ON j.JobID = a.JobID
	--		WHERE  (a.JobMapStatusID = @JobMapStatusID) AND (a.ClientID = @ClientID) AND 
	--		(a.JobID = ISNULL(@JobID, a.JobID)) AND a.flgClose=0

	--		SELECT a.JobSubscriberMapID, b.DocumentID
	--		FROM #tmpData a INNER JOIN tblCandidateJobDocumentMap b ON a.JobSubscriberMapID = b.JobSubscriberMapID
	--	END

END
GO
