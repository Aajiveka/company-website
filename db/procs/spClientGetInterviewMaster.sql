CREATE PROC [dbo].[spClientGetInterviewMaster]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	CREATE TABLE #Clients(ClientID INT,ClientName VARCHAR(100))

	INSERT INTO #Clients
	exec [spClientGetClintsofUser] @LoginID,@RoleID,@UserID

	IF @RoleID = 4
		SELECT StatusID AS JobMapStatusID, Descr FROM     tblMstrStatus 	WHERE  (StatusID IN (6, 7, 10))
	ELSE
		SELECT StatusID AS JobMapStatusID, Descr FROM     tblMstrStatus 	WHERE  (StatusID IN (7,9, 11))

	SELECT * FROM tblMstrInterviewMode
	select a.jobID,b.Descr AS JobDescr from tblClientjobs a INNER JOIN tblMstrDesignation b ON a.DesignationID = b.DesignationID
	INNER JOIN #Clients c ON c.ClientID = a.ClientID
END
GO
