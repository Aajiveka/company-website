CREATE PROC spSubscriberAppliedJobs
@SubscriberID BIGINT, @LoginID BIGINT, @RoleID INT
AS
BEGIN

	select * FROM tblJobSubscriberMapping


END
GO
