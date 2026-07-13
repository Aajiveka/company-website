CREATE PROC [dbo].[spClientJob_GetMasters]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN

SELECT DesignationID, Descr AS Designation FROM     tblMstrDesignation

CREATE TABLE #ClientList(ClientID INT, ClientName VARCHAR(100))
INSERT INTO #ClientList
EXEC [spClientGetClintsofUser]  @LoginID,@RoleID,@UserID
SELECT * FROM #ClientList WHERE ClientName <> 'All'
Select * FROM tblMstrWorkMode
select * FROM tblMstrEmpType

Select * FROM tblMstrSkills
Select * FROM tblMstrIndustryType
Select * FROM tblMstrCily

select * FROM tblMstrEducationType
END
GO
