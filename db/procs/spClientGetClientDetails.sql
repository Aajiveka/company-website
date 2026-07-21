CREATE PROC [dbo].[spClientGetClientDetails]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT, @Client BIGINT
AS
BEGIN
	SELECT a.ClientName, a.ClientAddress, a.PIN, a.ContactNo, a.EmailID, 
	CASE WHEN ISNULL(a.CompanyLogo,'')='' THEN '' ELSE dbo.fncGetDocumentFolder(19)+a.CompanyLogo END AS CompanyLogo, a.CityID, a.companyWebsite, a.companyDescr, b.IndustryType, c.StateID, s.CountryID
	FROM     tblClientMstr AS a INNER JOIN
					  tblMstrIndustryType AS b ON a.IndustryTypeID = b.IndustryTypeID INNER JOIN
					  tblMstrCily AS c ON a.CityID = c.CityID INNER JOIN
					  tblMstrState AS s ON c.StateID = s.StateID
	WHERE  (a.ClientID = @Client)

	SELECT b.ClientID, a.JobID, b.ClientName, CAST(a.MinExp AS VARCHAR) + ' - ' + CAST(a.MaxEmp AS VARCHAR) + ' Yrs' AS ExpRange, CAST(a.MinCTC AS VARCHAR) + ' - ' + CAST(a.MaxCTC AS VARCHAR) AS SalaryRange, 
					  e.Descr AS EmployementType, w.Descr AS WorkingMode, d.Descr AS Degination
	FROM     tblClientJobs AS a INNER JOIN
					  tblClientMstr AS b ON a.ClientID = b.ClientID INNER JOIN
					  tblMstrEmpType AS e ON a.EmployeeTypeID = e.EmployeeTypeID INNER JOIN
					  tblMstrWorkMode AS w ON a.WorkModeID = w.WorkModeID INNER JOIN
					  tblMstrDesignation AS d ON a.DesignationID = d.DesignationID
	WHERE  (a.ClientID = @Client)
END
GO
