CREATE PROC [dbo].[spQC1ApproveRejectCandidate]
@RoleID BIGINT, @flgApproveReject TINYINT,--1: approve, 2:rject
@LoginID BIGINT,@SubscriberID BIGINT
AS
BEGIN
	DECLARE @UserID BIGINT
	SELECT @UserID = UserID from tblSecUserLogin WHERE LoginID = @LoginID
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()

	IF @flgApproveReject = 1
		BEGIN
			UPDATE [tblSubscriberJobStatusLatest] SET [JobMapStatusID] = 4, flgApprovedByQC=1 WHERE SubscriberID = @SubscriberID
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns])
			VALUES(@SubscriberID,4,@UserID,@dt)
		END
	ELSE
		BEGIN
			UPDATE [tblSubscriberJobStatusLatest] SET [JobMapStatusID] = 2, flgApprovedByQC=1 WHERE SubscriberID = @SubscriberID
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns])
			VALUES(@SubscriberID,2,@UserID,@dt)
		END
END
GO
