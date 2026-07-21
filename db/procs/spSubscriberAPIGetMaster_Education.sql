CREATE PROC spSubscriberAPIGetMaster_Education
@SubscriberID BIGINT, @RoleID BIGINT
AS
BEGIN
	Select [DegreeTypeID] AS EducationTypeID, [DegreeName] AS Descr FROM [dbo].[tblMstrDegreeType]  ORDER BY HighestSeq
	Select * FROM tblMstrCourse
END
GO
