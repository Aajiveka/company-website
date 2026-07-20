Create PROC [dbo].[spClientGetDocMaster]
@RoleID BIGINT, @LoginID BIGINT, @UserID BIGINT
AS
BEGIN
	select DocumentID, DocumentName FROM tblMstrDocuments ORDER BY 2
END
GO
