CREATE PROCEDURE [dbo].[spSaveInterviewStatus]
	@JobSubscriberMapID BIGINT, @StatusID INT, @Comments varchar, @LoginID BIGINT, @UserID BIGINT, @RoleID INT
AS
BEGIN
	DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime]()
	IF @StatusID = 1
		BEGIN
			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 14 WHERE JobSubscriberMapID = @JobSubscriberMapID
		END
	ELSE IF @StatusID = 2
		BEGIN
			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 13 WHERE JobSubscriberMapID = @JobSubscriberMapID
		END
	ELSE IF @StatusID = 3
		BEGIN
			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 29 WHERE JobSubscriberMapID = @JobSubscriberMapID
		END
	INSERT INTO [tblSubscriberStatusHistory] (SubscriberID,JobID,ClientID,JobSubscriberMapID,StatusID,UserID,comments,TimestampIns,LoginIDIns)
	SELECT SubscriberID, JobID,ClientID, JobSubscriberMapID, JobMapStatusID,@UserID,@Comments,@dt,@LoginID
	FROM tblSubscriberJobStatusLatest WHERE JobSubscriberMapID = @JobSubscriberMapID

	Select 1 AS flgResult
END
GO
