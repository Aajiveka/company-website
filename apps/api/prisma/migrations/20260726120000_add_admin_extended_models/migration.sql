-- CreateTable
CREATE TABLE "tblPlatformSettings" (
    "Key" TEXT NOT NULL,
    "Value" TEXT NOT NULL,
    "UpdatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,

    CONSTRAINT "tblPlatformSettings_pkey" PRIMARY KEY ("Key")
);

-- CreateTable
CREATE TABLE "tblBlogPost" (
    "PostID" SERIAL NOT NULL,
    "Title" TEXT NOT NULL,
    "Slug" TEXT NOT NULL,
    "Excerpt" TEXT,
    "Body" TEXT NOT NULL,
    "ImageUrl" TEXT,
    "Category" TEXT NOT NULL DEFAULT 'general',
    "Status" TEXT NOT NULL DEFAULT 'Draft',
    "Author" TEXT,
    "CreatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "PublishedAt" TIMESTAMP(6),
    "UpdatedAt" TIMESTAMP(6),

    CONSTRAINT "tblBlogPost_pkey" PRIMARY KEY ("PostID")
);

-- CreateTable
CREATE TABLE "tblSavedSearch" (
    "SavedSearchID" SERIAL NOT NULL,
    "SubscriberID" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Query" TEXT,
    "Filters" TEXT,
    "CreatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblSavedSearch_pkey" PRIMARY KEY ("SavedSearchID")
);

-- CreateTable
CREATE TABLE "tblNotificationPreference" (
    "SubscriberID" INTEGER NOT NULL,
    "EmailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "PushAlerts" BOOLEAN NOT NULL DEFAULT true,
    "SmsAlerts" BOOLEAN NOT NULL DEFAULT false,
    "JobAlertFrequency" TEXT NOT NULL DEFAULT 'Daily',

    CONSTRAINT "tblNotificationPreference_pkey" PRIMARY KEY ("SubscriberID")
);

-- CreateTable
CREATE TABLE "tblApplicantNote" (
    "NoteID" SERIAL NOT NULL,
    "JobSubscriberMapID" BIGINT NOT NULL,
    "Note" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,

    CONSTRAINT "tblApplicantNote_pkey" PRIMARY KEY ("NoteID")
);

-- CreateTable
CREATE TABLE "tblCompanyBranding" (
    "ClientID" BIGINT NOT NULL,
    "Tagline" TEXT,
    "CoverImageUrl" TEXT,
    "Culture" TEXT,
    "Benefits" TEXT,
    "UpdatedAt" TIMESTAMP(6),

    CONSTRAINT "tblCompanyBranding_pkey" PRIMARY KEY ("ClientID")
);

-- CreateIndex (unique)
CREATE UNIQUE INDEX "tblBlogPost_Slug_key" ON "tblBlogPost"("Slug");

-- CreateIndex (new indexes on existing tables from Round 15)
CREATE INDEX "tblClientContacts_ClientID_idx" ON "tblClientContacts"("ClientID");

CREATE INDEX "tblClientJobSkill_JobID_idx" ON "tblClientJobSkill"("JobID");

CREATE INDEX "tblClientJobSkill_SkillID_idx" ON "tblClientJobSkill"("SkillID");

CREATE INDEX "tblClientJobs_ClientID_idx" ON "tblClientJobs"("ClientID");

CREATE INDEX "tblClientJobs_StatusID_idx" ON "tblClientJobs"("StatusID");

CREATE INDEX "tblClientJobs_DesignationID_idx" ON "tblClientJobs"("DesignationID");

CREATE INDEX "tblClientJobs_JobCityID_idx" ON "tblClientJobs"("JobCityID");

CREATE INDEX "tblClientJobs_TimestampIns_idx" ON "tblClientJobs"("TimestampIns");

CREATE INDEX "tblClientJobs_IndustryTypeID_idx" ON "tblClientJobs"("IndustryTypeID");

CREATE INDEX "tblClientMstr_CityID_idx" ON "tblClientMstr"("CityID");

CREATE INDEX "tblClientMstr_UserID_idx" ON "tblClientMstr"("UserID");

CREATE INDEX "tblClientMstr_IndustryTypeID_idx" ON "tblClientMstr"("IndustryTypeID");

CREATE INDEX "tblJobInterviewStatus_JobSubscriberMapID_idx" ON "tblJobInterviewStatus"("JobSubscriberMapID");

CREATE INDEX "tblJobSubscriberMapping_JobID_idx" ON "tblJobSubscriberMapping"("JobID");

CREATE INDEX "tblJobSubscriberMapping_SubscriberID_idx" ON "tblJobSubscriberMapping"("SubscriberID");

CREATE INDEX "tblJobSubscriberMapping_JobMapStatusID_idx" ON "tblJobSubscriberMapping"("JobMapStatusID");

CREATE INDEX "tblMstrCily_StateID_idx" ON "tblMstrCily"("StateID");

CREATE INDEX "tblSecMapUserRoles_UserID_idx" ON "tblSecMapUserRoles"("UserID");

CREATE INDEX "tblSecUser_UserName_idx" ON "tblSecUser"("UserName");

CREATE INDEX "tblSecUser_Active_idx" ON "tblSecUser"("Active");

CREATE INDEX "tblSecUserLogin_UserID_idx" ON "tblSecUserLogin"("UserID");

CREATE INDEX "tblSubscriberCVDetails_SkillID_idx" ON "tblSubscriberCVDetails"("SkillID");

CREATE INDEX "tblSubscriberCVDetails_CurrentCityID_idx" ON "tblSubscriberCVDetails"("CurrentCityID");

CREATE INDEX "tblSubscriberCVDetails_IndustryTypeID_idx" ON "tblSubscriberCVDetails"("IndustryTypeID");

CREATE INDEX "tblSubscriberEducation_SubscriberID_idx" ON "tblSubscriberEducation"("SubscriberID");

CREATE INDEX "tblSubscriberEmployer_SubscriberID_idx" ON "tblSubscriberEmployer"("SubscriberID");

CREATE INDEX "tblSubscriberJobStatusLatest_JobSubscriberMapID_idx" ON "tblSubscriberJobStatusLatest"("JobSubscriberMapID");

CREATE INDEX "tblSubscriberStatusHistory_SubscriberID_idx" ON "tblSubscriberStatusHistory"("SubscriberID");

-- CreateIndex (indexes on new tables)
CREATE INDEX "tblBlogPost_Status_idx" ON "tblBlogPost"("Status");

CREATE INDEX "tblBlogPost_CreatedAt_idx" ON "tblBlogPost"("CreatedAt");

CREATE INDEX "tblSavedSearch_SubscriberID_idx" ON "tblSavedSearch"("SubscriberID");

-- AddForeignKey
ALTER TABLE "tblApplicantNote" ADD CONSTRAINT "tblApplicantNote_JobSubscriberMapID_fkey" FOREIGN KEY ("JobSubscriberMapID") REFERENCES "tblJobSubscriberMapping"("JobSubscriberMapID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblCompanyBranding" ADD CONSTRAINT "tblCompanyBranding_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "tblClientMstr"("ClientID") ON DELETE RESTRICT ON UPDATE CASCADE;
