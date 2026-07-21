CREATE PROC [dbo].[spClientGetMapDocumentsToCandiate_SRV]
@ROleID BIGINT, @LoginID BIGINT, @ClientID BIGINT, @JobID BIGINT
AS
BEGIN
	SELECT SubscriberID, FullName, 'TestJob01' AS JobName, FORMAT(TimestampIns, 'dd-MMM-yyyy') AS SelectedOn, FullName + ' TestJob01' AS strSearch, SubscriberID As JobSubscriberMapID from tblSubscriberCVDetails where FullName <> ''

	SELECT SubscriberID, '1' AS DocumentID, 'CV' AS DocumentName from tblSubscriberCVDetails where FullName <> ''
	Union
	SELECT SubscriberID, '3' AS DocumentID, 'Aadhar' AS DocumentName from tblSubscriberCVDetails where FullName <> ''
END
GO
