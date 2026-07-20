CREATE PROC spSubscriberAPIGetMaster_Professional
@SubscriberID BIGINT, @RoleID BIGINT
AS
BEGIN
	Select * FROM [dbo].[tblMstrSkills]
	Select IndustryTypeId, IndustryType FROM tblMstrIndustryType
	Select * FROM [dbo].[tblMstrFunctions]
	Select * from tblMstrSubFunctions
END
GO
