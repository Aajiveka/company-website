CREATE PROC [dbo].[spClientManageClient]
@UserID BIGINT,@LoginID BIGINT, @RoleID INT,
@ClientID BIGINT,
@ClientName VARCHAR(200),
@ClientAddress VARCHAR(500),
@PIN INT,
@ContactNo VARCHAR(50),
@EmailID VARCHAR(50),
@CityID INT,
@companyDescr VARCHAR(5000),
@CompanyLogo VARCHAR(200),
@Website VARCHAR(100),
@IndustryTypeID INT

AS
BEGIN

DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime]()

IF ISNULL(@ClientID,0) = 0
	BEGIN
		INSERT INTO [dbo].[tblClientMstr](ClientName,ClientAddress,PIN,ContactNo,EmailID,CompanyLogo,
		CityID,companyWebsite,companyDescr,TimestampIns,LoginIDIns,IndustryTypeID)
		VALUES(@ClientName,@ClientAddress,@PIN,@ContactNo,@EmailID, @CompanyLogo,@CityID,@Website,
		@companyDescr,@dt,@LoginID,@IndustryTypeID)
		SET @ClientID = SCOPE_IDENTITY()
		
	END
ELSE
	BEGIN
		UPDATE [tblClientMstr] SET ClientName  =@ClientName,ClientAddress = @ClientAddress,PIN = @PIN,ContactNo = @ContactNo,
		EmailID = @EmailID,CompanyLogo = @CompanyLogo,CityID = @CityID,companyWebsite = @Website,companyDescr = @companyDescr,
		TimestampUpd = @dt,LoginIDUpd = @LoginID,IndustryTypeID = IndustryTypeID
		WHERE ClientID = @ClientID

		
	END
select @ClientID AS ClientID
END
GO
