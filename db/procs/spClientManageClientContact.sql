CREATE PROC [dbo].[spClientManageClientContact]
@UserID BIGINT,@LoginID BIGINT, @RoleID INT,
@ClientID BIGINT,
@ContactPerson VARCHAR(100),
@ContactPersonPhone VARCHAR(20),
@ContactMobile VARCHAR(100),
@contactEmail VARCHAR(100),
@contactRole VARCHAR(50),
@ClientContactsID BIGINT,
@flgRemove TINYINT
AS
BEGIN
	DECLARE @dt DATETIME = [dbo].[fnGetCurrentDateTime](), @PersonID BIGINT, @PersonUserID BIGINT

	IF @flgRemove = 1
		BEGIN
			DELETE FROM [tblClientContacts] WHERE ClientContactsID = @ClientContactsID
		END
	ELSE
		BEGIN
			IF @ClientContactsID = 0
				BEGIN
					INSERT INTO [dbo].[tblClientContacts](ClientID,ContactPerName,PhoneNo,Mobile,EmailID,ContactPersonRole,RoleID)
					VALUES(@ClientID,@ContactPerson,@ContactPersonPhone,@ContactMobile,@contactEmail,@contactRole,@RoleID)
					SET @ClientContactsID = SCOPE_IDENTITY()

					IF NOT EXISTS(SELECT * FROM tblMstrPerson WHERE EmailID = @contactEmail)
						BEGIN
							INSERT INTO tblMstrPerson(Descr,EmailID,NodeType,flgActive,TImestampIns,LoginIDIns,ClientID)
							VALUES(@ContactPerson, @contactEmail, 100,1,@dt,@LoginID, @ClientID)
							SET @PersonID = SCOPE_IDENTITY()
							INSERT INTO tblSecUser(NodeID, NodeType,UserName, Password,pwdStatus,Active,LoginType,RoleID,UserMail)
							VALUES(@PersonID,100,@contactEmail,@contactEmail,0,1,1,4,@contactEmail)
							SET @PersonUserID = SCOPE_IDENTITY()
							INSERT INTO [tblSecMapUserRoles](UserID,RoleID,UserNOdeID,UserNodeType)
							VALUES(@PersonUserID,4,@PersonID,100)

						END
				END
			ELSE
				BEGIN
					UPDATE [tblClientContacts] SET ContactPerName = @ContactPerson,PhoneNo = @ContactPersonPhone,Mobile = @ContactMobile,
					EmailID = @contactEmail,ContactPersonRole = @contactRole
					WHERE ClientContactsID = @ClientContactsID

					UPDATE tblMstrPerson SET Descr = @ContactPerson,ClientID = @ClientID, TimestampUpd = @dt, LoginIDUpd = @LoginID 
					WHERE EmailID = @contactEmail
				END
		END

		Select @ClientContactsID AS ClientContactsID
END
GO
