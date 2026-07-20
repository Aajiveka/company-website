CREATE PROC [dbo].[spClientSaveMapDocumentsToCandiate]
@ROleID BIGINT, @LoginID BIGINT,@JobSubscriberMapID INT,@DocumentIds udt_Education READONLY, @UserID BIGINT
AS
BEGIN
	DECLARE @dt DATETIME= [dbo].[fnGetCurrentDateTime]()
	DECLARE @SubscriberID BIGINT, @ClientID BIGINT, @JobID BIGINT
	
	SELECT @SubscriberID = SubscriberID, @ClientID = ClientID, @JobID = JobID 
	FROM tblSubscriberJobStatusLatest WHERE JobSubscriberMapID = @JobSubscriberMapID

	INSERT INTO tblCandidateDocumentMap(SubscriberID,JobSubscriberMapID,DocumentTypeID,flgStatus,TimestampIns,LoginIDIns)
	SELECT @SubscriberID,@JobSubscriberMapID,DegreeID,0,@dt,@LoginID
	FROM @DocumentIds 

	UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 15,TimestampIns = @dt 
	WHERE JobSubscriberMapID = @JobSubscriberMapID

	INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns],JobSubscriberMapID,ClientID,JobID)
	VALUES(@SubscriberID, 15,@UserID,@dt,@JobSubscriberMapID, @ClientID,@JobID)

	Select 1 as flgSuccess
END
GO
