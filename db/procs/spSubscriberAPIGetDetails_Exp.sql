CREATE PROC [dbo].[spSubscriberAPIGetDetails_Exp]
@SubscriberID BIGINT
AS
BEGIN

		SELECT Employer, DesignationID, FORMAT(JoiningDate, 'dd-MMM-yyyy') AS JoiningDate, CASE WHEN flgCurrent = 1 THEN '' ELSE FORMAT(ReleavingDate, 'dd-MMM-yyyy') END AS ReleavingDate, flgCurrent, SubscriberEmployerID, 
						  JobDescr AS Responsibilities
		FROM     tblSubscriberEmployer
		WHERE  (SubscriberID = @SubscriberID)



END
GO
