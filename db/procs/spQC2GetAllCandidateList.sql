CREATE PROC [dbo].[spQC2GetAllCandidateList]
@LoginID BIGINT, @RoleID INT, @UserID BIGINT
AS

SELECT b.FullName AS CandidateName, b.MobileNo1 AS MobileNo, de.Descr AS JobName, 
F.Descr + ' - ' + s.Descr AS [Function], CAST('' AS VARCHAR(1000)) AS Tags, st.StatusID, 
a.SubscriberID, a.JobID, a.ClientID, cm.ClientName as CompanyName, st.Descr, sk.Descr as Skill,
CASE WHEN a.JobMapStatusID>=4 THEN 1 ELSE 0 END as flgLink
INTO   [#tmpData]
FROM  tblSubscriberJobStatusLatest AS a INNER JOIN
         tblSubscriberCVDetails AS b ON a.SubscriberID = b.SubscriberID LEFT OUTER JOIN
         tblMstrSubFunctions AS s ON s.SubFunctionID = b.SubFunctionID LEFT OUTER JOIN
         tblMstrFunctions AS F ON s.FunctionID = F.FunctionID LEFT OUTER JOIN
         tblMstrSkills AS sk ON sk.SkillID = b.SkillID LEFT OUTER JOIN
         tblClientJobs AS J ON a.JobID = J.JobID INNER JOIN
         tblMstrStatus AS st ON a.JobMapStatusID = st.StatusID LEFT OUTER JOIN
         tblClientMstr AS cm ON a.ClientID = cm.ClientID LEFT OUTER JOIN tblMstrDesignation de ON 
		 j.DesignationID = de.DesignationID

CREATE TABLE #Tags(SubscriberID BIGINT, Skills VARCHAR(1000))


SELECT a.SubscriberID, c.TagName INTO #tmpTags 
FROM tblSubscriberTags a INNER JOIN tblMstrTags c ON a.TagID = c.TagID INNER JOIN #tmpData b ON a.SubscriberID = b.SubscriberID

INSERT INTO #Tags
SELECT SubscriberID,  
STUFF((SELECT DISTINCT ' ' + t2.TagName FROM #tmpTags t2 WHERE t2.SubscriberID = t1.SubscriberID FOR XML PATH('')),1,1,'')
FROM #tmpTags t1 GROUP BY SubscriberID

UPDATE a SET Tags = b.Skills
FROM #tmpData a INNER JOIN #Tags b ON a.SubscriberID = b.SubscriberID

SELECT a.SubscriberID, a.ClientID, a.JobID, a.CandidateName, a.CompanyName,
a.JobName,a.[Function], a.Skill, a.Descr AS [Status], a.Tags,
ISNULL(a.CandidateName,'')+' '+ ISNULL(a.MobileNo,'')+' '+ ISNULL(a.CompanyName,'')+' '+ISNULL(a.JobName,'')+' '+ISNULL(a.[Function],'')+' '+ ISNULL(a.Skill,'') 
+' '+ISNULL(a.Descr,'') +' '+ ISNULL(a.Tags,'') AS strSearch,flgLink
FROM #tmpData a LEFT OUTER JOIN #Tags b ON a.SubscriberID = b.SubscriberID
GO
