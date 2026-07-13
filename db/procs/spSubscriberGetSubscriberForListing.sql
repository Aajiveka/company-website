CREATE PROC [dbo].[spSubscriberGetSubscriberForListing]
@RoleID INT,@UserID BIGINT, @LoginID BIGINT, 
@CityID udt_ContactDetails READONLY,
@SkillID udt_ContactDetails READONLY,
@MinMaxExp udt_exp READONLY,
@DegreeTypeID udt_ContactDetails READONLY,
@FunctionAreaID udt_ContactDetails READONLY, 
@Gender udt_Gender READONLY--M/F/T
AS
BEGIN
	CREATE TABLE #Skill(SkillID INT)
	CREATE TABLE #City(CityID INT)
	CREATE TABLE #DegreeTypeID(DegreeTypeID INT)
	CREATE TABLE #FunctionAreaID(FunctionAreaID INT)
	CREATE TABLE #Gender(Gender CHAR(1))
	CREATE TABLE #Exp(MinExp INT, MAXExp INT)

	IF EXISTS(SELECT * FROM @SkillID)
		INSERT INTO #Skill SELECT ClientContactsID FROM @SkillID
	ELSE
		INSERT INTO #Skill SELECT SkillID FROM tblMstrSkills
	IF EXISTS(SELECT * FROM @CityID)
		INSERT INTO #City SELECT ClientContactsID FROM @CityID
	ELSE
		INSERT INTO #City SELECT CityID FROM tblMstrCily
	IF EXISTS(SELECT * FROM @DegreeTypeID)
		INSERT INTO #DegreeTypeID SELECT ClientContactsID FROM @DegreeTypeID
	ELSE
		INSERT INTO #DegreeTypeID SELECT DegreeTypeID FROM tblMstrDegreeType
	IF EXISTS(SELECT * FROM @FunctionAreaID)
		INSERT INTO #FunctionAreaID SELECT ClientContactsID FROM @FunctionAreaID
	ELSE
		INSERT INTO #FunctionAreaID SELECT SubFunctionID FROM tblMstrSubFunctions
	IF EXISTS(SELECT * FROM @Gender)
		INSERT INTO #Gender SELECT gender FROM @Gender
	ELSE
		INSERT INTO #Gender VALUES('M'),('F'),('T')
	IF EXISTS(SELECT * FROM @MinMaxExp)
		INSERT INTO #Exp SELECT MinExp,MaxExp FROM @MinMaxExp
	ELSE
		INSERT INTO #Exp VALUES(0,99)


	CREATE TABLE #SubscriberIDs(SubscriberID BIGINT)
	IF @RoleID = 2
		INSERT INTO #SubscriberIDs
		SELECT SubscriberID FROM tblSubscriberJobStatusLatest WHERE JobMapStatusID IN(1,3)
	ELSE IF @RoleID = 3
		INSERT INTO #SubscriberIDs
		SELECT SubscriberID FROM tblSubscriberJobStatusLatest WHERE JobMapStatusID IN(4)		
		
SELECT DISTINCT a.SubscriberID, CASE WHEN ISNULL(a.FullName,'') = '' THEN a.MobileNo1 ELSE  a.FullName END AS FullName, b.Descr AS FunctionArea, c.Descr AS CityName, c.CityID, s.Descr AS Skill, dbo.fncGetDocumentFolder(20)+a.PhotoName AS PhotoName, I.IndustryType, a.TotalExp,
ISNULL(FullName,'')+ ' '+ISNULL(c.Descr,'')+ ' '+ISNULL(IndustryType,'')+' '+ISNULL(s.Descr,'')+' '+ISNULL(b.Descr,'') AS strSearch, CASE WHEN cv.flgCVUploaded = 1 THEN 'CV Uplaoded' ELSE 'CV not Uploaded' END AS CVStatus
INTO #subscribers
FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
                  tblMstrFunctions AS b ON a.SubFunctionID = b.FunctionID LEFT OUTER JOIN
                  tblMstrCily AS c ON c.CityID = a.CityID LEFT OUTER JOIN
                  tblMstrSkills AS s ON s.SkillID = a.SkillID LEFT OUTER JOIN
                  tblMstrIndustryType AS I ON I.IndustryTypeID = a.IndustryTypeID INNER JOIN
                  [#Skill] AS sk ON sk.SkillID = s.SkillID INNER JOIN
                  [#City] AS ct ON ct.CityID = a.CityID INNER JOIN
                  [#Gender] AS g ON g.Gender = a.Gender INNER JOIN
                  tblSubscriberEducation AS ed ON a.SubscriberID = ed.SubscriberID INNER JOIN
                  [#DegreeTypeID] AS dt ON dt.DegreeTypeID = ed.DegreeID INNER JOIN
                  [#FunctionAreaID] AS FA ON fa.FunctionAreaID = a.SubFunctionID INNER JOIN
                  [#Exp] AS ex ON a.TotalExp BETWEEN ex.MinExp AND ex.MAXExp INNER JOIN tblSubscriberRegistration cv
				  ON a.SubscriberID  =cv.SubscriberID
				  INNER JOIN #SubscriberIDs sub ON a.SubscriberID = sub.SubscriberID

DECLARE @Skills VARCHAR(200)
SELECT a.SubscriberID, c.TagName INTO #tmpTags 
FROM tblSubscriberTags a INNER JOIN #SubscriberIDs b ON a.SubscriberID = b.SubscriberID INNER JOIN tblMstrTags c ON
a.TagID = c.TagID

CREATE TABLE #Tags(SubscriberID BIGINT,Tags VARCHAR(200))

INSERT INTO #Tags
SELECT SubscriberID,  
STUFF((SELECT DISTINCT ' ' + t2.TagName FROM #tmpTags t2 WHERE t2.SubscriberID = t1.SubscriberID FOR XML PATH('')),1,1,'')
FROM #tmpTags t1 GROUP BY SubscriberID

SELECT  DISTINCT a.SubscriberID, a.FullName, a.FunctionArea, a.CityName, a.Skill, a.PhotoName, a.IndustryType, a.TotalExp,
a.strSearch+' '+CVStatus+' '+b.Tags AS strSearch, a.CVStatus,b.Tags
FROM #subscribers a LEFT OUTER JOIN #Tags b ON a.SubscriberID = b.SubscriberID

--select * FROM #tmpTags

END
GO
