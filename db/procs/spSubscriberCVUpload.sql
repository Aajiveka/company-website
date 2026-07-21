CREATE PROC [dbo].[spSubscriberCVUpload]
@SubscriberID BIGINT, @LoginID bigint, @UserID bigint, @ROleID INT, @CVFileName VARCHAR(200),
@CVPath VARCHAR(1000), @Name VARCHAR(100),@CityID VARCHAR(100),@DOB DATE, @MobileNo VARCHAR(10)
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()

	IF EXISTS(SELECT * FROM [tblSubscriberCVUploaded] WHERE SubscriberID = @SubscriberID)
		UPDATE [tblSubscriberCVUploaded] SET LatestCVPath = @CVPath,CVName = @CVFileName,
		LoginIDUpd = @LoginID,TImestampUpd = @dt WHERE SubscriberID = @SubscriberID
	ELSE
		INSERT INTO [tblSubscriberCVUploaded](SubscriberID,LatestCVPath,CVName,TimestampIns,LoginIDIns)
		VALUES(@SubscriberID,@CVPath,@CVFileName,@dt,@LoginID)

	IF NOT EXISTS(Select * FROM tblSubscriberCVDetails WHERE SubscriberID = @SubscriberID)
		INSERT INTO tblSubscriberCVDetails(SubscriberID,FullName,MobileNo1,CityID,DOB)
		VALUES(@SubscriberID,@Name,@MobileNo,@CityID,@DOB)
	ELSE
		UPDATE tblSubscriberCVDetails SET FullName = @Name,MobileNo1 = @MobileNo,CityID = @CityID,
		DOB = @DOB WHERE SubscriberID = @SubscriberID
	SELECT 1 as flgSuccess
END
GO
