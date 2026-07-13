-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[spSubscriberRescheduleReq]
	@EmpNodeId BIGINT, @InterviewMappingId BIGINT, @RoleID INT=1, @UserID bigint=0, @LoginID BIGINT, @SlotDate DATETIME
AS
BEGIN	
	DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime]()
	IF EXISTS(SELECT * FROM tblSubscriberJobStatusLatest WHERE JobSubscriberMapID = @InterviewMappingId AND JobMapStatusID = 8)
		BEGIN
			UPDATE tblJobInterviewStatus SET PraposedTime = @SlotDate WHERE JobSubscriberMapID = @InterviewMappingId
			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 9 WHERE JobSubscriberMapID = @InterviewMappingId 
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,JobID,ClientID,JobSubscriberMapID,StatusID,UserID,TimestampIns,LoginIDIns)
			SELECT SubscriberID, JobID, ClientID,JobSubscriberMapID, JobMapStatusID,@UserID, @dt, @LoginID
			FROM tblSubscriberJobStatusLatest WHERE JobSubscriberMapID = @InterviewMappingId
		END
	select '1'
END
GO
