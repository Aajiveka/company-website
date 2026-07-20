CREATE PROCEDURE [dbo].[spSecGetRoles](@RoleID INT)
AS
IF @RoleID=0 
BEGIN
	SELECT     RoleId, RoleName
	FROM         tblSecRoles
END
ELSE
BEGIN
	SELECT     RoleId, RoleName
	FROM         tblSecRoles WHERE RoleId=@RoleID
END
GO
