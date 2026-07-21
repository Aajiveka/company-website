CREATE PROC spSubscriberAPIGetMaster_Persoanl
@SubscriberID BIGINT, @RoleID BIGINT
AS
BEGIN
	SELECT * FROM tblMstrState 
	Select * FROM tblMstrCily
END
GO
