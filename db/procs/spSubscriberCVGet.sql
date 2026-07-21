CREATE PROC [dbo].[spSubscriberCVGet]
@SubscriberID BIGINT, @LoginID bigint, @UserID bigint, @ROleID INT
AS
BEGIN
	select dbo.fncGetDocumentFolder(20)+LatestCVPath AS LatestCVPath,CVName FROM [dbo].[tblSubscriberCVUploaded] WHERE SubscriberID = @SubscriberID
END
GO
