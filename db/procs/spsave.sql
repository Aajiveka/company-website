-- ============ spSaveInterview ============
CREATE PROC [dbo].[spSaveInterview]
@Interview [udt_JobInterview] READONLY, @LoginID BIGINT, @UserID BIGINT, @RoleID INT
AS
BEGIN
	
	DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime]()
	
	IF @RoleID = 4
		BEGIN
			INSERT INTO [tblJobInterviewStatus](JobSubscriberMapID,InterviewTime,InterviewScheduledOn,TimestampIns,LoginIDIns,InterviewModeID)
			SELECT a.JobSubscriberMapID, a.InterviewTime, @dt,@dt,@LoginID,a.InterviewModeID
			FROM @Interview a LEFT OUTER JOIN [tblJobInterviewStatus] b ON a.JobSubscriberMapID = b.JobSubscriberMapID
			WHERE b.JobSubscriberMapID IS NULL AND a.JobMapStatusID = 6
	
			UPDATE b SET InterviewModeID = a.InterviewModeID, InterviewTime = a.InterviewTime, TimestampUpd = @dt, LoginIDUpd = @LoginID
			FROM @Interview a LEFT OUTER JOIN [tblJobInterviewStatus] b ON a.JobSubscriberMapID = b.JobSubscriberMapID
			WHERE a.JobMapStatusID IN(7,8,10,11)

			UPDATE a SET JobMapStatusID = CASE WHEN a.JobMapStatusID = 6 THEN 7 WHEN a.JobMapStatusID = 10 THEN 11 END
			FROM tblSubscriberJobStatusLatest a INNER JOIN @Interview b ON a.JobSubscriberMapID = b.JobSubscriberMapID

		END
	ELSE IF @RoleID = 3
		BEGIN
			
			UPDATE a SET JobMapStatusID=8, TimestampIns = @dt
			FROM tblSubscriberJobStatusLatest a INNER JOIN @Interview b ON a.JobSubscriberMapID = b.JobSubscriberMapID
			WHERE a.JobMapStatusID IN(7,11)
			
			UPDATE a SET JobMapStatusID=10, TimestampIns = @dt
			FROM tblSubscriberJobStatusLatest a INNER JOIN @Interview b ON a.JobSubscriberMapID = b.JobSubscriberMapID
			WHERE a.JobMapStatusID = 9
		END

	INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns],JobID,ClientID,JobSubscriberMapID)
	SELECT a.SubscriberID, a.JobMapStatusID, @UserID, @dt, a.JobID, a.ClientID, a.JobSubscriberMapID
	FROM tblSubscriberJobStatusLatest a INNER JOIN @Interview b ON a.JobSubscriberMapID = b.JobSubscriberMapID


END<
GO

-- ============ spSaveInterviewStatus ============
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
0
GO

