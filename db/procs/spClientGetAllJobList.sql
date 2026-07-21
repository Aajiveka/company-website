CREATE PROC [dbo].[spClientGetAllJobList]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	SELECT tblClientMstr.ClientID, tblClientJobs.JobID, tblClientMstr.ClientName, tblClientJobs.DesignationID, tblClientJobs.EmployeeTypeID, tblClientJobs.WorkModeID, tblClientJobs.JobDescr, tblClientJobs.JobCandidateProfile, 
					  tblClientJobs.MinExp, tblClientJobs.MaxEmp, tblClientJobs.MinCTC, tblClientJobs.MaxCTC, tblClientJobs.JobCityID, tblClientJobs.StatusID
	FROM     tblClientJobs INNER JOIN
					  tblClientMstr ON tblClientJobs.ClientID = tblClientMstr.ClientID
	ORDER BY tblClientJobs.TimestampIns DESC
END
GO
