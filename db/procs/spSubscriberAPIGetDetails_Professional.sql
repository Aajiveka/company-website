CREATE PROC [dbo].[spSubscriberAPIGetDetails_Professional]
@SubscriberID BIGINT
AS
BEGIN

		SELECT a.IndustryTypeID, IndustryType,s.FunctionID,F.Descr AS [Function],a.SubFunctionID,s.Descr AS SubFunction,
		a.TotalExp, a.CurrentCTC,a.CurrentCityID,c.Descr AS CurrentCity,a.flgReadyToRelocate,a.NoticePeriod,a.SkillID, sk.Descr AS Skill
		FROM tblSubscriberCVDetails a INNER JOIN [tblMstrSubFunctions] s ON a.SubFunctionID = s.SubfunctionID INNER JOIN [tblMstrFunctions] F ON s.FunctionID = F.FunctionID
		INNER JOIN [tblMstrIndustryType] I ON I.IndustryTypeID = a.IndustryTypeID INNER JOIN [tblMstrSkills] sk ON sk.SkillID = a.SkillID INNER JOIN tblMstrCily C ON
		c.CityID = a.CurrentCityID 
		WHERE  (SubscriberID = @SubscriberID)

		SELECT Employer, DesignationID, FORMAT(JoiningDate, 'dd-MMM-yyyy') AS JoiningDate, CASE WHEN flgCurrent = 1 THEN '' ELSE FORMAT(ReleavingDate, 'dd-MMM-yyyy') END AS ReleavingDate, flgCurrent, SubscriberEmployerID, 
						  JobDescr AS Responsibilities
		FROM     tblSubscriberEmployer
		WHERE  (SubscriberID = @SubscriberID)

	select a.CityID, b.Descr AS City 
	FROM tblSubscriberPrefferedLocations a INNER JOIN tblMstrCily b ON a.CityID = b.CityID
	WHERE SubscriberID = @SubscriberID



END
GO
