-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[spSubscriberInterviews]
	@EmpNodeId BIGINT, @RoleID INT=1, @UserID bigint=0,	@LoginID BIGINT
AS
BEGIN	

	
	SELECT d.ClientName AS SearchText, a.JobSubscriberMapID AS InterviewMappingId, c.ClientID AS CompanyId, d.ClientName AS Company,
	FORMAT(a.InterviewTime, 'dd-MMM-yyyy hh:mm tt') AS [Schedule At], e.Descr AS Mode, 
					  a.InterviewLocation AS [Location],st.Descr as [Status],
					  CASE WHEN s.JobMapStatusID = 8 THEN 1 ELSE 0 END AS flgReschedule
					  
	--INTO        [#tmp]
	FROM     tblJobInterviewStatus AS a INNER JOIN
					  tblJobSubscriberMapping AS b ON a.JobSubscriberMapID = b.JobSubscriberMapID INNER JOIN
					  tblClientJobs AS c ON c.JobID = b.JobID INNER JOIN
					  tblClientMstr AS d ON d.ClientID = c.ClientID INNER JOIN
					  tblMstrInterviewMode AS e ON e.InterviewModeID = a.InterviewModeID INNER JOIN tblSubscriberJobStatusLatest s ON
					  a.JobSubscriberMapID = s.JobSubscriberMapID INNER JOIN tblMstrStatus st ON s.JobMapStatusID = st.StatusID
	WHERE b.SubscriberID = @EmpNodeId AND s.JobMapStatusID IN(8,9,10,11,12,13,14,29)


	--SELECT a.JobSubscriberMapID,c.Descr,a.JobMapStatusID INTO #STS
	--FROM tblJobSubscriberStatus a INNER JOIN 
	--(SELECT a.JobSubscriberMapID,MAX(StatusID) AS StatusID
	--FROM [#tmp] a INNER JOIN tblJobSubscriberStatus b ON a.JobSubscriberMapID = b.JobSubscriberMapID GROUP BY a.JobSubscriberMapID) b ON 
	--a.StatusID = b.StatusID INNER JOIN tblMstrJobMappingStatus c ON a.JobMapStatusID = c.JobMapStatusID
	

	--SELECT a.ClientName AS SearchText,a.JobSubscriberMapID AS InterviewMappingId,a.ClientID AS CompanyId,a.ClientName AS Company,
	--a.[Schedule At],a.Mode,a.InterviewLocation AS Location,b.Descr AS [Status],
	--CASE WHEN b.JobMapStatusID = 3 THEN 1 ELSE 0 END as flgReschedule
	--FROM [#tmp] a INNER JOIN #STS b ON a.JobSubscriberMapID = b.JobSubscriberMapID
END
GO
