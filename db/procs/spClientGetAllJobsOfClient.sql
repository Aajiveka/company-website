CREATE PROC spClientGetAllJobsOfClient
@ClientID BIGINT, @LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	Select b.JobID,c.Descr AS Designation
	FROM tblJobSubscriberMapping a INNER JOIN tblClientJobs b ON a.JobID = b.JobID
	INNER JOIN tblMstrDesignation c ON c.DesignationID = b.DesignationID INNER JOIN tblMstrCily d ON d.CityID = b.JobCityID
	WHERE b.ClientID=@ClientID
END
GO
