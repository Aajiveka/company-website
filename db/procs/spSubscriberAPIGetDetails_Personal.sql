CREATE PROC [dbo].[spSubscriberAPIGetDetails_Personal]
@SubscriberID bigint
AS
BEGIN

SELECT a.FullName AS Name, a.MobileNo1 AS MobileNo, CASE WHEN YEAR(DOB) = 1900 THEN '' ELSE FORMAT(DOB, 'dd-MMM-yyyy') END AS DOB, a.Gender, a.AddressLine1 AS Address, 
dbo.fncGetDocumentFolder(20)+a.PhotoName AS PhotoName, a.CityID, b.StateID, b.Descr AS City, 
                  s.StateID AS Expr1, s.Descr AS State, a.EmailID, dbo.fncGetDocumentFolder(1)+a.CVPath AS CVPath
FROM     tblSubscriberCVDetails AS a LEFT OUTER JOIN
                  tblMstrCily AS b ON a.CityID = b.CityID LEFT OUTER JOIN
                  tblMstrState AS s ON b.StateID = s.StateID
WHERE  (a.SubscriberID = @SubscriberID)


END
GO
