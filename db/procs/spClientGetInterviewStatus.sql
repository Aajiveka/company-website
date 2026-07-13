CREATE PROC [spClientGetInterviewStatus]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	SELECT * FROM tblMstrInviewStatus  ORDER BY 2 
END
GO
