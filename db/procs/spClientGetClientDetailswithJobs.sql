CREATE PROC spClientGetClientDetailswithJobs
@ClientID BIGINT, @LoginID BIGINT, @RoleID INT
AS
BEGIN

SELECT a.ClientName, a.ClientAddress, a.ContactNo, a.EmailID, a.CompanyLogo, c.Descr AS City, a.companyWebsite, a.companyDescr
FROM     tblClientMstr AS a INNER JOIN
                  tblMstrCily AS c ON a.CityID = c.CityID
WHERE ClientID = @ClientID

SELECT j.JobID, d.Descr AS Designation, c.Descr AS City, e.Descr AS EmployementType, w.Descr AS WorkingMode, j.JobDescr, j.MinExp, j.MaxEmp, j.MinCTC, j.MaxCTC
FROM     tblClientJobs AS j INNER JOIN
                  tblMstrDegination AS d ON j.DesignationID = d.DesignationID INNER JOIN
                  tblMstrWorkMode AS w ON j.WorkModeID = w.WorkModeID INNER JOIN
                  tblMstrEmpType AS e ON j.EmployeeTypeID = e.EmployeeTypeID INNER JOIN
                  tblMstrCily AS c ON j.JobCityID = c.CityID
WHERE  (j.ClientID = 1)
END
GO
