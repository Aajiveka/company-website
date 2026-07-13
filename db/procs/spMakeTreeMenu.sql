--[spMakeTreeMenu]  0,1,1,1,100,1
CREATE PROCEDURE [dbo].[spMakeTreeMenu] 

	@MenuNode SMALLINT,
	@RoleID bigint,
	@NodeID bigint,
	@NodeType INT

AS

CREATE TABLE #tmpHierTable
 (  
  [HierId] [SMALLINT],  --MnuId
  [Descr] [varChar] (100),  
  [PHierID] [SMALLINT],  --ParentMnuId
  [IsLastLevel] [TINYINT],  
  [OrdrNum] [SMALLINT],
  [IndexNum][varChar] (20),
  [IndexNumP][varChar] (20),
  SSClass VARCHAR(100)
 )  

EXEC spMakeTreeMenuSub @MenuNode, @RoleID

EXEC   spMakeIndxNumbers 0

SELECT * FROM #tmpHierTable ORDER BY OrdrNum
GO
