CREATE PROC [dbo].[spClientGetSpecificJob_Display]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT, @JobID BIGINT
AS
BEGIN

SELECT * INTO #Gender FROM [tblClientJobs_Gendermapping] WHERE JobID = @JobID 

DECLARE @Gender VARCHAR(50)=  ''

IF EXISTS(SELECT JobID FROM #Gender GROUP BY JobID HAVING COUNT(*)=3)
	SET @Gender = 'ALL'
ELSE
	BEGIN
		SELECT @Gender = 'Male' FROM #Gender WHERE Gender = 'M'
		SELECT @Gender = CASE WHEN @Gender = '' THEN 'Femal'ELSE @Gender+','+'Female' END FROM #Gender WHERE Gender = 'F'
		SELECT @Gender = CASE WHEN @Gender = '' THEN 'Others'ELSE @Gender+','+'Others' END FROM #Gender WHERE Gender = 'T'
	END

SELECT j.JobID, j.JobDescr, e.Descr AS EmpType, @Gender AS Gender,
CAST(j.MinExp AS VARCHAR)+ ' - '+ CAST(j.MaxEmp AS VARCHAR) +' yrs'AS Emp, 
CAST(FORMAT(j.MinCTC,'N0','en-in') AS VARCHAR)+ ' - '+ CAST(FORMAT(j.MaxCTC,'N0','en-in') AS VARCHAR) AS CTC, a.ClientName AS CompanyName, d.Descr AS Designation, w.Descr AS WorkMode, c.Descr AS City, i.IndustryType
FROM     tblClientJobs AS j INNER JOIN
                  tblMstrDesignation AS d ON j.DesignationID = d.DesignationID INNER JOIN
                  tblMstrCily AS c ON j.JobCityID = c.CityID INNER JOIN
                  tblMstrIndustryType AS i ON j.IndustryTypeID = i.IndustryTypeID INNER JOIN
                  tblClientMstr AS a ON j.ClientID = a.ClientID INNER JOIN
                  tblMstrWorkMode AS w ON j.WorkModeID = w.WorkModeID INNER JOIN
				  tblMstrEmpType e ON e.EmployeeTypeID = j.EmployeeTypeID
WHERE  (j.JobID = @JobID)


SELECT a.JobID, b.Descr AS EducationType INTO #edu
FROM     tblClientJobs_EducationType AS a INNER JOIN
                  tblMstrEducationType AS b ON a.EducationTypeID = b.EducationTypeID
WHERE  (a.JobID = @JobID)



SELECT JobID,  
EducationType = STUFF((SELECT DISTINCT ', ' + t2.EducationType FROM #edu t2 WHERE t2.JobID = t1.JobID FOR XML PATH('')),1,1,'')
FROM #edu t1 GROUP BY JobID
		

SELECT a.JobID, b.Descr AS Skills
FROM     tblClientJobSkill AS a INNER JOIN
                  tblMstrSkills AS b ON a.SkillID = b.SkillID
WHERE  (a.JobID = @JobID)
END
GO
