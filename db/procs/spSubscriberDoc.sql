-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[spSubscriberDoc]
	@SubscriberID BIGINT, @RoleID INT=1, @UserID bigint=0, @LoginID BIGINT
AS
BEGIN	

	DECLARE @cvName VARCHAR(1000)
	select @cvName = dbo.fncGetDocumentFolder(1)+CVPath FROM tblSubscriberCVDetails WHERE SubscriberID = @SubscriberID

	SELECT a.DocUploadID, MAX(DocStatusID) AS DocStatusID INTO #LatestSTS
	FROM tblCandidateDocumentStatus a INNER JOIN tblCandidateDocumentUploaded b ON a.DocUploadID  = b.DocUploadID
	WHERE b.SubscriberID = @SubscriberID
	GROUP BY a.DocUploadID

	SELECT a.StatusID,a.DocUploadID INTO #STS
	FROM tblCandidateDocumentStatus a INNER JOIN #LatestSTS b ON a.DocStatusID = b.DocStatusID
	
	SELECT a.DocUploadID AS DocMappingId,c.DocumentID AS DocTypeId,c.DocumentName AS Document,'' AS SampleFileName,
	dbo.fncGetDocumentFolder(c.DocumentID)+a.DocumentPath AS [FileName],a.DocumentPath AS [DocumentPath],s.Descr AS flgStatus,
	CASE WHEN s.StatusID IN(16,18) THEN 1 ELSE 0 END AS flgUpload, '0' As flgUrgent
	FROM tblCandidateDocumentUploaded a INNER JOIN #STS b ON a.DocUploadID = b.DocUploadID
	INNER JOIN tblMstrDocuments c ON c.DocumentID = a.DocumentTypeID INNER JOIN tblMstrStatus s ON
	s.StatusID = b.StatusID
	UNION
	SELECT 0 AS DocMappingId,c.DocumentID AS DocTypeId,c.DocumentName AS Document,'' AS SampleFileName,
	'' AS [FileName],'' AS [DocumentPath],'Document required' AS flgStatus,1 AS flgUpload, '0' As flgUrgent
	FROM tblCandidateDocumentMap a INNER JOIN tblMstrDocuments c ON c.DocumentID = a.DocumentTypeID 
	WHERE SubscriberID = @SubscriberID AND flgStatus=0
	UNION
	SELECT 1 As DocMappingId, '1' As DocTypeId, 'CV' as Document, 'CV.pdf' As SampleFileName, 
	@cvName As [FileName], 'Uplaoded',  '2' As flgStatus, '0' As flgUpload, '0' As flgUrgent

	--SELECT a.SubscriberDocID AS DocMappingId,a.DocumentTypeID AS DocTypeId,b.DocumentType AS Document,'' AS SampleFileName,
	--a.DocumentName AS [FileName],a.DocumentPath AS [DocumentPath], c.Descr AS [Status],
	--'' As ThumbImg, '2' As flgStatus, '1' As flgUpload, '0' As flgUrgent
	--FROM tblSubscriberDocs a INNER JOIN tblMstrDocumentType b ON a.DocumentTypeID = b.DocumentTypeID INNER JOIN #STS s ON
	--a.SubscriberDocID = s.SubscriberDocID INNER JOIN tblMstrJobMappingStatus c ON s.StatusID = c.JobMapStatusID
	
	--SELECT '1' As DocMappingId, '1' As DocTypeId, 'CV' as Document, 'CV.pdf' As SampleFileName, @cvName As [FileName], 'Uplaoded' As Status, '' As ThumbImg, '2' As flgStatus, '1' As flgUpload, '0' As flgUrgent
	--Union
	--SELECT '2' As DocMappingId, '2' As DocTypeId, 'PAN' as Document, 'PAN.pdf' As SampleFileName, 'MyPan.pdf' As [FileName], 'Verified' As Status, '' As ThumbImg, '3' As flgStatus, '0' As flgUpload, '0' As flgUrgent
	--Union
	--SELECT '3' As DocMappingId, '3' As DocTypeId, 'Aadhar' as Document, 'Aadhar.pdf' As SampleFileName, 'MyAadhar.pdf' As [FileName], 'Pending for verification' As Status, '' As ThumbImg, '1' As flgStatus, '1' As flgUpload, '0' As flgUrgent
	--Union
	--SELECT '4' As DocMappingId, '4' As DocTypeId, 'Police Verification Form' as Document,'PVF.pdf' As SampleFileName, '' As [FileName], 'Pending for uploading' As Status, '' As ThumbImg, '0' As flgStatus, '1' As flgUpload, '1' As flgUrgent
END
GO
