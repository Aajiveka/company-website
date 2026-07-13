-- AlterTable
CREATE SEQUENCE tblsecactivesessions_rowid_seq;
ALTER TABLE "tblSecActiveSessions" ALTER COLUMN "RowID" SET DEFAULT nextval('tblsecactivesessions_rowid_seq');
ALTER SEQUENCE tblsecactivesessions_rowid_seq OWNED BY "tblSecActiveSessions"."RowID";
