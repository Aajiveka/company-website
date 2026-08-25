-- Files the public site serves, addressed by slug. The bytes stay in object storage; this
-- table is the handle, so a multi-megabyte binary never has to live in the repo.
CREATE TABLE IF NOT EXISTS "tblSiteDocument" (
  "SiteDocumentID" serial PRIMARY KEY,
  "Slug" varchar(80) NOT NULL,
  "Title" varchar(200) NOT NULL,
  "StorageKey" varchar(500) NOT NULL,
  "MimeType" varchar(120) NOT NULL,
  "SizeBytes" integer NOT NULL,
  "FileName" varchar(200) NOT NULL,
  "Active" boolean NOT NULL DEFAULT true,
  "TimestampIns" timestamp(6) NOT NULL DEFAULT now(),
  "TimestampUpd" timestamp(6)
);

CREATE UNIQUE INDEX IF NOT EXISTS "tblSiteDocument_Slug_key" ON "tblSiteDocument" ("Slug");
