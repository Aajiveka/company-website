CREATE PROC [dbo].[spCleatData]
AS

TRUNCATE TABLE tblSubscriberStatusHistory
TRUNCATE TABLE [dbo].[tblClientContacts]
TRUNCATE TABLE [dbo].[tblClientJobs]
TRUNCATE TABLE [dbo].[tblClientJobs_EducationType]
TRUNCATE TABLE [dbo].[tblClientJobs_Gendermapping]
TRUNCATE TABLE [dbo].[tblClientJobSkill]
TRUNCATE TABLE [dbo].[tblClientMstr]
TRUNCATE TABLE [dbo].[tblJobInterviewStatus]
TRUNCATE TABLE [dbo].[tblJobSubscriberMapping]
TRUNCATE TABLE [dbo].[tblJobSubscriberStatus]
TRUNCATE TABLE [dbo].[tblSubscriberAwards]
TRUNCATE TABLE [dbo].[tblSubscriberCVDetails]
TRUNCATE TABLE [dbo].[tblSubscriberCVUploaded]

TRUNCATE TABLE [dbo].[tblSubscriberEducation]
TRUNCATE TABLE [dbo].[tblSubscriberEmployer]
TRUNCATE TABLE [dbo].[tblSubscriberJobStatusLatest]
TRUNCATE TABLE [dbo].[tblSubscriberLanguage]
TRUNCATE TABLE [dbo].[tblSubscriberPrefferedLocations]
TRUNCATE TABLE [dbo].[tblSubscriberRegistration]
TRUNCATE TABLE [dbo].[tblSubscriberSkills]
TRUNCATE TABLE [dbo].[tblSubscriberTags]
GO
