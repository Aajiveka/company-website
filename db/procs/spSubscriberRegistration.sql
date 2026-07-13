CREATE PROC [dbo].[spSubscriberRegistration]
@MobileNo VARCHAR(20),
@IpAddress VARCHAR(12)
AS
BEGIN
	
	SET @MobileNo = REPLACE(@MobileNo,'+91','')
	DECLARE @SubscriberID BIGINT = 0, @FullName VARCHAR(100)='', @RoleID INT=1, @UserID INT=0,	@LoginID BIGINT,
	@NodeType INT=100, @flgOld TINYINT=0
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()

	Select @SubscriberID = SubscriberID	FROM tblSubscriberRegistration WHERE RegistrationMobileNo = LTRIM(RTRIM(@MobileNo))

	IF @SubscriberID = 0
		BEGIN
			INSERT INTO tblSubscriberRegistration(RegistrationCountryCode,RegistrationMobileNo,RegistrationIPNo,RegistrationDateTime,
			flgstatus,flgCVUploaded)
			VALUES('91',LTRIM(RTRIM(@MobileNo)),@IpAddress,@dt,0,0)
			SET @SubscriberID = SCOPE_IDENTITY()
			INSERT INTO tblSubscriberCVDetails(SubscriberID,MobileNo1,LoginIDIns,TimestampIns)
			VALUES(@SubscriberID,@MobileNo,1,@dt)

			INSERT INTO tblSubscriberJobStatusLatest (ClientID,JobID,JobSubscriberMapID,JobMapStatusID,TimestampIns,flgClose,SubscriberID,flgApprovedByQC)
			VALUES(0,0,0,1,@dt,0,@SubscriberID,0)

			INSERT INTO [tblSubscriberStatusHistory](SubscriberID,[StatusID],[TimestampIns])
			VALUES(@SubscriberID,1,@dt)
		END
	ELSE
		BEGIN
			Select @FullName = [FullName]  FROM tblSubscriberCVDetails WHERE SubscriberID = @SubscriberID
			IF ISNULL(@FullName,'')<>''
				SET @FullName = @MobileNo
				SET @flgOld = 1
		END
	
	INSERT INTO tblsecuserlogin(UserID,LoginTime,Logouttime,SessionID,IPAddress,IsSessionEnd,NodeID,NodeType)
	VALUES(0,@dt,NULL,NULL,@IpAddress,0,@SubscriberID,@NodeType)
	SET @LoginID = SCOPE_IDENTITY()

	SELECT @SubscriberID AS SubscriberID, @FullName AS FullName, @LoginID AS LoginID, @RoleID AS RoleID, @SubscriberID AS UserID,@NodeType AS NodeType, @flgOld AS flgOld

END
GO
