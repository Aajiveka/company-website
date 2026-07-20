-- CreateTable
CREATE TABLE "tblCandidateDocumentMap" (
    "DocumentMapID" BIGSERIAL NOT NULL,
    "JobSubscriberMapID" BIGINT,
    "SubscriberID" BIGINT,
    "DocumentTypeID" INTEGER,
    "flgStatus" SMALLINT,
    "TimestampIns" TIMESTAMP(6),
    "LoginIDIns" INTEGER,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDUpd" INTEGER,

    CONSTRAINT "tblCandidateDocumentMap_pkey" PRIMARY KEY ("DocumentMapID")
);

-- CreateTable
CREATE TABLE "tblCandidateDocumentStatus" (
    "DocStatusID" BIGSERIAL NOT NULL,
    "DocUploadID" BIGINT,
    "StatusID" INTEGER,
    "comments" VARCHAR(1000),
    "UserID" BIGINT,
    "TimestampIns" TIMESTAMP(6),
    "LoginIDIns" INTEGER,

    CONSTRAINT "tblCandidateDocumentStatus_pkey" PRIMARY KEY ("DocStatusID")
);

-- CreateTable
CREATE TABLE "tblCandidateDocumentUploaded" (
    "DocUploadID" BIGSERIAL NOT NULL,
    "DocumentMapID" BIGINT,
    "SubscriberID" BIGINT,
    "DocumentTypeID" INTEGER,
    "DocumentPath" VARCHAR(500),
    "flgStatus" SMALLINT,
    "TimestampIns" TIMESTAMP(6),
    "LoginIDIns" INTEGER,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDUpd" INTEGER,

    CONSTRAINT "tblCandidateDocumentUploaded_pkey" PRIMARY KEY ("DocUploadID")
);

-- CreateTable
CREATE TABLE "tblClientContacts" (
    "ClientContactsID" BIGSERIAL NOT NULL,
    "ClientID" BIGINT NOT NULL,
    "ContactPerName" VARCHAR(100) NOT NULL,
    "PhoneNo" VARCHAR(20),
    "Mobile" VARCHAR(20),
    "EmailID" VARCHAR(100),
    "RoleID" INTEGER NOT NULL,
    "ContactPersonRole" VARCHAR(50),

    CONSTRAINT "tblClientContacts_pkey" PRIMARY KEY ("ClientContactsID")
);

-- CreateTable
CREATE TABLE "tblClientJobSkill" (
    "JobSkillID" BIGSERIAL NOT NULL,
    "JobID" BIGINT NOT NULL,
    "SkillID" INTEGER NOT NULL,

    CONSTRAINT "tblClientJobSkill_pkey" PRIMARY KEY ("JobSkillID")
);

-- CreateTable
CREATE TABLE "tblClientJobs" (
    "JobID" BIGSERIAL NOT NULL,
    "ClientID" BIGINT NOT NULL,
    "DesignationID" INTEGER NOT NULL,
    "EmployeeTypeID" INTEGER NOT NULL,
    "WorkModeID" INTEGER NOT NULL,
    "JobDescr" TEXT,
    "JobCandidateProfile" TEXT,
    "MinExp" INTEGER,
    "MaxEmp" INTEGER,
    "MinCTC" INTEGER NOT NULL,
    "MaxCTC" INTEGER NOT NULL,
    "JobCityID" INTEGER NOT NULL,
    "StatusID" INTEGER,
    "TimestampIns" TIMESTAMP(6) NOT NULL,
    "LoginIDIns" BIGINT NOT NULL,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDUpd" BIGINT,
    "IndustryTypeID" INTEGER,

    CONSTRAINT "tblClientJobs_pkey" PRIMARY KEY ("JobID")
);

-- CreateTable
CREATE TABLE "tblClientJobs_EducationType" (
    "JobID" BIGINT NOT NULL,
    "EducationTypeID" INTEGER NOT NULL,

    CONSTRAINT "tblClientJobs_EducationType_pkey" PRIMARY KEY ("JobID","EducationTypeID")
);

-- CreateTable
CREATE TABLE "tblClientJobs_Gendermapping" (
    "JobID" BIGINT NOT NULL,
    "Gender" CHAR(1) NOT NULL,

    CONSTRAINT "tblClientJobs_Gendermapping_pkey" PRIMARY KEY ("JobID","Gender")
);

-- CreateTable
CREATE TABLE "tblClientMstr" (
    "ClientID" BIGSERIAL NOT NULL,
    "ClientName" VARCHAR(200) NOT NULL,
    "ClientAddress" VARCHAR(500),
    "PIN" INTEGER,
    "ContactNo" VARCHAR(50),
    "EmailID" VARCHAR(50),
    "CompanyLogo" VARCHAR(200),
    "CityID" INTEGER NOT NULL,
    "companyWebsite" VARCHAR(100),
    "companyDescr" VARCHAR(5000),
    "TimestampIns" TIMESTAMP(6) NOT NULL,
    "LoginIDIns" BIGINT NOT NULL,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDUpd" BIGINT,
    "UserID" BIGINT,
    "IndustryTypeID" INTEGER,

    CONSTRAINT "tblClientMstr_pkey" PRIMARY KEY ("ClientID")
);

-- CreateTable
CREATE TABLE "tblForgotPassword" (
    "forgotPasswordID" BIGSERIAL NOT NULL,
    "USERID" BIGINT,
    "TimestampIns" TIMESTAMP(6),

    CONSTRAINT "tblForgotPassword_pkey" PRIMARY KEY ("forgotPasswordID")
);

-- CreateTable
CREATE TABLE "tblJobInterviewStatus" (
    "InterviewStatusID" BIGSERIAL NOT NULL,
    "JobSubscriberMapID" BIGINT,
    "InterviewTime" TIMESTAMP(6),
    "InterviewScheduledOn" TIMESTAMP(6),
    "TimestampIns" TIMESTAMP(6),
    "LoginIDIns" BIGINT,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDUpd" BIGINT,
    "InterviewModeID" INTEGER,
    "InterviewLocation" VARCHAR(100),
    "PraposedTime" TIMESTAMP(6),

    CONSTRAINT "tblJobInterviewStatus_pkey" PRIMARY KEY ("InterviewStatusID")
);

-- CreateTable
CREATE TABLE "tblJobSubscriberMapping" (
    "JobSubscriberMapID" BIGSERIAL NOT NULL,
    "JobID" BIGINT,
    "SubscriberID" BIGINT,
    "MapDate" DATE,
    "JobMapStatusID" INTEGER,
    "TimestampIns" TIMESTAMP(6),
    "LoginIDIns" BIGINT,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDUpd" BIGINT,

    CONSTRAINT "tblJobSubscriberMapping_pkey" PRIMARY KEY ("JobSubscriberMapID")
);

-- CreateTable
CREATE TABLE "tblJobSubscriberStatus" (
    "StatusID" BIGSERIAL NOT NULL,
    "JobSubscriberMapID" BIGINT,
    "JobMapStatusID" INTEGER,
    "MappedbyUserID" INTEGER,
    "MappedTimestamp" TIMESTAMP(6),
    "comments" VARCHAR(5000),
    "TimestampIns" TIMESTAMP(6),
    "LoginIDIns" BIGINT,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDUpd" BIGINT,

    CONSTRAINT "tblJobSubscriberStatus_pkey" PRIMARY KEY ("StatusID")
);

-- CreateTable
CREATE TABLE "tblMstrCily" (
    "CityID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),
    "StateID" INTEGER,

    CONSTRAINT "tblMstrCily_pkey" PRIMARY KEY ("CityID")
);

-- CreateTable
CREATE TABLE "tblMstrCountry" (
    "CountryID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),

    CONSTRAINT "tblMstrCountry_pkey" PRIMARY KEY ("CountryID")
);

-- CreateTable
CREATE TABLE "tblMstrCourse" (
    "DegreeID" SERIAL NOT NULL,
    "DegreeName" VARCHAR(200) NOT NULL,
    "ShortForm" VARCHAR(50) NOT NULL,
    "EducationTypeID" INTEGER NOT NULL,

    CONSTRAINT "tblMstrCourse_pkey" PRIMARY KEY ("DegreeID")
);

-- CreateTable
CREATE TABLE "tblMstrCourseType" (
    "CourseTypeID" SERIAL NOT NULL,
    "Descr" VARCHAR(100) NOT NULL,
    "HighestSeq" SMALLINT NOT NULL,

    CONSTRAINT "tblMstrCourseType_pkey" PRIMARY KEY ("CourseTypeID")
);

-- CreateTable
CREATE TABLE "tblMstrDegreeType" (
    "DegreeTypeID" SERIAL NOT NULL,
    "DegreeName" VARCHAR(100) NOT NULL,
    "HighestSeq" SMALLINT NOT NULL,

    CONSTRAINT "tblMstrDegreeType_pkey" PRIMARY KEY ("DegreeTypeID")
);

-- CreateTable
CREATE TABLE "tblMstrDesignation" (
    "DesignationID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),

    CONSTRAINT "tblMstrDesignation_pkey" PRIMARY KEY ("DesignationID")
);

-- CreateTable
CREATE TABLE "tblMstrDocumentStatus" (
    "StatusID" SERIAL NOT NULL,
    "Descr" VARCHAR(50),

    CONSTRAINT "tblMstrDocumentStatus_pkey" PRIMARY KEY ("StatusID")
);

-- CreateTable
CREATE TABLE "tblMstrDocumentType" (
    "DocumentTypeID" SERIAL NOT NULL,
    "DocumentType" VARCHAR(1000),

    CONSTRAINT "tblMstrDocumentType_pkey" PRIMARY KEY ("DocumentTypeID")
);

-- CreateTable
CREATE TABLE "tblMstrDocuments" (
    "DocumentID" SERIAL NOT NULL,
    "DocumentName" VARCHAR(1000),
    "FolderName" VARCHAR(1000),
    "flgCandidateUpload" SMALLINT,
    "RootFolder" VARCHAR(1000),

    CONSTRAINT "tblMstrDocuments_pkey" PRIMARY KEY ("DocumentID")
);

-- CreateTable
CREATE TABLE "tblMstrEducationDegree" (
    "DegreeID" SERIAL NOT NULL,
    "DegreeName" VARCHAR(200) NOT NULL,
    "ShortForm" VARCHAR(50) NOT NULL,
    "EducationTypeID" INTEGER NOT NULL,

    CONSTRAINT "tblMstrEducationDegree_pkey" PRIMARY KEY ("DegreeID")
);

-- CreateTable
CREATE TABLE "tblMstrEducationType" (
    "EducationTypeID" SERIAL NOT NULL,
    "Descr" VARCHAR(100) NOT NULL,
    "HighestSeq" SMALLINT,

    CONSTRAINT "tblMstrEducationType_pkey" PRIMARY KEY ("EducationTypeID")
);

-- CreateTable
CREATE TABLE "tblMstrEmpType" (
    "EmployeeTypeID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),

    CONSTRAINT "tblMstrEmpType_pkey" PRIMARY KEY ("EmployeeTypeID")
);

-- CreateTable
CREATE TABLE "tblMstrFunctions" (
    "FunctionID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),

    CONSTRAINT "tblMstrFunctions_pkey" PRIMARY KEY ("FunctionID")
);

-- CreateTable
CREATE TABLE "tblMstrGender" (
    "GenderID" SERIAL NOT NULL,
    "Gendor" VARCHAR(1) NOT NULL,

    CONSTRAINT "tblMstrGender_pkey" PRIMARY KEY ("GenderID")
);

-- CreateTable
CREATE TABLE "tblMstrIndustryType" (
    "IndustryTypeID" SERIAL NOT NULL,
    "IndustryType" VARCHAR(100),

    CONSTRAINT "tblMstrIndustryType_pkey" PRIMARY KEY ("IndustryTypeID")
);

-- CreateTable
CREATE TABLE "tblMstrInterviewMode" (
    "InterviewModeID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),

    CONSTRAINT "tblMstrInterviewMode_pkey" PRIMARY KEY ("InterviewModeID")
);

-- CreateTable
CREATE TABLE "tblMstrInviewStatus" (
    "InterviewStatusID" SERIAL NOT NULL,
    "InterviewStatus" VARCHAR(50),

    CONSTRAINT "tblMstrInviewStatus_pkey" PRIMARY KEY ("InterviewStatusID")
);

-- CreateTable
CREATE TABLE "tblMstrJobMappingStatus" (
    "JobMapStatusID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),

    CONSTRAINT "tblMstrJobMappingStatus_pkey" PRIMARY KEY ("JobMapStatusID")
);

-- CreateTable
CREATE TABLE "tblMstrPerson" (
    "PersonNodeID" BIGSERIAL NOT NULL,
    "Descr" VARCHAR(100),
    "EmailID" VARCHAR(100) NOT NULL,
    "NodeType" INTEGER,
    "flgActive" SMALLINT NOT NULL,
    "TImestampIns" TIMESTAMP(6),
    "LoginIDIns" INTEGER NOT NULL,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDUpd" INTEGER,
    "ClientID" BIGINT,

    CONSTRAINT "tblMstrPerson_pkey" PRIMARY KEY ("PersonNodeID")
);

-- CreateTable
CREATE TABLE "tblMstrSkills" (
    "SkillID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),

    CONSTRAINT "tblMstrSkills_pkey" PRIMARY KEY ("SkillID")
);

-- CreateTable
CREATE TABLE "tblMstrState" (
    "StateID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),
    "CountryID" INTEGER,

    CONSTRAINT "tblMstrState_pkey" PRIMARY KEY ("StateID")
);

-- CreateTable
CREATE TABLE "tblMstrStatus" (
    "StatusID" SERIAL NOT NULL,
    "Descr" VARCHAR(100) NOT NULL,
    "RoleID" INTEGER NOT NULL,
    "ActualStatusText" VARCHAR(1000),

    CONSTRAINT "tblMstrStatus_pkey" PRIMARY KEY ("StatusID")
);

-- CreateTable
CREATE TABLE "tblMstrSubFunctions" (
    "SubFunctionID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),
    "FunctionID" INTEGER,

    CONSTRAINT "tblMstrSubFunctions_pkey" PRIMARY KEY ("SubFunctionID")
);

-- CreateTable
CREATE TABLE "tblMstrTags" (
    "TagID" BIGSERIAL NOT NULL,
    "TagName" VARCHAR(50) NOT NULL,
    "SkillID" INTEGER NOT NULL,

    CONSTRAINT "tblMstrTags_pkey" PRIMARY KEY ("TagID")
);

-- CreateTable
CREATE TABLE "tblMstrWorkMode" (
    "WorkModeID" SERIAL NOT NULL,
    "Descr" VARCHAR(100),

    CONSTRAINT "tblMstrWorkMode_pkey" PRIMARY KEY ("WorkModeID")
);

-- CreateTable
CREATE TABLE "tblPMstNodeTypes" (
    "NodeType" SMALLINT NOT NULL,
    "NodeTypeDesc" VARCHAR(100) NOT NULL,
    "Hierarchytable" VARCHAR(50),
    "DetTable" VARCHAR(50),
    "HierTypeID" SMALLINT,
    "Level" SMALLINT,
    "FrameID" SMALLINT,
    "PersonType" INTEGER,
    "FlgBusinessType" INTEGER,
    "Dettablenamedcolumn" VARCHAR(50),
    "Deltableidcolumn" VARCHAR(50),

    CONSTRAINT "tblPMstNodeTypes_pkey" PRIMARY KEY ("NodeType")
);

-- CreateTable
CREATE TABLE "tblSecActiveSessions" (
    "RowID" SERIAL NOT NULL,
    "SessionID" VARCHAR(50),
    "UserID" INTEGER,
    "StartTime" TIMESTAMP(6),

    CONSTRAINT "tblSecActiveSessions_pkey" PRIMARY KEY ("RowID")
);

-- CreateTable
CREATE TABLE "tblSecMapUserRoles" (
    "UserRoleMapID" BIGSERIAL NOT NULL,
    "UserID" BIGINT NOT NULL,
    "RoleId" INTEGER NOT NULL,
    "UserNodeId" BIGINT NOT NULL,
    "UserNodeType" INTEGER NOT NULL,

    CONSTRAINT "tblSecMapUserRoles_pkey" PRIMARY KEY ("UserRoleMapID")
);

-- CreateTable
CREATE TABLE "tblSecMenuContextMenu" (
    "RowID" SERIAL NOT NULL,
    "NodeType" INTEGER NOT NULL,
    "NodeTypeUnder" SMALLINT NOT NULL,
    "HierTypeID" SMALLINT NOT NULL,
    "frmid" SMALLINT,
    "Descr" VARCHAR(50),
    "UpperLevelNameForEdit" VARCHAR(200),
    "flgBusinessType" INTEGER,
    "NodeIDBusinessType" INTEGER,
    "flgMap" SMALLINT,
    "flgChannel" SMALLINT,
    "flgPerson" SMALLINT,
    "flgRoute" SMALLINT,
    "flgMapType" SMALLINT,
    "flgCoverageArea" SMALLINT,
    "flgDistributor" SMALLINT,
    "flgMapDistributor" SMALLINT,
    "flgMapBrands" SMALLINT,

    CONSTRAINT "tblSecMenuContextMenu_pkey" PRIMARY KEY ("RowID")
);

-- CreateTable
CREATE TABLE "tblSecMenuHierarchy" (
    "MnID" SMALLSERIAL NOT NULL,
    "MenuDescription" VARCHAR(350),
    "MnParentID" SMALLINT,
    "SSClass" VARCHAR(50),
    "ImageName" VARCHAR(50),
    "OrderNum" SMALLINT,
    "flgMenuActive" SMALLINT,

    CONSTRAINT "tblSecMenuHierarchy_pkey" PRIMARY KEY ("MnID")
);

-- CreateTable
CREATE TABLE "tblSecMenuHierarchyRoles" (
    "ID" SERIAL NOT NULL,
    "MnId" SMALLINT,
    "RoleID" INTEGER,
    "ManageType" VARCHAR(50),

    CONSTRAINT "tblSecMenuHierarchyRoles_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "tblSecRoles" (
    "RoleId" SERIAL NOT NULL,
    "RoleName" VARCHAR(50) NOT NULL,
    "LoginIDIns" INTEGER,
    "TimestampIns" TIMESTAMP(6),
    "LoginIDUpd" INTEGER,
    "TimestampUpd" TIMESTAMP(6),

    CONSTRAINT "tblSecRoles_pkey" PRIMARY KEY ("RoleId")
);

-- CreateTable
CREATE TABLE "tblSecUser" (
    "UserID" BIGSERIAL NOT NULL,
    "NodeID" BIGINT,
    "NodeType" INTEGER,
    "UserName" VARCHAR(50),
    "Password" VARCHAR(255),
    "PwdStatus" INTEGER,
    "Active" CHAR(1),
    "LoginType" SMALLINT,
    "RoleID" INTEGER,
    "UserMail" VARCHAR(100),

    CONSTRAINT "tblSecUser_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "tblSecUserLogin" (
    "LoginID" BIGSERIAL NOT NULL,
    "UserID" BIGINT,
    "LoginTime" TIMESTAMP(6) NOT NULL,
    "Logouttime" TIMESTAMP(6),
    "SessionID" VARCHAR(50),
    "IPAddress" VARCHAR(50),
    "IsSessionEnd" SMALLINT,
    "LoginType" SMALLINT,
    "LogOutSrc" SMALLINT,
    "IEVersion" VARCHAR(50),
    "ScrRsltn" VARCHAR(50),
    "CenterID" INTEGER,
    "NodeID" INTEGER,
    "NodeType" INTEGER,

    CONSTRAINT "tblSecUserLogin_pkey" PRIMARY KEY ("LoginID")
);

-- CreateTable
CREATE TABLE "tblSubscriberAwards" (
    "SubscriberAwardsID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT NOT NULL,
    "AwardName" VARCHAR(500),
    "AwardMonth" INTEGER,
    "AwardYear" INTEGER,
    "Descr" VARCHAR(5000),
    "TimestampIns" TIMESTAMP(6) NOT NULL,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDIns" BIGINT NOT NULL,
    "loginIDUpd" BIGINT,

    CONSTRAINT "tblSubscriberAwards_pkey" PRIMARY KEY ("SubscriberAwardsID")
);

-- CreateTable
CREATE TABLE "tblSubscriberCVDetails" (
    "SubscriberID" BIGINT NOT NULL,
    "FullName" VARCHAR(100),
    "AddressLine1" VARCHAR(500),
    "MobileNo1" VARCHAR(15) NOT NULL,
    "EmailID" VARCHAR(100),
    "DOB" DATE,
    "Gender" CHAR(10),
    "TimestampIns" TIMESTAMP(6) NOT NULL,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDIns" BIGINT NOT NULL,
    "loginIDUpd" BIGINT,
    "CityID" INTEGER,
    "SkillID" INTEGER,
    "SubFunctionID" INTEGER,
    "TotalExp" INTEGER,
    "CurrentCTC" DECIMAL(18,0),
    "CurrentCityID" INTEGER,
    "flgReadyToRelocate" SMALLINT,
    "NoticePeriod" SMALLINT,
    "PhotoName" VARCHAR(500),
    "CVPath" VARCHAR(2000),
    "IndustryTypeID" INTEGER,
    "strTag" VARCHAR(500),

    CONSTRAINT "tblSubscriberCVDetails_pkey" PRIMARY KEY ("SubscriberID")
);

-- CreateTable
CREATE TABLE "tblSubscriberCVUploaded" (
    "SubscriberID" BIGINT NOT NULL,
    "LatestCVPath" VARCHAR(200) NOT NULL,
    "CVName" VARCHAR(1000) NOT NULL,
    "TimestampIns" TIMESTAMP(6) NOT NULL,
    "TImestampUpd" TIMESTAMP(6),
    "LoginIDIns" BIGINT NOT NULL,
    "LoginIDUpd" BIGINT,

    CONSTRAINT "tblSubscriberCVUploaded_pkey" PRIMARY KEY ("SubscriberID")
);

-- CreateTable
CREATE TABLE "tblSubscriberCertificate" (
    "SubscriberCertificateID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT NOT NULL,
    "CertificateName" VARCHAR(500) NOT NULL,
    "TimestampIns" TIMESTAMP(6) NOT NULL,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDIns" BIGINT NOT NULL,
    "loginIDUpd" BIGINT,

    CONSTRAINT "tblSubscriberCertificate_pkey" PRIMARY KEY ("SubscriberCertificateID")
);

-- CreateTable
CREATE TABLE "tblSubscriberEducation" (
    "SubscriberEducationID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT NOT NULL,
    "CourseTypeID" INTEGER,
    "DegreeID" INTEGER,
    "TimestampIns" TIMESTAMP(6) NOT NULL,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDIns" BIGINT NOT NULL,
    "loginIDUpd" BIGINT,

    CONSTRAINT "tblSubscriberEducation_pkey" PRIMARY KEY ("SubscriberEducationID")
);

-- CreateTable
CREATE TABLE "tblSubscriberEmployer" (
    "SubscriberEmployerID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT,
    "EmployeeTypeID" INTEGER,
    "Employer" VARCHAR(1000) NOT NULL,
    "DesignationID" INTEGER,
    "JoiningDate" DATE,
    "ReleavingDate" DATE,
    "Salary" INTEGER,
    "JobDescr" VARCHAR(5000),
    "NoticePeriodDays" INTEGER,
    "TimestampIns" TIMESTAMP(6) NOT NULL,
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDIns" BIGINT NOT NULL,
    "loginIDUpd" BIGINT,
    "flgCurrent" SMALLINT,

    CONSTRAINT "tblSubscriberEmployer_pkey" PRIMARY KEY ("SubscriberEmployerID")
);

-- CreateTable
CREATE TABLE "tblSubscriberJobStatusLatest" (
    "ClientID" BIGINT,
    "JobID" BIGINT,
    "JobSubscriberMapID" BIGINT,
    "JobMapStatusID" INTEGER,
    "TimestampIns" TIMESTAMP(6) NOT NULL,
    "flgClose" SMALLINT NOT NULL,
    "SubscriberID" BIGINT NOT NULL,
    "flgApprovedByQC" SMALLINT,

    CONSTRAINT "tblSubscriberJobStatusLatest_pkey" PRIMARY KEY ("SubscriberID")
);

-- CreateTable
CREATE TABLE "tblSubscriberLanguage" (
    "SubscriberLanguageID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT,
    "LanguageID" INTEGER,
    "flgRead" CHAR(1),
    "flgWrite" CHAR(1),
    "flgSpeak" CHAR(1),
    "ProficiencyID" INTEGER,
    "TimestampIns" TIMESTAMP(6),
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDIns" BIGINT,
    "loginIDUpd" BIGINT,

    CONSTRAINT "tblSubscriberLanguage_pkey" PRIMARY KEY ("SubscriberLanguageID")
);

-- CreateTable
CREATE TABLE "tblSubscriberPrefferedLocations" (
    "PrefferedLocationsID" BIGINT,
    "SubscriberID" BIGINT NOT NULL,
    "CityID" INTEGER NOT NULL,
    "LoginIDIns" BIGINT,
    "TimestampIns" TIMESTAMP(6),

    CONSTRAINT "tblSubscriberPrefferedLocations_pkey" PRIMARY KEY ("SubscriberID","CityID")
);

-- CreateTable
CREATE TABLE "tblSubscriberRegistration" (
    "SubscriberID" BIGSERIAL NOT NULL,
    "RegistrationCountryCode" VARCHAR(5) NOT NULL,
    "RegistrationMobileNo" VARCHAR(10) NOT NULL,
    "RegistrationIPNo" VARCHAR(50) NOT NULL,
    "RegistrationDateTime" TIMESTAMP(6) NOT NULL,
    "flgCVUploaded" SMALLINT NOT NULL,
    "flgstatus" SMALLINT,

    CONSTRAINT "tblSubscriberRegistration_pkey" PRIMARY KEY ("SubscriberID")
);

-- CreateTable
CREATE TABLE "tblSubscriberSkills" (
    "SubscriberSkillID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT,
    "SkillID" INTEGER,
    "TimestampIns" TIMESTAMP(6),
    "TimestampUpd" TIMESTAMP(6),
    "LoginIDIns" BIGINT,
    "loginIDUpd" BIGINT,

    CONSTRAINT "tblSubscriberSkills_pkey" PRIMARY KEY ("SubscriberSkillID")
);

-- CreateTable
CREATE TABLE "tblSubscriberStatusHistory" (
    "StatusHistoryID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT,
    "JobID" BIGINT,
    "ClientID" BIGINT,
    "JobSubscriberMapID" BIGINT,
    "StatusID" INTEGER,
    "UserID" BIGINT,
    "comments" VARCHAR(5000),
    "TimestampIns" TIMESTAMP(6),
    "LoginIDIns" BIGINT,

    CONSTRAINT "tblSubscriberStatusHistory_pkey" PRIMARY KEY ("StatusHistoryID")
);

-- CreateTable
CREATE TABLE "tblSubscriberTags" (
    "SubscriberID" BIGINT NOT NULL,
    "TagID" BIGINT NOT NULL,

    CONSTRAINT "tblSubscriberTags_pkey" PRIMARY KEY ("SubscriberID","TagID")
);

-- CreateTable
CREATE TABLE "tblSubscriberJobAlert" (
    "AlertID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT NOT NULL,
    "Keyword" VARCHAR(200) NOT NULL,
    "Location" VARCHAR(200) NOT NULL,
    "Frequency" VARCHAR(10) NOT NULL,
    "TimestampIns" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblSubscriberJobAlert_pkey" PRIMARY KEY ("AlertID")
);

-- CreateIndex
CREATE INDEX "tblSubscriberJobAlert_SubscriberID_idx" ON "tblSubscriberJobAlert"("SubscriberID");

-- AddForeignKey
ALTER TABLE "tblCandidateDocumentMap" ADD CONSTRAINT "tblCandidateDocumentMap_DocumentTypeID_fkey" FOREIGN KEY ("DocumentTypeID") REFERENCES "tblMstrDocumentType"("DocumentTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblCandidateDocumentMap" ADD CONSTRAINT "tblCandidateDocumentMap_JobSubscriberMapID_fkey" FOREIGN KEY ("JobSubscriberMapID") REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblCandidateDocumentUploaded" ADD CONSTRAINT "tblCandidateDocumentUploaded_DocumentMapID_fkey" FOREIGN KEY ("DocumentMapID") REFERENCES "tblCandidateDocumentMap"("DocumentMapID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblCandidateDocumentUploaded" ADD CONSTRAINT "tblCandidateDocumentUploaded_DocumentTypeID_fkey" FOREIGN KEY ("DocumentTypeID") REFERENCES "tblMstrDocumentType"("DocumentTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientContacts" ADD CONSTRAINT "tblClientContacts_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "tblClientMstr"("ClientID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobSkill" ADD CONSTRAINT "tblClientJobSkill_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "tblClientJobs"("JobID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobSkill" ADD CONSTRAINT "tblClientJobSkill_SkillID_fkey" FOREIGN KEY ("SkillID") REFERENCES "tblMstrSkills"("SkillID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs" ADD CONSTRAINT "tblClientJobs_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "tblClientMstr"("ClientID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs" ADD CONSTRAINT "tblClientJobs_DesignationID_fkey" FOREIGN KEY ("DesignationID") REFERENCES "tblMstrDesignation"("DesignationID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs" ADD CONSTRAINT "tblClientJobs_EmployeeTypeID_fkey" FOREIGN KEY ("EmployeeTypeID") REFERENCES "tblMstrEmpType"("EmployeeTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs" ADD CONSTRAINT "tblClientJobs_IndustryTypeID_fkey" FOREIGN KEY ("IndustryTypeID") REFERENCES "tblMstrIndustryType"("IndustryTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs" ADD CONSTRAINT "tblClientJobs_JobCityID_fkey" FOREIGN KEY ("JobCityID") REFERENCES "tblMstrCily"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs" ADD CONSTRAINT "tblClientJobs_StatusID_fkey" FOREIGN KEY ("StatusID") REFERENCES "tblMstrStatus"("StatusID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs" ADD CONSTRAINT "tblClientJobs_WorkModeID_fkey" FOREIGN KEY ("WorkModeID") REFERENCES "tblMstrWorkMode"("WorkModeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs_EducationType" ADD CONSTRAINT "tblClientJobs_EducationType_EducationTypeID_fkey" FOREIGN KEY ("EducationTypeID") REFERENCES "tblMstrEducationType"("EducationTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs_EducationType" ADD CONSTRAINT "tblClientJobs_EducationType_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "tblClientJobs"("JobID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientJobs_Gendermapping" ADD CONSTRAINT "tblClientJobs_Gendermapping_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "tblClientJobs"("JobID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientMstr" ADD CONSTRAINT "tblClientMstr_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "tblMstrCily"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientMstr" ADD CONSTRAINT "tblClientMstr_IndustryTypeID_fkey" FOREIGN KEY ("IndustryTypeID") REFERENCES "tblMstrIndustryType"("IndustryTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblClientMstr" ADD CONSTRAINT "tblClientMstr_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "tblSecUser"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblJobInterviewStatus" ADD CONSTRAINT "tblJobInterviewStatus_InterviewModeID_fkey" FOREIGN KEY ("InterviewModeID") REFERENCES "tblMstrInterviewMode"("InterviewModeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblJobInterviewStatus" ADD CONSTRAINT "tblJobInterviewStatus_JobSubscriberMapID_fkey" FOREIGN KEY ("JobSubscriberMapID") REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblJobSubscriberMapping" ADD CONSTRAINT "tblJobSubscriberMapping_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "tblClientJobs"("JobID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblJobSubscriberMapping" ADD CONSTRAINT "tblJobSubscriberMapping_JobMapStatusID_fkey" FOREIGN KEY ("JobMapStatusID") REFERENCES "tblMstrJobMappingStatus"("JobMapStatusID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblJobSubscriberMapping" ADD CONSTRAINT "tblJobSubscriberMapping_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblJobSubscriberStatus" ADD CONSTRAINT "tblJobSubscriberStatus_JobSubscriberMapID_fkey" FOREIGN KEY ("JobSubscriberMapID") REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblMstrCily" ADD CONSTRAINT "tblMstrCily_StateID_fkey" FOREIGN KEY ("StateID") REFERENCES "tblMstrState"("StateID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblMstrCourse" ADD CONSTRAINT "tblMstrCourse_EducationTypeID_fkey" FOREIGN KEY ("EducationTypeID") REFERENCES "tblMstrEducationType"("EducationTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblMstrEducationDegree" ADD CONSTRAINT "tblMstrEducationDegree_EducationTypeID_fkey" FOREIGN KEY ("EducationTypeID") REFERENCES "tblMstrEducationType"("EducationTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblMstrPerson" ADD CONSTRAINT "tblMstrPerson_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "tblClientMstr"("ClientID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblMstrState" ADD CONSTRAINT "tblMstrState_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "tblMstrCountry"("CountryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblMstrSubFunctions" ADD CONSTRAINT "tblMstrSubFunctions_FunctionID_fkey" FOREIGN KEY ("FunctionID") REFERENCES "tblMstrFunctions"("FunctionID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblMstrTags" ADD CONSTRAINT "tblMstrTags_SkillID_fkey" FOREIGN KEY ("SkillID") REFERENCES "tblMstrSkills"("SkillID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSecMapUserRoles" ADD CONSTRAINT "tblSecMapUserRoles_RoleId_fkey" FOREIGN KEY ("RoleId") REFERENCES "tblSecRoles"("RoleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSecMapUserRoles" ADD CONSTRAINT "tblSecMapUserRoles_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "tblSecUser"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSecUser" ADD CONSTRAINT "tblSecUser_NodeID_fkey" FOREIGN KEY ("NodeID") REFERENCES "tblMstrPerson"("PersonNodeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSecUserLogin" ADD CONSTRAINT "tblSecUserLogin_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "tblSecUser"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberCVDetails" ADD CONSTRAINT "tblSubscriberCVDetails_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "tblMstrCily"("CityID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberCVDetails" ADD CONSTRAINT "tblSubscriberCVDetails_CurrentCityID_fkey" FOREIGN KEY ("CurrentCityID") REFERENCES "tblMstrCily"("CityID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberCVDetails" ADD CONSTRAINT "tblSubscriberCVDetails_IndustryTypeID_fkey" FOREIGN KEY ("IndustryTypeID") REFERENCES "tblMstrIndustryType"("IndustryTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberCVDetails" ADD CONSTRAINT "tblSubscriberCVDetails_SkillID_fkey" FOREIGN KEY ("SkillID") REFERENCES "tblMstrSkills"("SkillID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberCVDetails" ADD CONSTRAINT "tblSubscriberCVDetails_SubFunctionID_fkey" FOREIGN KEY ("SubFunctionID") REFERENCES "tblMstrSubFunctions"("SubFunctionID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberCVDetails" ADD CONSTRAINT "tblSubscriberCVDetails_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberCVUploaded" ADD CONSTRAINT "tblSubscriberCVUploaded_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberCertificate" ADD CONSTRAINT "tblSubscriberCertificate_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberEducation" ADD CONSTRAINT "tblSubscriberEducation_CourseTypeID_fkey" FOREIGN KEY ("CourseTypeID") REFERENCES "tblMstrCourseType"("CourseTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberEducation" ADD CONSTRAINT "tblSubscriberEducation_DegreeID_fkey" FOREIGN KEY ("DegreeID") REFERENCES "tblMstrEducationDegree"("DegreeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberEducation" ADD CONSTRAINT "tblSubscriberEducation_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberEmployer" ADD CONSTRAINT "tblSubscriberEmployer_DesignationID_fkey" FOREIGN KEY ("DesignationID") REFERENCES "tblMstrDesignation"("DesignationID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberEmployer" ADD CONSTRAINT "tblSubscriberEmployer_EmployeeTypeID_fkey" FOREIGN KEY ("EmployeeTypeID") REFERENCES "tblMstrEmpType"("EmployeeTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberEmployer" ADD CONSTRAINT "tblSubscriberEmployer_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" ADD CONSTRAINT "tblSubscriberJobStatusLatest_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "tblClientMstr"("ClientID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" ADD CONSTRAINT "tblSubscriberJobStatusLatest_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "tblClientJobs"("JobID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" ADD CONSTRAINT "tblSubscriberJobStatusLatest_JobMapStatusID_fkey" FOREIGN KEY ("JobMapStatusID") REFERENCES "tblMstrJobMappingStatus"("JobMapStatusID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" ADD CONSTRAINT "tblSubscriberJobStatusLatest_JobSubscriberMapID_fkey" FOREIGN KEY ("JobSubscriberMapID") REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" ADD CONSTRAINT "tblSubscriberJobStatusLatest_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberPrefferedLocations" ADD CONSTRAINT "tblSubscriberPrefferedLocations_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "tblMstrCily"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberPrefferedLocations" ADD CONSTRAINT "tblSubscriberPrefferedLocations_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberStatusHistory" ADD CONSTRAINT "tblSubscriberStatusHistory_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "tblClientMstr"("ClientID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberStatusHistory" ADD CONSTRAINT "tblSubscriberStatusHistory_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "tblClientJobs"("JobID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberStatusHistory" ADD CONSTRAINT "tblSubscriberStatusHistory_StatusID_fkey" FOREIGN KEY ("StatusID") REFERENCES "tblMstrStatus"("StatusID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberStatusHistory" ADD CONSTRAINT "tblSubscriberStatusHistory_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberStatusHistory" ADD CONSTRAINT "tblSubscriberStatusHistory_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "tblSecUser"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberTags" ADD CONSTRAINT "tblSubscriberTags_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberTags" ADD CONSTRAINT "tblSubscriberTags_TagID_fkey" FOREIGN KEY ("TagID") REFERENCES "tblMstrTags"("TagID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberJobAlert" ADD CONSTRAINT "tblSubscriberJobAlert_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;
