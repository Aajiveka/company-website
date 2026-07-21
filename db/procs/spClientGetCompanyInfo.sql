CREATE PROC [dbo].[spClientGetCompanyInfo]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN

	SELECT a.ClientID,a.ClientName,a.EmailID,a.ContactNo,a.companyWebsite,
	i.IndustryType, i.IndustryTypeID,ct.Descr AS Country, ct.CountryID,
	s.Descr AS State, s.StateID, c.Descr AS City, c.CityID,a.PIN,a.companyDescr,
	dbo.fncGetDocumentFolder(19)+a.CompanyLogo AS CompanyLogo
	FROM tblClientMstr a INNER JOIN tblMstrCily c ON a.CityID = c.CityID
	INNER JOIN tblMstrState s ON s.StateID = c.StateID INNER JOIN tblMstrCountry ct
	ON ct.CountryID = s.CountryID INNER JOIN tblMstrIndustryType i ON
	a.IndustryTypeID = i.IndustryTypeID INNER JOIN tblMstrPerson P ON 
	p.ClientID = a.ClientID INNER JOIN tblSecUser U ON u.NodeID = p.PersonNodeID
	WHERE u.UserID = @UserID
	
SELECT a.ContactPerName, a.PhoneNo, a.Mobile, a.EmailID, a.ContactPersonRole, a.ClientID, a.ClientContactsID
FROM     tblClientContacts AS a INNER JOIN
                  tblMstrPerson AS P ON P.ClientID = a.ClientID INNER JOIN
                  tblSecUser AS U ON U.NodeID = P.PersonNodeID
WHERE  (U.UserID = @UserID)
END
GO
