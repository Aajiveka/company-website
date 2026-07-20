CREATE PROC [dbo].[spSubscriberAPIGetDetails_Certificate]
@LoginID BIGINT, @SubscriberID BIGINT
AS
	SELECT CertificateName, SubscriberCertificateID
	FROM     tblSubscriberCertificate
	WHERE  (SubscriberID = @SubscriberID)
GO
