CREATE PROC [dbo].[spClientGetClintsofUser]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	IF @RoleID = 3 OR @RoleID = 5
		BEGIN
			SELECT ClientID,ClientName FROM (
			Select ClientID, ClientName FROM tblClientMstr
			UNION SELECT 0,'ALL') aa ORDER BY 1
		END
	ELSE IF @RoleID = 4
		BEGIN
			DECLARE @CLientID BIGINT
			SELECT @CLientID = ClientID 
			FROM tblMstrPerson a INNER JOIN tblSecUser b ON a.PersonNodeID = b.NodeID WHERE b.UserID = @UserID

			Select ClientID, ClientName FROM tblClientMstr WHERE ClientID  =@CLientID
		END
END
GO
