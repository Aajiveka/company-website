CREATE TABLE [dbo].[tblCandidateDocumentMap] (

    [DocumentMapID] bigint IDENTITY(1,1) NOT NULL,
    [JobSubscriberMapID] bigint NULL,
    [SubscriberID] bigint NULL,
    [DocumentTypeID] int NULL,
    [flgStatus] tinyint NULL,
    [TimestampIns] datetime NULL,
    [LoginIDIns] int NULL,
    [TimestampUpd] datetime NULL,
    [LoginIDUpd] int NULL
);
GO

CREATE TABLE [dbo].[tblCandidateDocumentStatus] (

    [DocStatusID] bigint IDENTITY(1,1) NOT NULL,
    [DocUploadID] bigint NULL,
    [StatusID] int NULL,
    [comments] varchar(1000) NULL,
    [UserID] bigint NULL,
    [TimestampIns] datetime NULL,
    [LoginIDIns] int NULL
);
GO

CREATE TABLE [dbo].[tblCandidateDocumentUploaded] (

    [DocUploadID] bigint IDENTITY(1,1) NOT NULL,
    [DocumentMapID] bigint NULL,
    [SubscriberID] bigint NULL,
    [DocumentTypeID] int NULL,
    [DocumentPath] varchar(500) NULL,
    [flgStatus] tinyint NULL,
    [TimestampIns] datetime NULL,
    [LoginIDIns] int NULL,
    [TimestampUpd] datetime NULL,
    [LoginIDUpd] int NULL
);
GO

CREATE TABLE [dbo].[tblCandidateJobDocumentMap_1] (

    [CandidateJobDocumentMapID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberID] bigint NOT NULL,
    [JobSubscriberMapID] bigint NOT NULL,
    [DocumentID] int NOT NULL,
    [TImestampIns] datetime NOT NULL,
    [StatusID] int NOT NULL CONSTRAINT [DF_tblCandidateJobDocumentMap_StatusID] DEFAULT ((0))
);
GO

CREATE TABLE [dbo].[tblClientContacts] (

    [ClientContactsID] bigint IDENTITY(1,1) NOT NULL,
    [ClientID] bigint NOT NULL,
    [ContactPerName] varchar(100) NOT NULL,
    [PhoneNo] varchar(20) NULL,
    [Mobile] varchar(20) NULL,
    [EmailID] varchar(100) NULL,
    [RoleID] int NOT NULL,
    [ContactPersonRole] varchar(50) NULL,
    CONSTRAINT [PK__tblClien__12508ADE3EFBEAFD] PRIMARY KEY ( [ClientContactsID])
);
GO

CREATE TABLE [dbo].[tblClientJobs] (

    [JobID] bigint IDENTITY(1,1) NOT NULL,
    [ClientID] bigint NOT NULL,
    [DesignationID] int NOT NULL,
    [EmployeeTypeID] int NOT NULL,
    [WorkModeID] int NOT NULL,
    [JobDescr] nvarchar(MAX) NULL,
    [JobCandidateProfile] nvarchar(MAX) NULL,
    [MinExp] int NULL,
    [MaxEmp] int NULL,
    [MinCTC] int NOT NULL,
    [MaxCTC] int NOT NULL,
    [JobCityID] int NOT NULL,
    [StatusID] tinyint NULL,
    [TimestampIns] datetime NOT NULL,
    [LoginIDIns] bigint NOT NULL,
    [TimestampUpd] datetime NULL,
    [LoginIDUpd] bigint NULL,
    [IndustryTypeID] int NULL,
    CONSTRAINT [PK_tblClientJobs] PRIMARY KEY ( [JobID])
);
GO

CREATE TABLE [dbo].[tblClientJobs_EducationType] (

    [JobID] bigint NULL,
    [EducationTypeID] int NULL
);
GO

CREATE TABLE [dbo].[tblClientJobs_Gendermapping] (

    [JobID] bigint NULL,
    [Gender] char(1) NULL
);
GO

CREATE TABLE [dbo].[tblClientJobSkill] (

    [JobSkillID] bigint IDENTITY(1,1) NOT NULL,
    [JobID] bigint NOT NULL,
    [SkillID] int NOT NULL,
    CONSTRAINT [PK__tblClien__17C56FEDDB9DCCAF] PRIMARY KEY ( [JobSkillID])
);
GO

CREATE TABLE [dbo].[tblClientMstr] (

    [ClientID] bigint IDENTITY(1,1) NOT NULL,
    [ClientName] varchar(200) NOT NULL,
    [ClientAddress] varchar(500) NULL,
    [PIN] int NULL,
    [ContactNo] varchar(50) NULL,
    [EmailID] varchar(50) NULL,
    [CompanyLogo] varchar(200) NULL,
    [CityID] int NOT NULL,
    [companyWebsite] varchar(100) NULL,
    [companyDescr] varchar(5000) NULL,
    [TimestampIns] datetime NOT NULL,
    [LoginIDIns] bigint NOT NULL,
    [TimestampUpd] datetime NULL,
    [LoginIDUpd] bigint NULL,
    [UserID] bigint NULL,
    [IndustryTypeID] int NULL,
    CONSTRAINT [PK_tblClientMstr] PRIMARY KEY ( [ClientID])
);
GO

CREATE TABLE [dbo].[tblForgotPassword] (

    [forgotPasswordID] bigint IDENTITY(1,1) NOT NULL,
    [USERID] bigint NULL,
    [TimestampIns] datetime NULL
);
GO

CREATE TABLE [dbo].[tblJobInterviewStatus] (

    [InterviewStatusID] bigint IDENTITY(1,1) NOT NULL,
    [JobSubscriberMapID] bigint NULL,
    [InterviewTime] datetime NULL,
    [InterviewScheduledOn] datetime NULL,
    [TimestampIns] datetime NULL,
    [LoginIDIns] bigint NULL,
    [TimestampUpd] datetime NULL,
    [LoginIDUpd] bigint NULL,
    [InterviewModeID] int NULL,
    [InterviewLocation] varchar(100) NULL,
    [PraposedTime] datetime NULL
);
GO

CREATE TABLE [dbo].[tblJobSubscriberMapping] (

    [JobSubscriberMapID] bigint IDENTITY(1,1) NOT NULL,
    [JobID] bigint NULL,
    [SubscriberID] bigint NULL,
    [MapDate] date NULL,
    [JobMapStatusID] int NULL,
    [TimestampIns] datetime NULL,
    [LoginIDIns] bigint NULL,
    [TimestampUpd] datetime NULL,
    [LoginIDUpd] bigint NULL
);
GO

CREATE TABLE [dbo].[tblJobSubscriberStatus] (

    [StatusID] bigint IDENTITY(1,1) NOT NULL,
    [JobSubscriberMapID] bigint NULL,
    [JobMapStatusID] int NULL,
    [MappedbyUserID] int NULL,
    [MappedTimestamp] datetime NULL,
    [comments] varchar(5000) NULL,
    [TimestampIns] datetime NULL,
    [LoginIDIns] bigint NULL,
    [TimestampUpd] datetime NULL,
    [LoginIDUpd] bigint NULL
);
GO

CREATE TABLE [dbo].[tblMstrCategory] (

    [CategoryID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrca__Descr__239E4DCF] DEFAULT (NULL)
);
GO

CREATE TABLE [dbo].[tblMstrCily] (

    [CityID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrci__Descr__267ABA7A] DEFAULT (NULL),
    [StateID] int NULL CONSTRAINT [DF__tblmstrci__State__276EDEB3] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstrc__F2D21A96AC277E5B] PRIMARY KEY ( [CityID])
);
GO

CREATE TABLE [dbo].[tblMstrCountry] (

    [CountryID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrco__Descr__2A4B4B5E] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstrc__10D160BF17E52C4D] PRIMARY KEY ( [CountryID])
);
GO

CREATE TABLE [dbo].[tblMstrCourse] (

    [DegreeID] int IDENTITY(1,1) NOT NULL,
    [DegreeName] varchar(200) NOT NULL,
    [ShortForm] varchar(50) NOT NULL,
    [EducationTypeID] int NOT NULL
);
GO

CREATE TABLE [dbo].[tblMstrCourseSpecialization] (

    [CourseSpecializationID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(200) NULL CONSTRAINT [DF__tblmstrco__Descr__2D27B809] DEFAULT (NULL),
    [CourseTypeID] int NULL CONSTRAINT [DF__tblmstrco__Cours__2E1BDC42] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstrc__502C9638350A5838] PRIMARY KEY ( [CourseSpecializationID])
);
GO

CREATE TABLE [dbo].[tblMstrCourseType] (

    [CourseTypeID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NOT NULL CONSTRAINT [DF__tblmstrco__Descr__30F848ED] DEFAULT (NULL),
    [HighestSeq] tinyint NOT NULL,
    CONSTRAINT [PK__tblmstrc__817369529CF36982] PRIMARY KEY ( [CourseTypeID])
);
GO

CREATE TABLE [dbo].[tblMstrDegination_not] (

    [DesignationID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL
);
GO

CREATE TABLE [dbo].[tblMstrDegreeType] (

    [DegreeTypeID] int IDENTITY(1,1) NOT NULL,
    [DegreeName] varchar(100) NOT NULL,
    [HighestSeq] tinyint NOT NULL,
    CONSTRAINT [PK__tblMstrD__DD0FA05F7DFC09B5] PRIMARY KEY ( [DegreeTypeID])
);
GO

CREATE TABLE [dbo].[tblMstrDesignation] (

    [DesignationID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrde__Descr__33D4B598] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstrd__BABD603EC5F60B89] PRIMARY KEY ( [DesignationID])
);
GO

CREATE TABLE [dbo].[tblMstrDocuments] (

    [DocumentID] int IDENTITY(1,1) NOT NULL,
    [DocumentName] varchar(1000) NULL,
    [FolderName] varchar(1000) NULL,
    [flgCandidateUpload] tinyint NULL,
    [RootFolder] nvarchar(1000) NULL
);
GO

CREATE TABLE [dbo].[tblMstrDocumentStatus] (

    [StatusID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(50) NULL
);
GO

CREATE TABLE [dbo].[tblMstrDocumentType] (

    [DocumentTypeID] int IDENTITY(1,1) NOT NULL,
    [DocumentType] varchar(1000) NULL
);
GO

CREATE TABLE [dbo].[tblMstrEducationCollage] (

    [CollageID] int IDENTITY(1,1) NOT NULL,
    [CollageName] varchar(100) NULL CONSTRAINT [DF__tblmstred__Colla__36B12243] DEFAULT (NULL),
    [CityID] int NULL CONSTRAINT [DF__tblmstred__CityI__37A5467C] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstre__00881BCDA539CC36] PRIMARY KEY ( [CollageID])
);
GO

CREATE TABLE [dbo].[tblMstrEducationDegree] (

    [DegreeID] int IDENTITY(1,1) NOT NULL,
    [DegreeName] varchar(200) NOT NULL CONSTRAINT [DF__tblmstred__Degre__3A81B327] DEFAULT (NULL),
    [ShortForm] varchar(50) NOT NULL CONSTRAINT [DF__tblmstred__Short__3B75D760] DEFAULT (NULL),
    [EducationTypeID] int NOT NULL,
    CONSTRAINT [PK__tblmstre__4D9492CE1CEA6C06] PRIMARY KEY ( [DegreeID])
);
GO

CREATE TABLE [dbo].[tblMstrEducationType] (

    [EducationTypeID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NOT NULL CONSTRAINT [DF__tblmstred__Descr__3E52440B] DEFAULT (NULL),
    [HighestSeq] tinyint NULL,
    CONSTRAINT [PK__tblmstre__D24CA0333C12B747] PRIMARY KEY ( [EducationTypeID])
);
GO

CREATE TABLE [dbo].[tblMstrEmployeeType] (

    [EmployeeTypeID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrem__Descr__412EB0B6] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstre__1F1B6AB4FC634210] PRIMARY KEY ( [EmployeeTypeID])
);
GO

CREATE TABLE [dbo].[tblMstrEmployer] (

    [EmployerID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrem__Descr__440B1D61] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstre__CA44524185DB7916] PRIMARY KEY ( [EmployerID])
);
GO

CREATE TABLE [dbo].[tblMstrEmpType] (

    [EmployeeTypeID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL
);
GO

CREATE TABLE [dbo].[tblMstrFunctions] (

    [FunctionID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL
);
GO

CREATE TABLE [dbo].[tblMstrGender] (

    [GenderID] int IDENTITY(1,1) NOT NULL,
    [Gendor] varchar(1) NOT NULL
);
GO

CREATE TABLE [dbo].[tblMstrIndustryType] (

    [IndustryTypeID] int IDENTITY(1,1) NOT NULL,
    [IndustryType] varchar(100) NULL
);
GO

CREATE TABLE [dbo].[tblMstrInterviewMode] (

    [InterviewModeID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL
);
GO

CREATE TABLE [dbo].[tblMstrInviewStatus] (

    [InterviewStatusID] int IDENTITY(1,1) NOT NULL,
    [InterviewStatus] varchar(50) NULL
);
GO

CREATE TABLE [dbo].[tblMstrJobMappingStatus] (

    [JobMapStatusID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL
);
GO

CREATE TABLE [dbo].[tblMstrLanguage] (

    [LanguageID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrla__Descr__46E78A0C] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstrl__B938558B563B41DB] PRIMARY KEY ( [LanguageID])
);
GO

CREATE TABLE [dbo].[tblMstrMaritalStatus] (

    [MaritalStatusID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrma__Descr__49C3F6B7] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstrm__C8B1BA5233BFD768] PRIMARY KEY ( [MaritalStatusID])
);
GO

CREATE TABLE [dbo].[tblMstrPerson] (

    [PersonNodeID] bigint IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrpe__Descr__4CA06362] DEFAULT (NULL),
    [EmailID] varchar(100) NOT NULL CONSTRAINT [DF__tblmstrpe__Email__4D94879B] DEFAULT (NULL),
    [NodeType] int NULL CONSTRAINT [DF__tblmstrpe__NodeT__4E88ABD4] DEFAULT (NULL),
    [flgActive] tinyint NOT NULL CONSTRAINT [DF__tblmstrpe__flgAc__4F7CD00D] DEFAULT ('1'),
    [TImestampIns] datetime NULL CONSTRAINT [DF__tblmstrpe__TImes__5070F446] DEFAULT (NULL),
    [LoginIDIns] int NOT NULL,
    [TimestampUpd] datetime NULL CONSTRAINT [DF__tblmstrpe__Times__5165187F] DEFAULT (NULL),
    [LoginIDUpd] int NULL CONSTRAINT [DF__tblmstrpe__Login__52593CB8] DEFAULT (NULL),
    [ClientID] bigint NOT NULL,
    CONSTRAINT [PK__tblmstrp__5F457CD333C6D0A2] PRIMARY KEY ( [PersonNodeID])
);
GO

CREATE TABLE [dbo].[tblMstrPIN] (

    [PIN] int NOT NULL,
    [CityID] int NULL CONSTRAINT [DF__tblmstrpi__CityI__5535A963] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstrp__C577552A02758BB7] PRIMARY KEY ( [PIN])
);
GO

CREATE TABLE [dbo].[tblMstrSkills] (

    [SkillID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrsk__Descr__5812160E] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstrs__DFA091E79D27A32E] PRIMARY KEY ( [SkillID])
);
GO

CREATE TABLE [dbo].[tblMstrState] (

    [StateID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL CONSTRAINT [DF__tblmstrst__Descr__5AEE82B9] DEFAULT (NULL),
    [CountryID] int NULL CONSTRAINT [DF__tblmstrst__Count__5BE2A6F2] DEFAULT (NULL),
    CONSTRAINT [PK__tblmstrs__C3BA3B5A75A7795A] PRIMARY KEY ( [StateID])
);
GO

CREATE TABLE [dbo].[tblMstrStatus] (

    [StatusID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NOT NULL,
    [RoleID] int NOT NULL,
    [ActualStatusText] varchar(1000) NULL,
    CONSTRAINT [PK_tblMstrStatus] PRIMARY KEY ( [StatusID])
);
GO

CREATE TABLE [dbo].[tblMstrSubFunctions] (

    [SubFunctionID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL,
    [FunctionID] int NULL
);
GO

CREATE TABLE [dbo].[tblMstrTags] (

    [TagID] bigint IDENTITY(1,1) NOT NULL,
    [TagName] varchar(50) NOT NULL,
    [SkillID] int NOT NULL
);
GO

CREATE TABLE [dbo].[tblMstrWorkMode] (

    [WorkModeID] int IDENTITY(1,1) NOT NULL,
    [Descr] varchar(100) NULL
);
GO

CREATE TABLE [dbo].[tblPMstNodeTypes] (

    [NodeType] smallint NOT NULL,
    [NodeTypeDesc] nvarchar(100) NOT NULL,
    [Hierarchytable] nvarchar(50) NULL,
    [DetTable] nvarchar(50) NULL,
    [HierTypeID] tinyint NULL,
    [Level] tinyint NULL,
    [FrameID] tinyint NULL,
    [PersonType] int NULL,
    [FlgBusinessType] int NULL,
    [Dettablenamedcolumn] varchar(50) NULL,
    [Deltableidcolumn] varchar(50) NULL
);
GO

CREATE TABLE [dbo].[tblSecActiveSessions] (

    [RowID] int NOT NULL,
    [SessionID] varchar(50) NULL CONSTRAINT [DF__tblsecact__Sessi__5DCAEF64] DEFAULT (NULL),
    [UserID] int NULL CONSTRAINT [DF__tblsecact__UserI__5EBF139D] DEFAULT (NULL),
    [StartTime] datetime NULL CONSTRAINT [DF__tblsecact__Start__5FB337D6] DEFAULT (NULL)
);
GO

CREATE TABLE [dbo].[tblSecMapUserRoles] (

    [UserRoleMapID] bigint IDENTITY(1,1) NOT NULL,
    [UserID] bigint NOT NULL,
    [RoleId] int NOT NULL,
    [UserNodeId] bigint NOT NULL CONSTRAINT [DF__tblsecmap__UserN__628FA481] DEFAULT (NULL),
    [UserNodeType] int NOT NULL CONSTRAINT [DF__tblsecmap__UserN__6383C8BA] DEFAULT (NULL),
    CONSTRAINT [PK__tblsecma__D0684551D3FB0230] PRIMARY KEY ( [UserRoleMapID])
);
GO

CREATE TABLE [dbo].[tblSecMenuContextMenu] (

    [RowID] int IDENTITY(1,1) NOT NULL,
    [NodeType] int NOT NULL,
    [NodeTypeUnder] smallint NOT NULL,
    [HierTypeID] tinyint NOT NULL,
    [frmid] tinyint NULL CONSTRAINT [DF__tblsecmen__frmid__66603565] DEFAULT (NULL),
    [Descr] varchar(50) NULL CONSTRAINT [DF__tblsecmen__Descr__6754599E] DEFAULT (NULL),
    [UpperLevelNameForEdit] varchar(200) NULL CONSTRAINT [DF__tblsecmen__Upper__68487DD7] DEFAULT (NULL),
    [flgBusinessType] int NULL CONSTRAINT [DF__tblsecmen__flgBu__693CA210] DEFAULT (NULL),
    [NodeIDBusinessType] int NULL CONSTRAINT [DF__tblsecmen__NodeI__6A30C649] DEFAULT (NULL),
    [flgMap] tinyint NULL CONSTRAINT [DF__tblsecmen__flgMa__6B24EA82] DEFAULT (NULL),
    [flgChannel] tinyint NULL CONSTRAINT [DF__tblsecmen__flgCh__6C190EBB] DEFAULT (NULL),
    [flgPerson] tinyint NULL CONSTRAINT [DF__tblsecmen__flgPe__6D0D32F4] DEFAULT (NULL),
    [flgRoute] tinyint NULL CONSTRAINT [DF__tblsecmen__flgRo__6E01572D] DEFAULT (NULL),
    [flgMapType] tinyint NULL CONSTRAINT [DF__tblsecmen__flgMa__6EF57B66] DEFAULT (NULL),
    [flgCoverageArea] tinyint NULL CONSTRAINT [DF__tblsecmen__flgCo__6FE99F9F] DEFAULT (NULL),
    [flgDistributor] tinyint NULL CONSTRAINT [DF__tblsecmen__flgDi__70DDC3D8] DEFAULT (NULL),
    [flgMapDistributor] tinyint NULL CONSTRAINT [DF__tblsecmen__flgMa__71D1E811] DEFAULT (NULL),
    [flgMapBrands] tinyint NULL CONSTRAINT [DF__tblsecmen__flgMa__72C60C4A] DEFAULT (NULL),
    CONSTRAINT [PK__tblsecme__FFEE74518C8313B9] PRIMARY KEY ( [RowID])
);
GO

CREATE TABLE [dbo].[tblSecMenuHierarchy] (

    [MnID] smallint IDENTITY(1,1) NOT NULL,
    [MenuDescription] nvarchar(350) NULL,
    [MnParentID] smallint NULL,
    [SSClass] varchar(50) NULL,
    [ImageName] varchar(50) NULL,
    [OrderNum] smallint NULL,
    [flgMenuActive] tinyint NULL CONSTRAINT [DF_tblSecMenuHierarchy_flgMenuActive] DEFAULT ((0))
);
GO

CREATE TABLE [dbo].[tblSecMenuHierarchyRoles] (

    [ID] int IDENTITY(1,1) NOT NULL,
    [MnId] smallint NULL CONSTRAINT [DF__tblsecmenu__MnId__7C4F7684] DEFAULT (NULL),
    [RoleID] int NULL CONSTRAINT [DF__tblsecmen__RoleI__7D439ABD] DEFAULT (NULL),
    [ManageType] varchar(50) NULL CONSTRAINT [DF__tblsecmen__Manag__7E37BEF6] DEFAULT (NULL),
    CONSTRAINT [PK__tblsecme__3214EC27004249EF] PRIMARY KEY ( [ID])
);
GO

CREATE TABLE [dbo].[tblSecRoles] (

    [RoleId] int IDENTITY(1,1) NOT NULL,
    [RoleName] varchar(50) NOT NULL,
    [LoginIDIns] int NULL CONSTRAINT [DF__tblsecrol__Login__01142BA1] DEFAULT (NULL),
    [TimestampIns] datetime NULL CONSTRAINT [DF__tblsecrol__Times__02084FDA] DEFAULT (NULL),
    [LoginIDUpd] int NULL CONSTRAINT [DF__tblsecrol__Login__02FC7413] DEFAULT (NULL),
    [TimestampUpd] datetime NULL CONSTRAINT [DF__tblsecrol__Times__03F0984C] DEFAULT (NULL),
    CONSTRAINT [PK__tblsecro__8AFACE1A5399563B] PRIMARY KEY ( [RoleId])
);
GO

CREATE TABLE [dbo].[tblSecUser] (

    [UserID] bigint IDENTITY(1,1) NOT NULL,
    [NodeID] bigint NULL CONSTRAINT [DF__tblsecuse__NodeI__06CD04F7] DEFAULT (NULL),
    [NodeType] int NULL CONSTRAINT [DF__tblsecuse__NodeT__07C12930] DEFAULT (NULL),
    [UserName] varchar(50) NULL,
    [Password] varchar(50) NULL,
    [PwdStatus] int NULL CONSTRAINT [DF__tblsecuse__PwdSt__08B54D69] DEFAULT (NULL),
    [Active] char(1) NULL CONSTRAINT [DF__tblsecuse__Activ__09A971A2] DEFAULT (NULL),
    [LoginType] tinyint NULL CONSTRAINT [DF__tblsecuse__Login__0A9D95DB] DEFAULT (NULL),
    [RoleID] int NULL CONSTRAINT [DF__tblsecuse__RoleI__0B91BA14] DEFAULT (NULL),
    [UserMail] varchar(100) NULL CONSTRAINT [DF__tblsecuse__UserM__0C85DE4D] DEFAULT (NULL),
    CONSTRAINT [PK__tblsecus__1788CCACC0BAD780] PRIMARY KEY ( [UserID])
);
GO

CREATE TABLE [dbo].[tblSecUserLogin] (

    [LoginID] bigint IDENTITY(1,1) NOT NULL,
    [UserID] int NOT NULL,
    [LoginTime] datetime NOT NULL,
    [Logouttime] datetime NULL CONSTRAINT [DF__tblsecuse__Logou__0F624AF8] DEFAULT (NULL),
    [SessionID] varchar(50) NULL CONSTRAINT [DF__tblsecuse__Sessi__10566F31] DEFAULT (NULL),
    [IPAddress] varchar(50) NULL CONSTRAINT [DF__tblsecuse__IPAdd__114A936A] DEFAULT (NULL),
    [IsSessionEnd] tinyint NULL CONSTRAINT [DF__tblsecuse__IsSes__123EB7A3] DEFAULT (NULL),
    [LoginType] tinyint NULL CONSTRAINT [DF__tblsecuse__Login__1332DBDC] DEFAULT (NULL),
    [LogOutSrc] tinyint NULL CONSTRAINT [DF__tblsecuse__LogOu__14270015] DEFAULT (NULL),
    [IEVersion] varchar(50) NULL CONSTRAINT [DF__tblsecuse__IEVer__151B244E] DEFAULT (NULL),
    [ScrRsltn] varchar(50) NULL CONSTRAINT [DF__tblsecuse__ScrRs__160F4887] DEFAULT (NULL),
    [CenterID] int NULL CONSTRAINT [DF__tblsecuse__Cente__17036CC0] DEFAULT (NULL),
    [NodeID] int NULL,
    [NodeType] int NULL,
    CONSTRAINT [PK__tblsecus__4DDA2838437814A8] PRIMARY KEY ( [LoginID])
);
GO

CREATE TABLE [dbo].[tblSecUserRoleBasedPermissions] (

    [RoleSecID] int IDENTITY(1,1) NOT NULL,
    [UserId] int NULL CONSTRAINT [DF__tblsecuse__UserI__19DFD96B] DEFAULT (NULL),
    [RoleID] int NULL CONSTRAINT [DF__tblsecuse__RoleI__1AD3FDA4] DEFAULT (NULL),
    [NodeID] int NULL CONSTRAINT [DF__tblsecuse__NodeI__1BC821DD] DEFAULT (NULL),
    [NodeType] tinyint NULL CONSTRAINT [DF__tblsecuse__NodeT__1CBC4616] DEFAULT (NULL),
    [SecType] tinyint NULL CONSTRAINT [DF__tblsecuse__SecTy__1DB06A4F] DEFAULT (NULL),
    [HierTypeId] tinyint NULL CONSTRAINT [DF__tblsecuse__HierT__1EA48E88] DEFAULT (NULL),
    CONSTRAINT [PK__tblsecus__EBC27FA8754826B0] PRIMARY KEY ( [RoleSecID])
);
GO

CREATE TABLE [dbo].[tblSubscriberAwards] (

    [SubscriberAwardsID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberID] bigint NOT NULL CONSTRAINT [DF__tblsubscr__Subsc__2180FB33] DEFAULT (NULL),
    [AwardName] varchar(500) NULL CONSTRAINT [DF__tblsubscr__Award__22751F6C] DEFAULT (NULL),
    [AwardMonth] int NULL CONSTRAINT [DF__tblsubscr__Award__236943A5] DEFAULT (NULL),
    [AwardYear] int NULL CONSTRAINT [DF__tblsubscr__Award__245D67DE] DEFAULT (NULL),
    [Descr] varchar(5000) NULL CONSTRAINT [DF__tblsubscr__Descr__25518C17] DEFAULT (NULL),
    [TimestampIns] datetime NOT NULL CONSTRAINT [DF__tblsubscr__Times__2645B050] DEFAULT (NULL),
    [TimestampUpd] datetime NULL CONSTRAINT [DF__tblsubscr__Times__2739D489] DEFAULT (NULL),
    [LoginIDIns] bigint NOT NULL CONSTRAINT [DF__tblsubscr__Login__282DF8C2] DEFAULT (NULL),
    [loginIDUpd] bigint NULL CONSTRAINT [DF__tblsubscr__login__29221CFB] DEFAULT (NULL),
    CONSTRAINT [PK__tblsubsc__477177B1083B51B9] PRIMARY KEY ( [SubscriberAwardsID])
);
GO

CREATE TABLE [dbo].[tblSubscriberCertificate] (

    [SubscriberCertificateID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberID] bigint NOT NULL CONSTRAINT [DF__tblsubscr__Subsc__2BFE89A6] DEFAULT (NULL),
    [CertificateName] varchar(500) NOT NULL CONSTRAINT [DF__tblsubscr__Certi__2CF2ADDF] DEFAULT (NULL),
    [TimestampIns] datetime NOT NULL CONSTRAINT [DF__tblsubscr__Times__3493CFA7] DEFAULT (NULL),
    [TimestampUpd] datetime NULL CONSTRAINT [DF__tblsubscr__Times__3587F3E0] DEFAULT (NULL),
    [LoginIDIns] bigint NOT NULL CONSTRAINT [DF__tblsubscr__Login__367C1819] DEFAULT (NULL),
    [loginIDUpd] bigint NULL CONSTRAINT [DF__tblsubscr__login__37703C52] DEFAULT (NULL),
    CONSTRAINT [PK__tblsubsc__1ADC408588DF0B71] PRIMARY KEY ( [SubscriberCertificateID])
);
GO

CREATE TABLE [dbo].[tblSubscriberCVDetails] (

    [SubscriberID] bigint NOT NULL,
    [FullName] varchar(100) NULL,
    [AddressLine1] varchar(500) NULL,
    [MobileNo1] varchar(15) NOT NULL,
    [EmailID] varchar(100) NULL,
    [DOB] date NULL,
    [Gender] char(10) NULL,
    [TimestampIns] datetime NOT NULL,
    [TimestampUpd] datetime NULL,
    [LoginIDIns] bigint NOT NULL,
    [loginIDUpd] bigint NULL,
    [CityID] int NULL,
    [SkillID] int NULL,
    [SubFunctionID] int NULL,
    [TotalExp] int NULL,
    [CurrentCTC] decimal(18,0) NULL,
    [CurrentCityID] int NULL,
    [flgReadyToRelocate] tinyint NULL,
    [NoticePeriod] tinyint NULL,
    [PhotoName] varchar(500) NULL,
    [CVPath] nvarchar(2000) NULL,
    [IndustryTypeID] int NULL,
    [strTag] varchar(500) NULL
);
GO

CREATE TABLE [dbo].[tblSubscriberCVUploaded] (

    [SubscriberID] bigint NOT NULL,
    [LatestCVPath] varchar(200) NOT NULL CONSTRAINT [DF__tblsubscr__Lates__719CDDE7] DEFAULT (NULL),
    [CVName] varchar(1000) NOT NULL CONSTRAINT [DF__tblsubscr__CVNam__72910220] DEFAULT (NULL),
    [TimestampIns] datetime NOT NULL CONSTRAINT [DF__tblsubscr__Times__7C1A6C5A] DEFAULT (getdate()),
    [TImestampUpd] datetime NULL CONSTRAINT [DF__tblsubscr__TImes__7D0E9093] DEFAULT (NULL),
    [LoginIDIns] bigint NOT NULL CONSTRAINT [DF__tblsubscr__Login__7E02B4CC] DEFAULT (NULL),
    [LoginIDUpd] bigint NULL CONSTRAINT [DF__tblsubscr__Login__7EF6D905] DEFAULT (NULL),
    CONSTRAINT [PK_tblSubscribers] PRIMARY KEY ( [SubscriberID])
);
GO

CREATE TABLE [dbo].[tblSubscriberDocs_1] (

    [SubscriberDocID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberID] bigint NULL,
    [DocumentTypeID] int NULL,
    [DocumentPath] varchar(1000) NULL,
    [DocumentName] varchar(1000) NULL,
    [TImestampIns] datetime NULL,
    [LoginIDIns] bigint NULL,
    [TimestampUpd] datetime NULL,
    [LoginIDUpd] bigint NULL
);
GO

CREATE TABLE [dbo].[tblSubscriberDocsStatus_1] (

    [DocStatusID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberDocID] bigint NULL,
    [SubscriberID] bigint NULL,
    [StatusID] int NULL,
    [LoginIDIns] bigint NULL,
    [TImestampIns] datetime NULL,
    [Comments] varchar(2000) NULL
);
GO

CREATE TABLE [dbo].[tblSubscriberEducation] (

    [SubscriberEducationID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberID] bigint NOT NULL CONSTRAINT [DF__tblsubscr__Subsc__489AC854] DEFAULT (NULL),
    [CourseTypeID] int NOT NULL CONSTRAINT [DF__tblsubscr__Cours__498EEC8D] DEFAULT (NULL),
    [DegreeID] int NOT NULL CONSTRAINT [DF__tblsubscr__Colla__4A8310C6] DEFAULT (NULL),
    [TimestampIns] datetime NOT NULL CONSTRAINT [DF__tblsubscr__Times__503BEA1C] DEFAULT (NULL),
    [TimestampUpd] datetime NULL CONSTRAINT [DF__tblsubscr__Times__51300E55] DEFAULT (NULL),
    [LoginIDIns] bigint NOT NULL CONSTRAINT [DF__tblsubscr__Login__5224328E] DEFAULT (NULL),
    [loginIDUpd] bigint NULL CONSTRAINT [DF__tblsubscr__login__531856C7] DEFAULT (NULL),
    CONSTRAINT [PK__tblsubsc__3F080E5D405A0941] PRIMARY KEY ( [SubscriberEducationID])
);
GO

CREATE TABLE [dbo].[tblSubscriberEmployer] (

    [SubscriberEmployerID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberID] bigint NOT NULL,
    [EmployeeTypeID] int NULL CONSTRAINT [DF__tblsubscr__Emplo__55F4C372] DEFAULT (NULL),
    [Employer] varchar(1000) NOT NULL CONSTRAINT [DF__tblsubscr__Emplo__56E8E7AB] DEFAULT (NULL),
    [DesignationID] int NULL CONSTRAINT [DF__tblsubscr__Desig__57DD0BE4] DEFAULT (NULL),
    [JoiningDate] date NULL CONSTRAINT [DF__tblsubscr__Joini__58D1301D] DEFAULT (NULL),
    [ReleavingDate] date NULL CONSTRAINT [DF__tblsubscr__Relea__59C55456] DEFAULT (NULL),
    [Salary] int NULL CONSTRAINT [DF__tblsubscr__Salar__5AB9788F] DEFAULT (NULL),
    [JobDescr] varchar(5000) NULL CONSTRAINT [DF__tblsubscr__JobDe__5BAD9CC8] DEFAULT (NULL),
    [NoticePeriodDays] int NULL CONSTRAINT [DF__tblsubscr__Notic__5CA1C101] DEFAULT (NULL),
    [TimestampIns] datetime NOT NULL CONSTRAINT [DF__tblsubscr__Times__5D95E53A] DEFAULT (NULL),
    [TimestampUpd] datetime NULL CONSTRAINT [DF__tblsubscr__Times__5E8A0973] DEFAULT (NULL),
    [LoginIDIns] bigint NOT NULL CONSTRAINT [DF__tblsubscr__Login__5F7E2DAC] DEFAULT (NULL),
    [loginIDUpd] bigint NULL CONSTRAINT [DF__tblsubscr__login__607251E5] DEFAULT (NULL),
    [flgCurrent] tinyint NULL,
    CONSTRAINT [PK__tblsubsc__F700AE79D15F7CA9] PRIMARY KEY ( [SubscriberEmployerID])
);
GO

CREATE TABLE [dbo].[tblSubscriberJobStatusLatest] (

    [ClientID] bigint NOT NULL,
    [JobID] bigint NOT NULL,
    [JobSubscriberMapID] bigint NOT NULL,
    [JobMapStatusID] int NOT NULL,
    [TimestampIns] datetime NOT NULL,
    [flgClose] tinyint NOT NULL,
    [SubscriberID] bigint NOT NULL,
    [flgApprovedByQC] tinyint NULL CONSTRAINT [DF__tblSubscr__flgAp__369C13AA] DEFAULT ((0))
);
GO

CREATE TABLE [dbo].[tblSubscriberLanguage] (

    [SubscriberLanguageID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberID] bigint NULL CONSTRAINT [DF__tblsubscr__Subsc__634EBE90] DEFAULT (NULL),
    [LanguageID] int NULL CONSTRAINT [DF__tblsubscr__Langu__6442E2C9] DEFAULT (NULL),
    [flgRead] char(1) NULL CONSTRAINT [DF__tblsubscr__flgRe__65370702] DEFAULT (NULL),
    [flgWrite] char(1) NULL CONSTRAINT [DF__tblsubscr__flgWr__662B2B3B] DEFAULT (NULL),
    [flgSpeak] char(1) NULL CONSTRAINT [DF__tblsubscr__flgSp__671F4F74] DEFAULT (NULL),
    [ProficiencyID] int NULL CONSTRAINT [DF__tblsubscr__Profi__681373AD] DEFAULT (NULL),
    [TimestampIns] datetime NULL CONSTRAINT [DF__tblsubscr__Times__690797E6] DEFAULT (NULL),
    [TimestampUpd] datetime NULL CONSTRAINT [DF__tblsubscr__Times__69FBBC1F] DEFAULT (NULL),
    [LoginIDIns] bigint NULL CONSTRAINT [DF__tblsubscr__Login__6AEFE058] DEFAULT (NULL),
    [loginIDUpd] bigint NULL CONSTRAINT [DF__tblsubscr__login__6BE40491] DEFAULT (NULL),
    CONSTRAINT [PK__tblsubsc__7D7078F3F38F20F6] PRIMARY KEY ( [SubscriberLanguageID])
);
GO

CREATE TABLE [dbo].[tblSubscriberPrefferedLocations] (

    [PrefferedLocationsID] bigint NULL,
    [SubscriberID] bigint NULL,
    [CityID] int NULL,
    [LoginIDIns] bigint NULL,
    [TimestampIns] datetime NULL
);
GO

CREATE TABLE [dbo].[tblSubscriberRegistration] (

    [SubscriberID] bigint IDENTITY(1,1) NOT NULL,
    [RegistrationCountryCode] varchar(5) NOT NULL,
    [RegistrationMobileNo] varchar(10) NOT NULL,
    [RegistrationIPNo] varchar(50) NOT NULL,
    [RegistrationDateTime] datetime NOT NULL CONSTRAINT [DF__tblSubscr__Regis__66EA454A] DEFAULT (getdate()),
    [flgCVUploaded] tinyint NOT NULL CONSTRAINT [DF_tblSubscriberRegistration_flgCVUploaded] DEFAULT ((0)),
    [flgstatus] tinyint NULL,
    CONSTRAINT [PK_tblSubscriberRegistration] PRIMARY KEY ( [SubscriberID])
);
GO

CREATE TABLE [dbo].[tblSubscriberSkills] (

    [SubscriberSkillID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberID] bigint NULL CONSTRAINT [DF__tblsubscr__Subsc__01D345B0] DEFAULT (NULL),
    [SkillID] int NULL CONSTRAINT [DF__tblsubscr__Skill__02C769E9] DEFAULT (NULL),
    [TimestampIns] datetime NULL CONSTRAINT [DF__tblsubscr__Times__03BB8E22] DEFAULT (NULL),
    [TimestampUpd] datetime NULL CONSTRAINT [DF__tblsubscr__Times__04AFB25B] DEFAULT (NULL),
    [LoginIDIns] bigint NULL CONSTRAINT [DF__tblsubscr__Login__05A3D694] DEFAULT (NULL),
    [loginIDUpd] bigint NULL CONSTRAINT [DF__tblsubscr__login__0697FACD] DEFAULT (NULL),
    CONSTRAINT [PK__tblsubsc__19A4F5E79B4803EA] PRIMARY KEY ( [SubscriberSkillID])
);
GO

CREATE TABLE [dbo].[tblSubscriberStatusHistory] (

    [StatusHistoryID] bigint IDENTITY(1,1) NOT NULL,
    [SubscriberID] bigint NULL,
    [JobID] bigint NULL,
    [ClientID] bigint NULL,
    [JobSubscriberMapID] bigint NULL,
    [StatusID] int NULL,
    [UserID] bigint NULL,
    [comments] varchar(5000) NULL,
    [TimestampIns] datetime NULL,
    [LoginIDIns] bigint NULL
);
GO

CREATE TABLE [dbo].[tblSubscriberTags] (

    [SubscriberID] bigint NOT NULL,
    [TagID] bigint NOT NULL
);
GO

