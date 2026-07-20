CREATE PROC spSubscriberGetFilterForListing
@RoleID INT,@UserID BIGINT, @LoginID BIGINT
AS
BEGIN
	select CityID, Descr AS CityName from tblMstrCily ORDER BY 2
	select SkillID, Descr AS Skill FROM tblMstrSkills ORDER BY 2
	CREATE TABLE #Exp(id INT IDENTITY(1,1), ExpText VARCHAR(100), MinExp INT, MaxExp INT)
	INSERT INTO #Exp VALUES('All',-1,-1),('0-2 Years',0,2),('2-4 Years',2,4),('4-6 Years',4,6),
	('8-10 Years',8,10),('10-15 Years',10,15),('15-20 Years',15,20),('20+ Years',20,99)

	SELECT ExpText, MinExp, MaxExp FROM #Exp ORDER BY id

	SELECT DegreeTypeID, DegreeName FROM tblMstrDegreeType ORDER BY 1
	SELECT FunctionID, Descr AS FunctionalArea FROM tblMstrFunctions

END
GO
