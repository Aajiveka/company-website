CREATE PROC [dbo].[spSubscriberAPIManageDetails_Certificate]
@LoginID BIGINT, @SubscriberID BIGINT, @SubscriberCertificateID BIGINT, @flgDelete TINYINT, @CertificateName VARCHAR(1000)
AS
	DECLARE @dt DATETIME =dbo.fnGetCurrentDateTime()
	IF @flgDelete = 1
		DELETE FROM tblSubscriberCertificate WHERE SubscriberCertificateID = @SubscriberCertificateID
	ELSE
		BEGIN
			UPDATE tblSubscriberCertificate SET CertificateName = @CertificateName, loginIDUpd = @LoginID, TimestampUpd = @dt
			WHERE SubscriberCertificateID = @SubscriberCertificateID

			INSERT INTO tblSubscriberCertificate(CertificateName,TimestampIns,LoginIDIns) VALUES(@CertificateName, @dt,@LoginID)
		END
	SELECT 1 AS flgStaus
GO
