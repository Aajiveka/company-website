-- CreateTable
CREATE TABLE "tblSavedJob" (
    "SavedJobID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT NOT NULL,
    "JobID" BIGINT NOT NULL,
    "TimestampIns" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblSavedJob_pkey" PRIMARY KEY ("SavedJobID")
);

-- CreateIndex
CREATE INDEX "tblSavedJob_SubscriberID_idx" ON "tblSavedJob"("SubscriberID");

-- CreateIndex
CREATE UNIQUE INDEX "tblSavedJob_SubscriberID_JobID_key" ON "tblSavedJob"("SubscriberID", "JobID");

-- AddForeignKey
ALTER TABLE "tblSavedJob" ADD CONSTRAINT "tblSavedJob_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSavedJob" ADD CONSTRAINT "tblSavedJob_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "tblClientJobs"("JobID") ON DELETE RESTRICT ON UPDATE CASCADE;
