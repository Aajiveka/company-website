CREATE PROC [dbo].[spUtilGetPhotoFolder]
@DocumentTypeID INT=0
AS

select Foldername FROM tblMstrDocuments WHERE DocumentID = @DocumentTypeID
GO
