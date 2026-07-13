CREATE PROC [dbo].[spClientGetJobSubscribersForInterview]
@JobID BIGINT, @LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS
BEGIN
	SELECT b.JobSubscriberMapID, MAX(StatusID) AS StatusID, a.SubscriberID INTO #MaxStatus
	FROM tblJobSubscriberMapping a INNER JOIN tblJobSubscriberStatus b ON a.JobSubscriberMapID = b.JobSubscriberMapID
	WHERE a.JobID = @JobID
	GROUP BY b.JobSubscriberMapID, a.SubscriberID

SELECT b.JobSubscriberMapID,b.SubscriberID, d.FullName, e.Descr AS City, dbo.fncGetDocumentFolder(20)+d.PhotoName AS PhotoName, i.IndustryType, f.Descr AS FunctionalArea,
FORMAT(s.InterviewTime,'yyyy-MM-dd HH:mm') AS InterviewTime, w.Descr AS InterviewMode
FROM     tblJobSubscriberStatus AS a INNER JOIN
                  [#MaxStatus] AS b ON a.StatusID = b.StatusID INNER JOIN
                  tblMstrJobMappingStatus AS c ON c.JobMapStatusID = a.JobMapStatusID INNER JOIN
                  tblSubscriberCVDetails AS d ON d.SubscriberID = b.SubscriberID INNER JOIN
                  tblMstrCily AS e ON e.CityID = d.CityID INNER JOIN
                  tblMstrIndustryType AS i ON d.IndustryTypeID = i.IndustryTypeID INNER JOIN
                  tblMstrFunctions AS f ON d.SubFunctionID = f.FunctionID
				  LEFT OUTER JOIN [tblJobInterviewStatus] s ON a.JobSubscriberMapID = s.JobSubscriberMapID
				  LEFT OUTER JOIN [dbo].[tblMstrInterviewMode] w ON s.InterviewModeID = w.InterviewModeID
WHERE c.JobMapStatusID IN(2,8)
END
GO
