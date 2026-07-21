CREATE PROC spClientDeleteClientContact
@UserID BIGINT,@LoginID BIGINT, @RoleID INT, @ContactDetailID udt_ContactDetails READONLY
AS
BEGIN
	DELETE A FROM [tblClientContacts] a INNER JOIN @ContactDetailID b ON a.ClientContactsID = b.ClientContactsID
END
GO
