CREATE PROC [dbo].[spClientSaveSubscriberInterview]
@Interview udt_JobInterview READONLY, 
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	DECLARE @NewInterview udt_JobInterview,@OldInterview udt_JobInterview

	INSERT INTO @NewInterview
	SELECT a.*
	FROM @Interview a LEFT OUTER JOIN [tblJobInterviewStatus] b ON a.JobSubscriberMapID = b.JobSubscriberMapID
	WHERE b.JobSubscriberMapID IS NULL

	INSERT INTO @OldInterview
	SELECT a.*
	FROM @Interview a INNER JOIN [tblJobInterviewStatus] b ON a.JobSubscriberMapID = b.JobSubscriberMapID

	INSERT INTO [tblJobInterviewStatus](JobSubscriberMapID,InterviewTime, InterviewScheduledOn,TimestampIns, 
	LoginIDIns,InterviewModeID) 
	SELECT JobSubscriberMapID, InterviewTime,@dt,@dt,@LoginID,InterviewModeID
	FROM @NewInterview

	INSERT INTO tblJobSubscriberStatus(JobSubscriberMapID,JobMapStatusID,MappedbyUserID,MappedTimestamp,TimestampIns,LoginIDIns) 
	SELECT JobSubscriberMapID,3,@UserID,@dt,@dt,@LoginID FROM @NewInterview

	UPDATE a SET InterviewTime = b.InterviewTime,InterviewScheduledOn = @dt,
	TimestampUpd =@dt, LoginIDUpd = @LoginID,InterviewModeID  =b.InterviewModeID 
	FROM [tblJobInterviewStatus] a INNER JOIN @OldInterview b ON a.JobSubscriberMapID = b.JobSubscriberMapID

	INSERT INTO tblJobSubscriberStatus(JobSubscriberMapID,JobMapStatusID,MappedbyUserID,MappedTimestamp,TimestampIns,LoginIDIns) 
	SELECT JobSubscriberMapID,5,@UserID,@dt,@dt,@LoginID FROM @OldInterview

	UPDATE a SET JobMapStatusID = 8, TimestampIns=@dt 
	FROM tblSubscriberJobStatusLatest a INNER JOIN @OldInterview b ON a.JobSubscriberMapID = b.JobSubscriberMapID

	UPDATE a SET JobMapStatusID = 3, TimestampIns=@dt 
	FROM tblSubscriberJobStatusLatest a INNER JOIN @NewInterview b ON a.JobSubscriberMapID = b.JobSubscriberMapID

	INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns],JobID,ClientID,JobSubscriberMapID)
	SELECT b.SubscriberID, b.JobMapStatusID, @UserID, @dt,b.JobID, b.ClientID, b.JobSubscriberMapID
	FROM @OldInterview a INNER JOIN tblSubscriberJobStatusLatest b ON a.JobSubscriberMapID = b.JobSubscriberMapID

	INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns],JobID,ClientID,JobSubscriberMapID)
	SELECT b.SubscriberID, b.JobMapStatusID, @UserID, @dt,b.JobID, b.ClientID, b.JobSubscriberMapID
	FROM @NewInterview a INNER JOIN tblSubscriberJobStatusLatest b ON a.JobSubscriberMapID = b.JobSubscriberMapID
END
GO
