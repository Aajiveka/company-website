CREATE PROC [dbo].[spClientGetSpecificClintInfo]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT, @ClientID BIGINT
AS
BEGIN
	SELECT a.ClientID, a.ClientName, a.ClientAddress, a.PIN, a.ContactNo, a.EmailID, dbo.fncGetDocumentFolder(19)+a.CompanyLogo AS CompanyLogo, a.CityID, a.companyWebsite, a.companyDescr, b.ContactPerName, b.PhoneNo, b.Mobile, b.EmailID AS ContactPersonEmail, b.RoleID
	FROM     tblClientMstr AS a INNER JOIN
						tblClientContacts AS b ON a.ClientID = b.ClientID
	WHERE a.ClientID  =@ClientID
END
GO
