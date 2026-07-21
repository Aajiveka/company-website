CREATE  PROCEDURE [dbo].[spMakeTreeMenuSub]   
  
  @MenuNode smallint,   
  @RoleID INT 
  -- WITH ENCRYPTION
AS  
  
DECLARE @curRec Cursor  
DECLARE @MnuId SMALLINT  
  
  
INSERT INTO #tmpHierTable (HierID, Descr, PHierId, IsLastLevel, OrdrNum,SSClass) 
SELECT DISTINCT TOP (100) PERCENT tblSecMenuHierarchy.MnID, tblSecMenuHierarchy.MenuDescription, tblSecMenuHierarchy.MnParentID, 20 AS Expr1, tblSecMenuHierarchy.OrderNum, tblSecMenuHierarchy.SSClass
FROM     tblSecMenuHierarchy INNER JOIN
                  tblSecMenuHierarchyRoles ON tblSecMenuHierarchy.MnID = tblSecMenuHierarchyRoles.MnId
WHERE  (tblSecMenuHierarchy.MnParentID = @MenuNode) AND (tblSecMenuHierarchyRoles.RoleID = @RoleID) AND (tblSecMenuHierarchy.flgMenuActive <> 0)
ORDER BY tblSecMenuHierarchy.OrderNum

  
IF EXISTS (SELECT * FROM #tmpHierTable WHERE PHierId=@MenuNode)  
 BEGIN   
  UPDATE #tmpHierTable SET IsLastLevel=10 WHERE HierID=@MenuNode  
 END 

  
SET @curRec = CURSOR FOR  
 select HierID from #tmpHierTable WHERE PHierId=@MenuNode  
  
OPEN @curRec  
  
 FETCH NEXT FROM @curRec INTO @MnuId  
 WHILE @@FETCH_STATUS = 0  
 BEGIN  
  EXEC spMakeTreeMenuSub @MnuId, @RoleID  
  
  FETCH NEXT FROM @curRec INTO @MnuId  
 END
GO
