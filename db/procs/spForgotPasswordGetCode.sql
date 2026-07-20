CREATE PROC spForgotPasswordGetCode
@EmailID VARCHAR(100)
AS
BEGIN
        DECLARE @UserID BIGINT=-1, @RefID BIGINT=-1
        SELECT @UserID = UserID FROM tblSecUser WHERE UserName = @EmailID
        IF @UserID>1
            BEGIN
                INSERT INTO tblForgotPassword(USERID,TimestampIns) VALUES(@UserID, GETDATE())
                SET @RefID = SCOPE_IDENTITY()
            END

    SELECT @RefID AS RefID
END
GO
