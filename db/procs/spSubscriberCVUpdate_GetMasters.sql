CREATE PROC [dbo].[spSubscriberCVUpdate_GetMasters]
@SubscriberID INT,
@LoginID bigint,
@UserID bigint,
@RoleID INT
AS
BEGIN
	Select * FROM [dbo].[tblMstrGender]
	Select * FROM [dbo].[tblMstrState]
	Select * FROM [dbo].tblMstrCily
	Select [DegreeTypeID] AS EducationTypeID, [DegreeName] AS Descr FROM [dbo].[tblMstrDegreeType]  ORDER BY HighestSeq
	Select * FROM tblMstrCourse
	Select * FROM [dbo].[tblMstrSkills]
	Select * FROM [dbo].[tblMstrFunctions]
	Select IndustryTypeId, IndustryType FROM tblMstrIndustryType
	Select * from tblMstrSubFunctions
	Select * from tblmstrTags
END
GO
