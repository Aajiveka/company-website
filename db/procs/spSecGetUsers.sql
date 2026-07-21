CREATE  PROCEDURE [dbo].[spSecGetUsers]
(@NodeID bigint, @NodeType TINYINT)
AS
IF @NodeType=0
BEGIN
	IF @NodeID=0
		BEGIN
	

SELECT     NodeID, NodeType, FName+' '+ISNULL(LName,'') UserNM, EMailID
	FROM         tblOrgHOUsers
	WHERE     (FlgActive = 1)
	UNION
	SELECT     NodeID, NodeType, FName+' '+ISNULL(LName,'') UserNM, EMailID
	FROM         tblOrgSysAdmins
	WHERE     (FlgActive = 1)
	ORDER BY UserNM

		END


	ELSE 
		BEGIN
			SELECT     TOP 100 PERCENT dbo.tblOrgSysAdmins.NodeID, dbo.tblOrgSysAdmins.NodeType, 
			                      dbo.tblOrgSysAdmins.FName + ' ' + ISNULL(dbo.tblOrgSysAdmins.LName, '') AS UserNM, dbo.tblOrgSysAdmins.EMailID, dbo.tblSecUser.UserID, 
			                      dbo.tblSecUser.UserName, dbo.tblSecUser.Password 
			FROM         tblOrgSysAdmins INNER JOIN
			                      tblSecUser ON tblOrgSysAdmins.NodeID = tblSecUser.NodeID AND tblOrgSysAdmins.NodeType = tblSecUser.NodeType
			WHERE     (dbo.tblOrgSysAdmins.FlgActive = 1) AND (dbo.tblOrgSysAdmins.NodeID = @NodeID) AND dbo.tblOrgSysAdmins.NodeType = @NodeType
			ORDER BY UserNM
		END
END


ELSE IF @NodeType=6
BEGIN
	SELECT     tblOrgEmpMstr.EmpID, tblOrgEmpMstr.NodeType, dbo.tblOrgEmpMstr.FName + ' ' + ISNULL(dbo.tblOrgEmpMstr.LName, '') AS UserNM, ISNULL(tblOrgEmpMstr.EMailID,'') EMailID, 
	                      ISNULL(tblSecUser.UserID,0) UserID, ISNULL(tblSecUser.UserName,'') UserName, ISNULL(tblSecUser.Password ,'') AS Password
	FROM         tblOrgEmpMstr LEFT OUTER JOIN
	                      tblSecUser ON tblOrgEmpMstr.EmpID = tblSecUser.NodeID AND tblOrgEmpMstr.NodeType = tblSecUser.NodeType
	WHERE     tblOrgEmpMstr.EmpID=@NodeID
END
GO
