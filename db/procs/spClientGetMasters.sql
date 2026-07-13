CREATE PROC [dbo].[spClientGetMasters]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	select CountryID, Descr AS CountryName FROM tblMstrCountry
	SELECT StateID, Descr AS StateName,CountryID FROM tblMstrState
	Select CityID, Descr AS CityName, StateID FROM tblMstrCily
	Select * FROM tblMstrIndustryType
	
	
END
GO
