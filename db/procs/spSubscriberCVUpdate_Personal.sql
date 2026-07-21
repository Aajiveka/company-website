CREATE PROC [dbo].[spSubscriberCVUpdate_Personal]
@SubscriberID bigint,
@LoginID BIGINT,
@UserID bigint,
@RoleID INT,
@Name VARCHAR(100),
@MobileNo VARCHAR(20),
@DOB DATE,
@Gender VARCHAR(1),
@Email VARCHAR(100),
@Address VARCHAR(200),
@CVPath VARCHAR(200),
@Photo VARCHAR(500),
@CityID INT
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	IF EXISTS(SELECT * FROM tblSubscriberCVDetails WHERE SubscriberID = @SubscriberID)
		BEGIN
			UPDATE tblSubscriberCVDetails
			SET FullName = @Name,AddressLine1 = @Address,MobileNo1 = @MobileNo,DOB = @DOB,PhotoName = @Photo,Gender = @Gender, TimestampUpd = @dt,CVPath = @CVPath, EmailID = @Email,
			loginIDUpd = @LoginID, CityID = @CityID WHERE SubscriberID = @SubscriberID
		END
	ELSE
		BEGIN
			INSERT INTO tblSubscriberCVDetails(SubscriberID,FullName,AddressLine1,MobileNo1,DOB,Gender, TimestampIns, LoginIDIns,PhotoName,CVPath,EmailID)
			VALUES(@SubscriberID,@Name,@Address,@MobileNo,@DOB,@Gender,@dt, @LoginID,@Photo,@CVPath,@Email )
		END
	IF ISNULL(@CVPath,'')<>''
		BEGIN
			UPDATE tblSubscriberRegistration SET flgCVUploaded = 1 WHERE SubscriberID = @SubscriberID
			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 3,TimestampIns = @dt WHERE SubscriberID = @SubscriberID AND JobMapStatusID = 1
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns])
			VALUES(@SubscriberID,3,@UserID,@dt)
		END
	SELECT 1 AS flgSuccess
END
GO
