CREATE PROC [dbo].[spClientGetDocumentStatusMaster]
@ROleID BIGINT, @LoginID BIGINT, @UserID BIGINT
AS
BEGIN
	Select '-1' As StatusID, 'Not Upload' As 'Descr', '#808080' As ColorCode
	union
	Select '0' As StatusID, 'Pending' As 'Descr', '#4291df' As ColorCode
	union
	Select '1' As StatusID, 'Approved' As 'Descr', '#00fb00' As ColorCode
	union
	Select '2' As StatusID, 'Rejected' As 'Descr', '#ff0000' As ColorCode
END
GO
