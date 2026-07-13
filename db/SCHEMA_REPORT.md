# Database Analysis Report — db_aajiveka (AajivikaPortal ATS)

Reverse-engineered from `db_aajiveka.bak` (SQL Server backup). The binary system
catalogs are not restorable outside SQL Server, so **column lists below are
reconstructed from the 79 recoverable stored-procedure bodies** (`db/procs/`).
Authoritative types/PKs/FKs come from restoring the `.bak` on SQL Server and running
the generator in `db/README.md`. Treat this as a high-fidelity map, not exact DDL.

- **Tables:** 61  •  **Stored procedures recovered:** 79  •  **Roles:** 1=Subscriber, 2=QC1, 3=QC2, 4=Client, 5=Admin, 6=Subscription

## Login flow (`spSecUserLogin`)
Validates `tblSecUser(UserName,Password,Active)` (plaintext — migrate to hashing),
resolves role via `tblSecMapUserRoles.RoleId`, person via `tblMstrPerson`, then
manages sessions in `tblSecUserLogin`/`tblSecActiveSessions`. Result codes:
`1`=invalid credentials, `2`=duplicate/concurrent session, `3`=success.

## Security & Access

- **tblForgotPassword** — `EmailId`, `ExpiryDate`, `ID`, `IsUsed`, `Token`
- **tblMstrPerson** — `Descr`, `EmailId`, `MobileNo`, `PersonNodeID`
- **tblSecActiveSessions** — `RowID`, `SessionID`, `UserID`
- **tblSecMapUserRoles** — `RoleId`, `UserID`
- **tblSecMenuContextMenu** — _columns not recoverable from procs — inspect restored DB_
- **tblSecMenuHierarchy** — _columns not recoverable from procs — inspect restored DB_
- **tblSecMenuHierarchyRoles** — _columns not recoverable from procs — inspect restored DB_
- **tblSecRoles** — `RoleId`, `RoleName`
- **tblSecUser** — `Active`, `NodeID`, `NodeType`, `Password`, `PwdStatus`, `UserID`, `UserName`
- **tblSecUserLogin** — `BrwsrVer`, `IPAddress`, `IsSessionEnd`, `LogOutSrc`, `LoginID`, `Logouttime`, `ScrRsltn`, `SessionID`, `UserID`

## Organization

- **tblOrgEmpMstr** — _columns not recoverable from procs — inspect restored DB_
- **tblOrgHOUsers** — _columns not recoverable from procs — inspect restored DB_
- **tblOrgSysAdmins** — _columns not recoverable from procs — inspect restored DB_

## Subscriber / Candidate CV

- **tblSubscriberAwards** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberCVDetails** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberCVUploaded** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberCertificate** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberDocs** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberDocsStatus** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberEducation** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberEmployer** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberJobStatusLatest** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberLanguage** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberPrefferedLocations** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberRegistration** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberSkills** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberStatusHistory** — _columns not recoverable from procs — inspect restored DB_
- **tblSubscriberTags** — _columns not recoverable from procs — inspect restored DB_

## Client / Company & Jobs

- **tblClientContacts** — `ClientID`, `ContactPerName`, `ContactPersonRole`, `EmailID`, `Mobile`, `PhoneNo`, `RoleID`
- **tblClientJobSkill** — _columns not recoverable from procs — inspect restored DB_
- **tblClientJobs** — `ClientID`, `DesignationID`, `EmployeeTypeID`, `IndustryTypeID`, `JobCityID`, `JobDescr`, `LoginIDIns`, `MaxCTC`, `MaxEmp`, `MinCTC`, `MinExp`, `StatusID`, `TimestampIns`, `WorkModeID`
- **tblClientJobs_EducationType** — _columns not recoverable from procs — inspect restored DB_
- **tblClientJobs_Gendermapping** — _columns not recoverable from procs — inspect restored DB_
- **tblClientMstr** — `CityID`, `ClientAddress`, `ClientName`, `CompanyLogo`, `ContactNo`, `EmailID`, `IndustryTypeID`, `LoginIDIns`, `PIN`, `TimestampIns`, `companyDescr`, `companyWebsite`

## Applications & Interviews

- **tblJobInterviewStatus** — _columns not recoverable from procs — inspect restored DB_
- **tblJobSubscriberMapping** — `JobID`, `JobMapStatusID`, `LoginIDIns`, `MapDate`, `SubscriberID`, `TimestampIns`
- **tblJobSubscriberStatus** — _columns not recoverable from procs — inspect restored DB_

## Document QC

- **tblCandidateDocumentMap** — _columns not recoverable from procs — inspect restored DB_
- **tblCandidateDocumentStatus** — _columns not recoverable from procs — inspect restored DB_
- **tblCandidateDocumentUploaded** — _columns not recoverable from procs — inspect restored DB_
- **tblCandidateJobDocumentMap** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrDocumentType** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrDocuments** — _columns not recoverable from procs — inspect restored DB_

## Master / Lookup

- **tblMstrCily** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrCountry** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrCourse** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrDegreeType** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrDesignation** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrEducationType** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrEmpType** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrFunctions** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrGender** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrIndustryType** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrInterviewMode** — `Descr`, `InterviewModeID`, `WorkModeID`
- **tblMstrJobMappingStatus** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrSkills** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrState** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrStatus** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrSubFunctions** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrTags** — _columns not recoverable from procs — inspect restored DB_
- **tblMstrWorkMode** — _columns not recoverable from procs — inspect restored DB_

## Recovered stored procedures

`spCleatData`, `spClientDeleteMappedDocument`, `spClientDeleteMappedDocument_SRV`, `spClientGetAllClintList`, `spClientGetAllJobList`, `spClientGetCandidateDocumentStatus`, `spClientGetClientDetails`, `spClientGetClientWithJobs`, `spClientGetClintsofUser`, `spClientGetCompanyInfo`, `spClientGetDataForInterview`, `spClientGetDataForInterviewStatus`, `spClientGetDataForInterviewStatus_SRV`, `spClientGetDocMaster`, `spClientGetDocumentStatusMaster`, `spClientGetInterviewMaster`, `spClientGetJobSubscribers`, `spClientGetJobSubscribersForInterview`, `spClientGetJoblisting`, `spClientGetMapDocumentsMaster`, `spClientGetMapDocumentsMaster_SRV`, `spClientGetMapDocumentsToCandiate`, `spClientGetMapDocumentsToCandiate_SRV`, `spClientGetMasters`, `spClientGetSpecificClintInfo`, `spClientGetSpecificJob`, `spClientGetSpecificJob_Display`, `spClientJob_GetMasters`, `spClientManageClient`, `spClientManageClientContact`, `spClientManageJob`, `spClientSaveMapDocumentsToCandiate`, `spClientSaveMapDocumentsToCandiate_SRV`, `spClientSaveSubscriberInterview`, `spClientShortListRejectSubscriber`, `spClientUpdateMapDocumentStatus`, `spClientbasedJobMaster`, `spCompanyInfo`, `spMakeIndxNumbers`, `spMakeTreeMenu`, `spMakeTreeMenuSub`, `spQC1ApproveRejectCandidate`, `spQC1GetDashboardData`, `spQC2GetAllCandidateList`, `spQC2GetMappedDocuments`, `spQCGetDataForInterview`, `spQCGetInterviewMaster`, `spSaveInterview`, `spSaveInterviewStatus`, `spSecGetRoles`, `spSecGetUsers`, `spSecManageUserRoles`, `spSecMenuContextMenu`, `spSecUserLogin`, `spSubscriberAPIGetDetails_Certificate`, `spSubscriberAPIGetDetails_Degree`, `spSubscriberAPIGetDetails_Education`, `spSubscriberAPIGetDetails_Exp`, `spSubscriberAPIGetDetails_Personal`, `spSubscriberAPIGetDetails_Professional`, `spSubscriberAPIManageDetails_Certificate`, `spSubscriberCVGet`, `spSubscriberCVGetDetails`, `spSubscriberCVUpdate`, `spSubscriberCVUpdate_Certificate`, `spSubscriberCVUpdate_Education`, `spSubscriberCVUpdate_GetMasters`, `spSubscriberCVUpdate_Personal`, `spSubscriberCVUpdate_Professional`, `spSubscriberCVUpdate_ProfessionalOnly`, `spSubscriberCVUpload`, `spSubscriberDoc`, `spSubscriberGetCVToDisplay`, `spSubscriberGetSubscriberForListing`, `spSubscriberInterviews`, `spSubscriberRegistration`, `spSubscriberRescheduleReq`, `spSubscriberUploadDoc`, `spUtilGetPhotoFolder`
