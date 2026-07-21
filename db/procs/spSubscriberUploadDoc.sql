-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================

CREATE PROCEDURE [dbo].[spSubscriberUploadDoc]
	@SubscriberID BIGINT, @RoleID INT=1, @UserID bigint=0, @LoginID BIGINT, 
	@Docs udt_keyPair READONLY
	--@UploadedDocStr varchar(100)  --DocMappingId^FileName|
AS
BEGIN	
	DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime]()

	INSERT INTO tblCandidateDocumentUploaded (DocumentMapID,SubscriberID,DocumentTypeID,DocumentPath,
	flgStatus,TimestampIns,LoginIDIns)
	SELECT b.DocumentMapID,@SubscriberID,b.DocumentTypeID,a.strValue,1,@dt,@LoginID
	FROM @Docs a INNER JOIN tblCandidateDocumentMap b ON a.id = b.DocumentTypeID
	WHERE b.SubscriberID = @SubscriberID

	INSERT INTO tblCandidateDocumentStatus(DocUploadID,StatusID,UserID,TimestampIns,LoginIDIns)
	SELECT  a.DocUploadID,17,@UserID,@dt, @LoginID
	FROM tblCandidateDocumentUploaded a INNER JOIN @Docs b ON a.DocumentTypeID = b.id
	WHERE a.SubscriberID = @SubscriberID

	IF EXISTS(SELECT * FROM @Docs WHERE id=1)
		BEGIN
			DECLARE @CV VARCHAR(500)
			SELECT @cv = strValue FROM @Docs WHERE id=1 
			UPDATE tblSubscriberCVDetails SET CVPath  =@CV WHERE SubscriberID = @SubscriberID

			UPDATE tblSubscriberJobStatusLatest SET JobMapStatusID = 3,TimestampIns = @dt WHERE SubscriberID = @SubscriberID AND JobMapStatusID = 1
			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[UserID],[TimestampIns])
			VALUES(@SubscriberID,3,@UserID,@dt)
		END

	select 1 as result
END
GO
