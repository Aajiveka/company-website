-- Reconstructed CREATE TABLE DDL (partial, non-authoritative).
-- Columns inferred from stored-proc usage; types are best-effort.
-- Restore the .bak for the authoritative schema (see db/README.md).

CREATE TABLE [dbo].[tblClientContacts] (
    [ClientID] BIGINT,
    [ContactPerName] VARCHAR(200),
    [ContactPersonRole] VARCHAR(200),
    [EmailID] BIGINT,
    [Mobile] VARCHAR(200),
    [PhoneNo] VARCHAR(200),
    [RoleID] BIGINT
);
GO

CREATE TABLE [dbo].[tblClientJobs] (
    [ClientID] BIGINT,
    [DesignationID] BIGINT,
    [EmployeeTypeID] BIGINT,
    [IndustryTypeID] BIGINT,
    [JobCityID] BIGINT,
    [JobDescr] VARCHAR(MAX),
    [LoginIDIns] BIGINT,
    [MaxCTC] INT,
    [MaxEmp] VARCHAR(200),
    [MinCTC] INT,
    [MinExp] INT,
    [StatusID] BIGINT,
    [TimestampIns] DATETIME,
    [WorkModeID] BIGINT
);
GO

CREATE TABLE [dbo].[tblClientMstr] (
    [CityID] BIGINT,
    [ClientAddress] VARCHAR(MAX),
    [ClientName] VARCHAR(200),
    [CompanyLogo] VARCHAR(200),
    [ContactNo] VARCHAR(200),
    [EmailID] BIGINT,
    [IndustryTypeID] BIGINT,
    [LoginIDIns] BIGINT,
    [PIN] VARCHAR(200),
    [TimestampIns] DATETIME,
    [companyDescr] VARCHAR(MAX),
    [companyWebsite] VARCHAR(200)
);
GO

CREATE TABLE [dbo].[tblForgotPassword] (
    [EmailId] BIGINT,
    [ExpiryDate] DATETIME,
    [ID] BIGINT,
    [IsUsed] BIT,
    [Token] VARCHAR(200)
);
GO

CREATE TABLE [dbo].[tblJobSubscriberMapping] (
    [JobID] BIGINT,
    [JobMapStatusID] BIGINT,
    [LoginIDIns] BIGINT,
    [MapDate] DATETIME,
    [SubscriberID] BIGINT,
    [TimestampIns] DATETIME
);
GO

CREATE TABLE [dbo].[tblMstrPerson] (
    [Descr] VARCHAR(MAX),
    [EmailId] BIGINT,
    [MobileNo] VARCHAR(200),
    [PersonNodeID] BIGINT
);
GO

CREATE TABLE [dbo].[tblSecActiveSessions] (
    [RowID] BIGINT,
    [SessionID] BIGINT,
    [UserID] BIGINT
);
GO

CREATE TABLE [dbo].[tblSecMapUserRoles] (
    [RoleId] BIGINT,
    [UserID] BIGINT
);
GO

CREATE TABLE [dbo].[tblSecRoles] (
    [RoleId] BIGINT,
    [RoleName] VARCHAR(200)
);
GO

CREATE TABLE [dbo].[tblSecUser] (
    [Active] BIT,
    [NodeID] BIGINT,
    [NodeType] VARCHAR(200),
    [Password] VARCHAR(200),
    [PwdStatus] BIT,
    [UserID] BIGINT,
    [UserName] VARCHAR(200)
);
GO

CREATE TABLE [dbo].[tblSecUserLogin] (
    [BrwsrVer] VARCHAR(200),
    [IPAddress] VARCHAR(MAX),
    [IsSessionEnd] BIT,
    [LogOutSrc] VARCHAR(200),
    [LoginID] BIGINT,
    [Logouttime] VARCHAR(200),
    [ScrRsltn] VARCHAR(200),
    [SessionID] BIGINT,
    [UserID] BIGINT
);
GO

