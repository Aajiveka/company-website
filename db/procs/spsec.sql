-- ============ spSecGetRoles ============
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
0
GO

-- ============ spSecGetUsers ============
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
0
GO

-- ============ spSecManageUserRoles ============
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
<
GO

-- ============ spSecMenuContextMenu ============
CREATE PROCEDURE [dbo].[spSecMenuContextMenu] --2
	@HierTypeID INT, @LoginID BIGINT,@RoleID BIGINT
 AS

--SELECT   dbo.tblSecMenuContextMenu.NodeType, dbo.tblSecMenuContextMenu.NodeTypeUnder, dbo.tblSecMenuContextMenu.Descr, 
--        dbo.tblPMstNodeTypes.FrameID,dbo.tblSecMenuContextMenu.flgBusinessType,dbo.tblSecMenuContextMenu.NodeIDBusinessType,tblSecMenuContextMenu.UpperlevelNameForEdit,
--		flgMap,flgChannel,flgPerson,flgRoute,flgMapType,flgDistributor,flgCoverageArea,flgMapDistributor,flgMapBrands
--FROM         dbo.tblSecMenuContextMenu INNER JOIN
--        dbo.tblPMstNodeTypes ON dbo.tblSecMenuContextMenu.NodeType = dbo.tblPMstNodeTypes.NodeType
--WHERE     (dbo.tblSecMenuContextMenu.HierTypeID = @HierTypeID)
--ORDER BY dbo.tblSecMenuContextMenu.NodeType

Select '1' As NodeType, '0' As NodeTypeUnder, 'My Profile' As Descr, 'la-user-tie' As Icon
union 
Select '2' As NodeType, '0' As NodeTypeUnder, 'My Documents' As Descr, 'la-file-invoice' As Icon
union 
Select '3' As NodeType, '0' As NodeTypeUnder, 'Upload Documents' As Descr, 'la-upload' As Icon
union 
Select '4' As NodeType, '0' As NodeTypeUnder, 'My Interviews' As Descr, 'la-bell' As Icon
union 
Select '5' As NodeType, '0' As NodeTypeUnder, 'Logout' As Descr, '' As Icon0
GO

-- ============ spSecUserLogin ============
CREATE PROCEDURE [dbo].[spSecUserLogin] 

	@UserName varChar(50),
	@UserPwd varChar(50),
	@SessionIdNw varChar(100),
	@IPAddress varChar(16),
	@BrwsrVer varChar(20),
	@ScrRsltn varChar(10)

AS

	DECLARE @UserID bigint
	DECLARE @UserNodeID bigint
	DECLARE @UserNodeType INT
	DECLARE @ActiveStatus TINYINT
	DECLARE @UserFullName varChar(200)
	DECLARE @curLogin CURSOR
	DECLARE @LoginId bigint
	DECLARE @LoginIdLoop bigint
	DECLARE @SessionIDOld varChar(100)
	DECLARE @PrvIPAddress varChar(16) --Used  in the loop to get the previous IP address
	DECLARE @rtrnIPAddress varChar(16) --Last not including Curent is returned for display
	DECLARE @FlgIPAddress TINYINT
	DECLARE @SameUser TINYINT --0=default - not known; 1=Same User; 2=Different User (By matchine sessionID)
	DECLARE @LoginRslt TINYINT --1=Invalid UserId/Pwd, 2=Duplicate User - @rtrnIPAddress Will come; 3=successful login - create ticket
	DECLARE @RoleId varchar(20)
	DECLARE @flgPasswordChange TINYINT
	DECLARE @cnt INT=1
	SET @flgPasswordChange=0
	SET @UserID=0
	SET @SameUser=0
	SET @FlgIPAddress=0
	DECLARE @PersonName VARCHAR(200)
	Declare @EmailId varchar(500)=''

	SELECT     @UserID=UserID, @UserNodeID=NodeID, @UserNodeType=NodeType, @ActiveStatus=Active, @flgPasswordChange=PwdStatus FROM  tblSecUser WHERE     (UserName = @UserName) AND ([Password] = @UserPwd) AND Active=1
	SELECT @RoleId = RoleId FROM [dbo].[tblSecMapUserRoles] WHERE UserID = @UserID
	SELECT @PersonName = [Descr], @EmailId = [EmailId] FROM [tblMstrPerson] WHERE  [PersonNodeID] = @UserNodeID

	IF @UserID>0
		BEGIN
			CREATE TABLE #TmpUsers(id int identity(1,1),LoginID INT, SessionID VARCHAR(100), IPAddress VARCHAR(100))
			INSERT INTO #TmpUsers(LoginID, SessionID, IPAddress)
			SELECT     LoginID, SessionID, IPAddress FROM tblSecUserLogin WHERE (UserID = @UserID) AND (IsSessionEnd = 0) ORDER BY LOGINID DESC
			WHILE @cnt<(Select MAX(ID) FROM #TmpUsers)
				BEGIN
					SELECT @LoginIdLoop = LoginID, @SessionIDOld = SessionID, @PrvIPAddress = IPAddress FROM #TmpUsers WHERE id  = @cnt
					IF @SessionIDOld=@SessionIDNw
										BEGIN 
											PRINT '@SessionIDOld=@SessionIDNw'
											SET @SameUser=1
											SET  @LoginRslt=3
											SET @LoginId=@LoginIdLoop
											DELETE FROM tblSecActiveSessions WHERE UserId=@UserID AND SessionID<>@SessionIDNw
											IF NOT EXISTS (SELECT RowID FROM tblSecActiveSessions WHERE UserId=@UserID AND SessionID=@SessionIDNw)
												BEGIN
													INSERT INTO   tblSecActiveSessions (SessionID, UserID) VALUES(@SessionIDNw, @UserID)
												END
										END
									ELSE
										BEGIN
											IF @SameUser=1
												BEGIN
													UPDATE tblSecUserLogin SET IsSessionEnd=1, Logouttime=GetDate(), LogOutSrc=2 WHERE LoginID=@LoginID
													DELETE FROM tblSecActiveSessions WHERE SessionID=@SessionIDOld
												END
											IF @FlgIPAddress=0
												BEGIN
													SET @rtrnIPAddress=@PrvIPAddress
													SET @FlgIPAddress=1
												END
										END
					IF @SameUser=0
						BEGIN
							SET @SameUser=2
							SET @LoginRslt=2
						END
					SET @cnt = @cnt + 1
				END

			IF @SameUser=0 --This means that there were no old records for user id in login table so a newentry can now be made
				BEGIN
					DELETE FROM tblSecActiveSessions WHERE UserId=@UserID
					INSERT INTO tblSecUserLogin  (UserID, SessionID, IPAddress, IEVersion, ScrRsltn, LoginTime)  VALUES     (@UserID, @SessionIDNw, @IPAddress,  @BrwsrVer, @ScrRsltn, GETDATE())
					SET @LoginId=@@IDENTITY
					SET @LoginRslt=3
					UPDATE tblsecuser set PwdStatus=1 where userid=@UserID
				END
		END
	ELSE
		BEGIN
			SET @LoginRslt=1
		END


SELECT @UserId AS UserId, @LoginRslt AS LoginResult, @LoginID AS LoginID, @SameUser AS SameUser, @rtrnIPAddress AS IPAddress,
	   @UserNodeID As NodeID, @UserNodeType As NodeType, @RoleId As RoleId,@flgPasswordChange AS flgPasswordChange,
	   @EmailId AS EmailId,@PersonName AS PersonName,@UserID AS UserID, @PersonName AS UserFullName
0
GO

