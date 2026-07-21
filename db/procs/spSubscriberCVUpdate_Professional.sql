CREATE PROC [dbo].[spSubscriberCVUpdate_Professional]
@SubscriberID bigint,
@LoginID bigint,
@UserID bigint,
@RoleID INT,
@SkillSetID INT,
@SubFunctionID INT,
@TotalExp INT,
@CTC DECIMAL(18,2),
@NoticePeriod TINYINT,
@PrefferedCityID udt_Education READONLY,
@CurrentCityID INT,
@flgReadyToRelocate TINYINT,
@IndustryTypeID INT,
@Tags udt_Education READONLY,
@strTag VARCHAR(500)
AS
BEGIN
	DECLARE @dt DATETIME = dbo.fnGetCurrentDateTime()
	print '1'
	DELETE FROM tblSubscriberPrefferedLocations WHERE SubscriberID = @SubscriberID
	INSERT INTO tblSubscriberPrefferedLocations(SubscriberID,CityID, LoginIDIns, TimestampIns)
	SELECT @SubscriberID,DegreeID, @LoginID, @DT FROM @PrefferedCityID
	print '2'
	UPDATE tblSubscriberCVDetails SET TotalExp = @TotalExp,CurrentCTC = @CTC,CurrentCityID = @CurrentCityID,
	flgReadyToRelocate = @flgReadyToRelocate,NoticePeriod = @NoticePeriod,TimestampUpd = @dt, loginIDUpd = @LoginID,
	IndustryTypeID = @IndustryTypeID, SkillID  =@SkillSetID, CityID = @CurrentCityID, SubFunctionID = @SubFunctionID,
	strTag = @strTag
	WHERE SubscriberID = @SubscriberID
	print '3'
	DELETE FROM tblSubscriberTags WHERE SubscriberID = @SubscriberID
	INSERT INTO tblSubscriberTags(SubscriberID,TagID)
	SELECT @SubscriberID,DegreeID FROM @Tags
	print '4'
	SELECT 1 AS flgSuccess
END
GO
