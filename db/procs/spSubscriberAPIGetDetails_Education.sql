CREATE PROC [dbo].spSubscriberAPIGetDetails_Education
@SubscriberID BIGINT
AS
BEGIN

	SELECT b.DegreeName AS Course, c.DegreeName AS Degree, a.CourseTypeID, a.DegreeID, a.SubscriberEducationID, c.HighestSeq
	FROM     tblSubscriberEducation AS a INNER JOIN
					  tblMstrCourse AS b ON a.CourseTypeID = b.DegreeID INNER JOIN
					  tblMstrDegreeType AS c ON b.EducationTypeID = c.DegreeTypeID
	WHERE  (a.SubscriberID = @SubscriberID) ORDER BY c.HighestSeq

	SELECT CertificateName, SubscriberCertificateID
	FROM     tblSubscriberCertificate
	WHERE  (SubscriberID = @SubscriberID)


END
GO
