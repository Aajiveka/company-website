CREATE PROC spForgorPasswordValidateLink
@RefID BIGINT
AS
BEGIN
        DECLARE @LastTime DATETIME = '01-Jan-2023 12:12:12', @USerID BIGINT=0
        SELECT @LastTime = TimestampIns,@USerID = UserID FROM tblForgotPassword WHERE forgotPasswordID = @RefID
        
        IF ISNULL(@USerID,0) = 0
            SELECT -2 as flgStatus, @UserID AS UserID
        ELSE    
            BEGIN
                IF DATEDIFF(SECOND,@LastTime,GETDATE())<=1800
                    SELECT 1 AS flgStatus, @UserID AS UserID
                ELSE
                    SELECT -1 AS flgStatus, @UserID AS UserID
            END
END
GO
