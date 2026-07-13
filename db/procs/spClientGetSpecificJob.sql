CREATE PROC [dbo].[spClientGetSpecificJob]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT, @JobID BIGINT
AS
BEGIN
SELECT JobID, DesignationID, EmployeeTypeID, WorkModeID, JobDescr, MinExp, MaxEmp, MinCTC, MaxCTC, JobCityID AS CirtID, ClientID,IndustryTypeID
FROM     tblClientJobs
WHERE  (JobID = @JobID)

SELECT * FROM [tblClientJobs_Gendermapping] WHERE JobID = @JobID
SELECT * FROM [tblClientJobs_EducationType] WHERE JobID = @JobID
SELECT * FROM [tblClientJobSkill] WHERE JobID = @JobID
END
GO
