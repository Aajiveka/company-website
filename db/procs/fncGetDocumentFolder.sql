CREATE FUNCTION dbo.fncGetDocumentFolder(@DocumentTypeID INT) RETURNS VARCHAR(1000)
AS
BEGIN
		DECLARE @Folder VARCHAR(1000)
		SELECT @Folder = RootFolder+'/'+[FolderName]+'/'  from [tblMstrDocuments] WHERE DocumentID = @DocumentTypeID
		RETURN @Folder

END
GO
