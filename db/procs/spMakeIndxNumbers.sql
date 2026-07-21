CREATE     PROCEDURE [dbo].[spMakeIndxNumbers] 

	@PHierId INT

AS

DECLARE @Indx INT
DECLARE @crsIndxNmbr as Cursor
DECLARE @HierID INT
DECLARE @PIndxNumber varchar(30) --This is the index number of the parent to which the index number of the child will be appended
DECLARE @IndxNumber varchar(30) --This is the index number to be derived and inserted during process

SET @Indx=0

SELECT @IndxNumber=IndexNum FROM #tmpHierTable WHERE HierID=@PHierID

--SET @IndxNumber=ISNULL(@IndxNumber, 0)

UPDATE #tmpHierTable SET IndexNumP=@IndxNumber WHERE PHierID=@PHierID and HierID>0

SET @crsIndxNmbr = Cursor For  
SELECT HierID, IndexNumP FROM #tmpHierTable WHERE  PHierID=@PHierID and HierID>0

OPEN @crsIndxNmbr
	FETCH NEXT FROM @crsIndxNmbr INTO @HierID, @PIndxNumber
	WHILE @@FETCH_STATUS = 0
	BEGIN
	SET @IndxNumber=CAST(isnull(@PIndxNumber,SPACE(0)) AS varChar) + '.'  + CAST(@Indx as varchar(3))
	IF SUBSTRING(@IndxNumber,1,1)='.'
		BEGIN
			SET @IndxNumber=SUBSTRING(@IndxNumber,2,Len(@IndxNumber))
		END
	UPDATE #tmpHierTable SET #tmpHierTable.IndexNum = @IndxNumber WHERE HierID=@HierID
	IF EXISTS (SELECT HierId FROM #tmpHierTable WHERE PHierID=@HierID)
		BEGIN
			EXEC spMakeIndxNumbers @HierID
		END
	SET @Indx=@Indx+1
	FETCH NEXT FROM @crsIndxNmbr INTO @HierID, @PIndxNumber

	END
GO
