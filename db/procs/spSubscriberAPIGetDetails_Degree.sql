CREATE PROC [dbo].[spSubscriberAPIGetDetails_Degree]
@LoginID BIGINT, @SubscriberID BIGINT
AS
	SELECT b.DegreeName AS Course, c.DegreeName AS Degree, a.CourseTypeID, a.DegreeID, a.SubscriberEducationID, c.HighestSeq
	FROM     tblSubscriberEducation AS a INNER JOIN
					  tblMstrCourse AS b ON a.DegreeID = b.DegreeID INNER JOIN
					  tblMstrDegreeType AS c ON b.EducationTypeID = c.DegreeTypeID
	WHERE  (a.SubscriberID = @SubscriberID) ORDER BY c.HighestSeq
GO
