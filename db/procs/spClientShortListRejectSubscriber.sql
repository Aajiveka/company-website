CREATE PROC [dbo].[spClientShortListRejectSubscriber]
@SubscriberID BIGINT, @JobID BIGINT, @LoginID BIGINT, @RoleID INT, @flgShortlisytReject TINYINT --1: shortlist, 2: Reject
AS

BEGIN
	DECLARE @ClientID BIGINT, @UserID INT
	IF @RoleID = 3
		BEGIN
			IF NOT EXISTS(SELECT * FROM [dbo].[tblJobSubscriberMapping] WHERE SubscriberID = @SubscriberID AND JobID = @JobID)
				BEGIN
					DECLARE @dt DATETIME = GETDATE(), @JobSubscriberMapID BIGINT
					INSERT INTO [dbo].[tblJobSubscriberMapping](JobID,SubscriberID,MapDate,JobMapStatusID,TimestampIns,LoginIDIns)
					VALUES(@JobID, @SubscriberID,@dt, 1,@dt,@LoginID)
					SET @JobSubscriberMapID = SCOPE_IDENTITY()

					INSERT INTO tblJobSubscriberStatus(JobSubscriberMapID,JobMapStatusID,MappedbyUserID,MappedTimestamp,
					TimestampIns,LoginIDIns)
					VALUES(@JobSubscriberMapID,1,@SubscriberID,@dt,@dt,@LoginID)
			
					SELECT @ClientID = ClientID from tblClientJobs WHERE JobID = @JobID
					SELECT @UserID = UserID FROM tblSecUserLogin WHERE LoginID = @LoginID

					UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 5, flgApprovedByQC=1, ClientID = @ClientID, JobID = @JobID, JobSubscriberMapID = @JobSubscriberMapID 
					WHERE SubscriberID = @SubscriberID AND JobID = 0

					INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns],JobID,ClientID,JobSubscriberMapID)
					VALUES(@SubscriberID,5,@UserID,@dt,@JobID,@ClientID, @JobSubscriberMapID)
				END
		END
	ELSE IF @RoleID = 4
		BEGIN
			
					SELECT @ClientID = ClientID from tblClientJobs WHERE JobID = @JobID
					SELECT @UserID = UserID FROM tblSecUserLogin WHERE LoginID = @LoginID

					SELECT @JobSubscriberMapID = JobSubscriberMapID FROM tblSubscriberJobStatusLatest
					WHERE SubscriberID = @SubscriberID AND JobID = @JobID

					UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 6
					WHERE SubscriberID = @SubscriberID AND JobID = @JobID

					INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns],JobID,ClientID,JobSubscriberMapID)
					VALUES(@SubscriberID,6,@UserID,@dt,@JobID,@ClientID, @JobSubscriberMapID)
		END
END
GO
