CREATE PROC [dbo].[spSubscriberCVUpdate_Certificate]
@SubscriberID bigint,
@LoginID bigint,
@UserID bigint,
@RoleID INT,
@SubscriberCertificateID BIGINT,
@Certificates udt_Certificate READONLY

AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	DECLARE @CertificateName VARCHAR(1000)

	IF NOT EXISTS(SELECT * FROM @Certificates)
		BEGIN
			DELETE tblSubscriberCertificate WHERE SubscriberCertificateID = @SubscriberCertificateID
		END
	ELSE
		BEGIN
			SELECT @CertificateName = CertificateName FROM @Certificates
			
			IF ISNULL(@SubscriberCertificateID,0)=0
				BEGIN
					INSERT INTO tblSubscriberCertificate(SubscriberID,CertificateName, TimestampIns, LoginIDIns)
					VALUES(@SubscriberID,@CertificateName, @dt, @LoginID)
					SET @SubscriberCertificateID = SCOPE_IDENTITY()
					
				END
			ELSE
				BEGIN
					UPDATE tblSubscriberCertificate SET CertificateName = @CertificateName
					WHERE SubscriberCertificateID = @SubscriberCertificateID
				END
		END

	SELECT 1 AS flgSuccess, @SubscriberCertificateID As MappingID
END
GO
