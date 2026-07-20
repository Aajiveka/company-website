CREATE PROC [dbo].[spSubscriberGetCVToDisplay]
@LoginID BIGINT,@UserID BIGINT, @SubscriberID BIGINT, @RoleID INT=2
AS
BEGIN

DECLARE @Skills VARCHAR(200)
SELECT a.SubscriberID, c.TagName INTO #tmpTags 
FROM tblSubscriberTags a INNER JOIN tblMstrTags c ON a.TagID = c.TagID WHERE SubscriberID = @SubscriberID


SELECT   
@Skills = STUFF((SELECT DISTINCT ' ' + t2.TagName FROM #tmpTags t2 WHERE t2.SubscriberID = t1.SubscriberID FOR XML PATH('')),1,1,'')
FROM #tmpTags t1 

CREATE TABLE [#Personl]([Name] VARCHAR(100),MobileNo VARCHAR(20),DOB VARCHAR(20),Gender VARCHAR(10),[Address] VARCHAR(500),CVPath VARCHAR(500),PhotoName VARCHAR(1000),
TotalExp VARCHAR(100),CurrentCTC VARCHAR(100),flgReadyToRelocate VARCHAR(10),NoticePeriod VARCHAR(10),IndustryType VARCHAR(100),EmailID VARCHAR(100),
City VARCHAR(100),Skill VARCHAR(100),[Function] VARCHAR(100),Skills VARCHAR(1000))

IF @RoleID = 2
	INSERT INTO        [#Personl]
	SELECT CASE WHEN ISNULL(a.FullName,'')= '' THEN a.MobileNo1 ELSE a.FullName END AS Name, a.MobileNo1 AS MobileNo, CASE WHEN YEAR(DOB) = 1900 THEN '' ELSE FORMAT(DOB, 'dd-MMM-yyyy') END AS DOB, 
	CASE WHEN a.Gender = 'M' THEN 'Male' WHEN a.Gender = 'F' THEN 'Female' ELSE 'Others' END AS Gender
	, a.AddressLine1 AS Address, a.CVPath, dbo.fncGetDocumentFolder(20)+a.PhotoName, a.TotalExp, FORMAT(a.CurrentCTC,'N0','en-in') AS CurrentCTC, 
					  a.flgReadyToRelocate, a.NoticePeriod, i.IndustryType, a.EmailID, c.Descr AS City, 
					  s.Descr AS Skill, f.Descr AS [Function],@Skills AS Skills
	
	FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
					  tblMstrCily AS b ON a.CityID = b.CityID LEFT OUTER JOIN
					  tblMstrIndustryType AS i ON a.IndustryTypeID = i.IndustryTypeID LEFT OUTER JOIN
					  tblMstrCily AS c ON a.CityID = c.CityID LEFT OUTER JOIN
					  tblMstrSkills AS s ON a.SkillID = s.SkillID LEFT OUTER JOIN
					  tblMstrFunctions AS f ON a.SubFunctionID = f.FunctionID
	WHERE  (a.SubscriberID = @SubscriberID)
ELSE 
	INSERT INTO        [#Personl]
	SELECT a.FullName AS Name, a.MobileNo1 AS MobileNo, CASE WHEN YEAR(DOB) = 1900 THEN '' ELSE FORMAT(DOB, 'dd-MMM-yyyy') END AS DOB, 
	CASE WHEN a.Gender = 'M' THEN 'Male' WHEN a.Gender = 'F' THEN 'Female' ELSE 'Others' END AS Gender
	, a.AddressLine1 AS Address, [dbo].[fncGetDocumentFolder](1)+a.CVPath AS CVPath, [dbo].[fncGetDocumentFolder](1)+a.PhotoName AS PhotoName, a.TotalExp, FORMAT(a.CurrentCTC,'N0','en-in') AS CurrentCTC, 
					  a.flgReadyToRelocate, a.NoticePeriod, i.IndustryType, a.EmailID, c.Descr AS City, 
					  s.Descr AS Skill, f.Descr AS [Function],@Skills AS Skills
	
	FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
					  tblMstrCily AS b ON a.CityID = b.CityID LEFT OUTER JOIN
					  tblMstrIndustryType AS i ON a.IndustryTypeID = i.IndustryTypeID LEFT OUTER JOIN
					  tblMstrCily AS c ON a.CityID = c.CityID LEFT OUTER JOIN
					  tblMstrSkills AS s ON a.SkillID = s.SkillID LEFT OUTER JOIN
					  tblMstrFunctions AS f ON a.SubFunctionID = f.FunctionID
	WHERE  (a.SubscriberID = @SubscriberID)


SELECT * FROM #Personl

SELECT b.DegreeName AS Course, c.DegreeName AS Degree, c.HighestSeq
FROM     tblSubscriberEducation AS a INNER JOIN
                  tblMstrCourse AS b ON a.CourseTypeID = b.DegreeID INNER JOIN
                  tblMstrDegreeType AS c ON b.EducationTypeID = c.DegreeTypeID
WHERE  (a.SubscriberID = @SubscriberID)
ORDER BY c.HighestSeq DESC

	SELECT CertificateName
	FROM     tblSubscriberCertificate
	WHERE  (SubscriberID = @SubscriberID)

	SELECT a.Employer, FORMAT(a.JoiningDate, 'dd-MMM-yyyy') AS JoiningDate, CASE WHEN flgCurrent = 1 THEN '' ELSE FORMAT(ReleavingDate, 'dd-MMM-yyyy') END AS ReleavingDate, a.flgCurrent, a.SubscriberEmployerID, 
                  a.JobDescr AS Responsibilities, '' AS Designation
FROM     tblSubscriberEmployer AS a --INNER JOIN
                  --tblMstrDesignation AS b ON a.DesignationID = b.DesignationID
WHERE  (a.SubscriberID = @SubscriberID) ORDER BY 2 DESC  

	select b.Descr AS City 
	FROM tblSubscriberPrefferedLocations a INNER JOIN tblMstrCily b ON a.CityID = b.CityID
	WHERE SubscriberID = @SubscriberID
END
GO
