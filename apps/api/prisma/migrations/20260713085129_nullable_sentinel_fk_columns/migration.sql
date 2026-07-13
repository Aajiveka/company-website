-- DropForeignKey
ALTER TABLE "tblMstrPerson" DROP CONSTRAINT "tblMstrPerson_ClientID_fkey";

-- DropForeignKey
ALTER TABLE "tblSecUserLogin" DROP CONSTRAINT "tblSecUserLogin_UserID_fkey";

-- DropForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" DROP CONSTRAINT "tblSubscriberJobStatusLatest_ClientID_fkey";

-- DropForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" DROP CONSTRAINT "tblSubscriberJobStatusLatest_JobID_fkey";

-- DropForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" DROP CONSTRAINT "tblSubscriberJobStatusLatest_JobMapStatusID_fkey";

-- AlterTable
ALTER TABLE "tblMstrPerson" ALTER COLUMN "ClientID" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tblSecUserLogin" ALTER COLUMN "UserID" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tblSubscriberJobStatusLatest" ALTER COLUMN "ClientID" DROP NOT NULL,
ALTER COLUMN "JobID" DROP NOT NULL,
ALTER COLUMN "JobMapStatusID" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tblMstrPerson" ADD CONSTRAINT "tblMstrPerson_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "tblClientMstr"("ClientID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSecUserLogin" ADD CONSTRAINT "tblSecUserLogin_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "tblSecUser"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" ADD CONSTRAINT "tblSubscriberJobStatusLatest_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "tblClientMstr"("ClientID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" ADD CONSTRAINT "tblSubscriberJobStatusLatest_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "tblClientJobs"("JobID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscriberJobStatusLatest" ADD CONSTRAINT "tblSubscriberJobStatusLatest_JobMapStatusID_fkey" FOREIGN KEY ("JobMapStatusID") REFERENCES "tblMstrJobMappingStatus"("JobMapStatusID") ON DELETE SET NULL ON UPDATE CASCADE;
