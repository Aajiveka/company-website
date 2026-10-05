-- Invoices raised by the Aajiveka admin to a company. The employer's Billing page lists only
-- these; it no longer derives charges from hired candidates on its own.

CREATE TABLE IF NOT EXISTS "tblClientInvoice" (
    "ClientInvoiceID" BIGSERIAL PRIMARY KEY,
    "ClientID" BIGINT NOT NULL REFERENCES "tblClientMstr"("ClientID"),
    "InvoiceNo" VARCHAR(50) NOT NULL UNIQUE,
    "InvoiceDate" DATE NOT NULL,
    "DueDate" DATE,
    "Description" VARCHAR(2000),
    "Amount" DECIMAL(14, 2) NOT NULL,
    "Tax" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "Total" DECIMAL(14, 2) NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    "PaidAt" TIMESTAMP(6),
    "CreatedByUserID" BIGINT,
    "CreatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "tblClientInvoice_ClientID_idx" ON "tblClientInvoice"("ClientID");
