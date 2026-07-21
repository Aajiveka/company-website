CREATE PROC spQCGetUnmappedSubscribers
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	SELECT a.SubscriberID, a.FullName AS Name, a.MobileNo1 AS MobileNo, a.Gender, a.CVPath, a.TotalExp, a.CurrentCTC, 
	CASE WHEN a.flgReadyToRelocate=1 THEN 'Yes' ELSE 'No' END as ReadyToRelocate, a.NoticePeriod, b.Descr AS City, s.Descr AS Skill, f.Descr AS [Function], 
					  i.IndustryType
	FROM     tblSubscriberCVDetails AS a INNER JOIN
					  tblMstrCily AS b ON a.CityID = b.CityID INNER JOIN
					  tblMstrIndustryType AS i ON a.IndustryTypeID = i.IndustryTypeID INNER JOIN
					  tblMstrSkills AS s ON s.SkillID = a.SkillID INNER JOIN
					  tblMstrFunctions AS f ON f.FunctionID = a.SubFunctionID
	--WHERE NOT EXISTS(SELECT * FROM tblJobSubscriberMapping WHERE SubscriberID = a.SubscriberID)
END
GO
