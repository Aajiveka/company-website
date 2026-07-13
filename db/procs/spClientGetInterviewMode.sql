CREATE PROC spClientGetInterviewMode
AS
select InterviewModeID, Descr AS Interviewmode FROM tblMstrInterviewMode
GO
