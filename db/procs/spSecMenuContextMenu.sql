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
Select '5' As NodeType, '0' As NodeTypeUnder, 'Logout' As Descr, '' As Icon
GO
