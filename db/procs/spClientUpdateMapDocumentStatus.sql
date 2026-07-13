CREATE PROC [dbo].[spClientUpdateMapDocumentStatus]
@RoleID BIGINT, @LoginID BIGINT, @UserID BIGINT, @JobSubscriberMapID BigINT, @DocumentID int, @StatusID int, @Comments varchar 
AS
BEGIN
	--DECLARE @dt DATETIME= [dbo].[fnGetCurrentDateTime]()
	--DECLARE @SubscriberID BIGINT, @ClientID BIGINT, @JobID BIGINT
	
	--SELECT @SubscriberID = SubscriberID, @ClientID = ClientID, @JobID = JobID 
	--FROM tblSubscriberJobStatusLatest WHERE JobSubscriberMapID = @JobSubscriberMapID

	--INSERT INTO tblCandidateDocumentMap(SubscriberID,JobSubscriberMapID,DocumentTypeID,flgStatus,TimestampIns,LoginIDIns)
	--SELECT @SubscriberID,@JobSubscriberMapID,DegreeID,0,@dt,@LoginID
	--FROM @DocumentIds 

	--UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 15,TimestampIns = @dt 
	--WHERE JobSubscriberMapID = @JobSubscriberMapID

	--INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns],JobSubscriberMapID,ClientID,JobID)
	--VALUES(@SubscriberID, 15,@UserID,@dt,@JobSubscriberMapID, @ClientID,@JobID)

	Select 1 as flgSuccess
END
GO
