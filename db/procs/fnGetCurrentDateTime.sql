CREATE FUNCTION [dbo].[fnGetCurrentDateTime] () RETURNS datetime
AS
begin
return GETDATE()
--return CONVERT(datetime, SWITCHOFFSET(@dt, DATEPART(TZOFFSET, @dt AT TIME ZONE 'India Standard Time')))
end
GO
