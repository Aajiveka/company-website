-- ============ spCompanyInfo ============
CREATE PROCEDURE [dbo].[spCompanyInfo]
	@CompanyId INT, @RoleID INT=1, @UserID INT=0,	@LoginID BIGINT
AS
BEGIN	
	--SELECT 'Astix Intelligence' As Company, 
    --'Astix are a software services company offering solutions in Business Process Automation, Business Intelligence and Decision Support Systems' 
    --As [Profile], 'Gurugram' As City, 'Haryana' As State 

    SELECT ClientName AS Company,companyDescr AS [Profile], c.Descr AS City, s.Descr AS State 
    FROM tblClientMstr a INNER JOIN tblMstrCily c ON a.CityID = c.CityID
    INNER JOIN tblMstrState s ON s.StateID = c.StateID 
    WHERE CLientID = @CompanyId
END
0
GO

