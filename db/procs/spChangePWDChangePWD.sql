CREATE PROC spChangePWDChangePWD
@USerID BIGINT, @Newpwd VARCHAR(10)
AS
BEGIN
	UPDATE tblSecUser SET Password = @Newpwd, PwdStatus=1 WHERE UserID  =@USerID
	select 1 as result
END
GO
