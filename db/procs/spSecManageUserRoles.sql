CREATE  PROCEDURE [dbo].[spSecManageUserRoles] 
		--CREATED BY : PK
		--PURPOSE : To individually insert user roles in a loop. Before this loop is called,all roles for that User are deleted

	@RoleID INT,
	@UserID INT,
	@UserNodeID INT,
	@UserNodeType INT
-- WITH ENCRYPTION
AS

INSERT INTO tblSecMapUserRoles (UserID, UserNodeID, UserNodeType, RoleId) VALUES     (@UserID, @UserNodeID, @UserNodeType, @RoleID)
GO
