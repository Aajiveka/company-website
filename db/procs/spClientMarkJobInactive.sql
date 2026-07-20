CREATE PROC spClientMarkJobInactive
@JobID bigint,
@LoginID bigint,
@UserID bigint,
@RoleID INT
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	UPDATE tblClientJobs SET StatusID = 2, TimestampUpd = @dt, LoginIDUpd = @LoginID WHERE JobID = @JobID
END
GO
