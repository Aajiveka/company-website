CREATE PROC [dbo].[spClientGetClientWithJobs]
@UserID BIGINT,@LoginID BIGINT, @RoleID INT
AS
BEGIN
	SELECT a.ClientID, a.ClientName, a.CompanyLogo, a.companyDescr, c.Descr AS City, i.IndustryTypeID, i.IndustryType, a.CityID, CAST(a.ClientName + ' ' + c.Descr +' '+i.IndustryType AS VARCHAR(MAX)) AS strSerach, s.Descr AS StateName
	INTO        [#ComapnyInfo]
	FROM     tblClientMstr AS a INNER JOIN
					  tblMstrCily AS c ON a.CityID = c.CityID INNER JOIN
					  tblMstrIndustryType AS i ON a.IndustryTypeID = i.IndustryTypeID INNER JOIN
					  tblMstrState AS s ON c.StateID = s.StateID

SELECT DISTINCT b.ClientID, b.JobID, d.Descr INTO        [#AllJobs]
FROM     [#ComapnyInfo] AS a INNER JOIN
                  tblClientJobs AS b ON a.ClientID = b.ClientID INNER JOIN
                  tblMstrDesignation AS d ON b.DesignationID = d.DesignationID
WHERE  (b.StatusID = 1)

SELECT ClientID, COUNT(DISTINCT JobID) AS NoOfJobs INTO #NofOfJobs FROM #AllJobs GROUP BY ClientID
CREATE TABLE #DEscription(ClientID BIGINT, Descr VARCHAR(MAX)) 

INSERT INTO #DEscription
SELECT ClientID,  
strLoc = STUFF((SELECT DISTINCT ', ' + t2.Descr FROM [#AllJobs] t2 WHERE t2.ClientID = t1.ClientID FOR XML PATH('')),1,1,'')
FROM [#AllJobs] t1  GROUP BY ClientID


	SELECT a.ClientID, a.ClientName, dbo.fncGetDocumentFolder(19)+a.CompanyLogo AS CompanyLogo, a.companyDescr, a.City, a.IndustryTypeID, a.IndustryType, a.CityID, 
	a.strSerach+ ' '+ISNULL(d.Descr,'') AS strSerach, a.StateName, 'Open jobs - '+CAST(ISNULL(b.NoOfJobs,0) AS VARCHAR) AS OpenJobs
	FROM #ComapnyInfo a LEFT OUTER JOIN #NofOfJobs b ON a.ClientID = b.ClientID LEFT OUTER JOIN #DEscription d ON
	a.ClientID = d.ClientID
END
GO
