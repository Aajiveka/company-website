CREATE PROC spQC1GetEditSubscriber
@SubscriberID BIGINT, @LoginID BIGINT,@UserID BIGINT, @RoleID INT
AS
BEGIN
	UPDATE tblSubscriberRegistration SET flgstatus = 1 WHERE SubscriberID = @SubscriberID
END
GO
