CREATE PROC [dbo].[spSubscriberCVGetDetails]
@LoginID BIGINT,@UserID BIGINT, @SubscriberID BIGINT
AS
BEGIN

SELECT a.FullName AS Name, a.MobileNo1 AS MobileNo, CASE WHEN YEAR(DOB) = 1900 THEN '' ELSE FORMAT(DOB, 'dd-MMM-yyyy') END AS DOB, a.Gender, a.AddressLine1 AS Address, 
dbo.fncGetDocumentFolder(1)+a.CVPath AS CVPath, dbo.fncGetDocumentFolder(20)+a.PhotoName AS PhotoName, a.TotalExp, a.CurrentCTC, 
                  a.CurrentCityID, a.flgReadyToRelocate, a.NoticePeriod, a.CityID, b.StateID, a.SkillID, a.SubFunctionID, i.IndustryTypeID, i.IndustryType, a.EmailID, s.FunctionID, a.strTag,
				  CVPath AS CVPath_Name,a.PhotoName AS PhotoName_Name
INTO        [#Personl]
FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
                  tblMstrCily AS b ON a.CityID = b.CityID LEFT OUTER JOIN
                  tblMstrIndustryType AS i ON a.IndustryTypeID = i.IndustryTypeID LEFT OUTER JOIN
                  tblMstrSubFunctions AS s ON a.SubFunctionID = s.SubFunctionID
WHERE  (a.SubscriberID = @SubscriberID)

	SELECT [Name],MobileNo,DOB,Gender, EmailID As Email,[Address],CVPath,PhotoName,CityID,StateID,CVPath_Name, PhotoName_Name
	FROM #Personl

	SELECT b.DegreeName AS Course, c.DegreeName AS Degree, a.CourseTypeID, a.DegreeID, a.SubscriberEducationID, c.HighestSeq
	FROM     tblSubscriberEducation AS a INNER JOIN
					  tblMstrCourse AS b ON a.CourseTypeID = b.DegreeID INNER JOIN
					  tblMstrDegreeType AS c ON b.EducationTypeID = c.DegreeTypeID
	WHERE  (a.SubscriberID = @SubscriberID) ORDER BY c.HighestSeq

	SELECT CertificateName, SubscriberCertificateID
	FROM     tblSubscriberCertificate
	WHERE  (SubscriberID = @SubscriberID)

		SELECT TotalExp, CurrentCTC,CurrentCityID,flgReadyToRelocate,NoticePeriod,SkillID, SubFunctionID,FunctionID, 
		IndustryTypeID, IndustryType,strTag
		FROM #Personl

		SELECT Employer, DesignationID, FORMAT(JoiningDate, 'dd-MMM-yyyy') AS JoiningDate, CASE WHEN flgCurrent = 1 THEN '' ELSE FORMAT(ReleavingDate, 'dd-MMM-yyyy') END AS ReleavingDate, flgCurrent, SubscriberEmployerID, 
						  JobDescr AS Responsibilities
		FROM     tblSubscriberEmployer
		WHERE  (SubscriberID = @SubscriberID)

	select a.CityID, b.Descr AS City 
	FROM tblSubscriberPrefferedLocations a INNER JOIN tblMstrCily b ON a.CityID = b.CityID
	WHERE SubscriberID = @SubscriberID

	SELECT * FROM tblSubscriberTags WHERE SubscriberID = @SubscriberID
END
GO
