CREATE PROC [dbo].[spClientGetCandidateDocumentStatus] 
@RoleID BIGINT, @LoginID BIGINT, @UserID BIGINT, @JobID BIGINT
AS
BEGIN
	SELECT SubscriberID, FullName, 'TestJob01' AS JobName, FORMAT(TimestampIns, 'dd-MMM-yyyy') AS SelectedOn, '' AS Document, FullName + ' TestJob01' AS strSearch, SubscriberID As JobSubscriberMapID from tblSubscriberCVDetails where FullName <> ''
	
	SELECT SubscriberID, '1' AS DocumentID, 'CV' AS DocumentName, 'Files/Temp/Test.pdf' As filepath, '0' As flgImg, '0' As flgStatus from tblSubscriberCVDetails where FullName <> ''
	Union
	SELECT SubscriberID, '20' AS DocumentID, 'Photo' AS DocumentName, 'Files/Temp/Test.jpg' As filepath, '1' As flgImg, '1' As flgStatus from tblSubscriberCVDetails where FullName <> ''
	Union
	SELECT SubscriberID, '20' AS DocumentID, 'ABCD' AS DocumentName, '' As filepath, '1' As flgImg, '-1' As flgStatus from tblSubscriberCVDetails where FullName <> ''
END
GO
