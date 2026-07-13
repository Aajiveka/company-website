-- CreateTable
CREATE TABLE "tblAuthPasswordReset" (
    "ResetID" BIGSERIAL NOT NULL,
    "UserID" BIGINT NOT NULL,
    "TokenHash" VARCHAR(64) NOT NULL,
    "ExpiresAt" TIMESTAMP(6) NOT NULL,
    "UsedAt" TIMESTAMP(6),
    "TimestampIns" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblAuthPasswordReset_pkey" PRIMARY KEY ("ResetID")
);

-- CreateTable
CREATE TABLE "tblAuditLog" (
    "AuditID" BIGSERIAL NOT NULL,
    "UserID" BIGINT,
    "Action" VARCHAR(60) NOT NULL,
    "Entity" VARCHAR(60),
    "EntityID" VARCHAR(60),
    "IPAddress" VARCHAR(45),
    "UserAgent" VARCHAR(300),
    "Detail" TEXT,
    "TimestampIns" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblAuditLog_pkey" PRIMARY KEY ("AuditID")
);

-- CreateIndex
CREATE UNIQUE INDEX "tblAuthPasswordReset_TokenHash_key" ON "tblAuthPasswordReset"("TokenHash");

-- CreateIndex
CREATE INDEX "tblAuthPasswordReset_UserID_idx" ON "tblAuthPasswordReset"("UserID");

-- CreateIndex
CREATE INDEX "tblAuditLog_UserID_idx" ON "tblAuditLog"("UserID");

-- CreateIndex
CREATE INDEX "tblAuditLog_TimestampIns_idx" ON "tblAuditLog"("TimestampIns");

-- AddForeignKey
ALTER TABLE "tblAuthPasswordReset" ADD CONSTRAINT "tblAuthPasswordReset_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "tblSecUser"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;
