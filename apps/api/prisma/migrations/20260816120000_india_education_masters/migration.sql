-- India-wide education masters.
--
-- The Education step offered four options — 10th, 12th, "Gradution", Post Graduation — because
-- that is all tblMstrEducationType held, and eight courses between them. Indian candidates hold
-- several hundred distinct qualifications, so a B.Tech in Computer Science had nowhere to go and
-- the Course dropdown could not cascade into anything meaningful.
--
-- This migration:
--   1. fixes the "Gradution" typo, which is on screen in the live dropdown
--   2. adds Category to tblMstrEducationType so ~90 qualifications can be grouped
--   3. adds the natural-key uniqueness the seeding relies on
--   4. creates tblMstrInstitute — there was no institution master at all, so
--      "Institution / University name" was free text and the same university arrived
--      spelled a dozen ways
--   5. loads the reference rows
--
-- The row INSERTs below (everything after the DDL) are generated from prisma/data/*.ts by
-- prisma/tools/build-education-sql.ts. They resolve every foreign key by name and conflict on a
-- natural key, so this migration is idempotent and cannot repoint an existing
-- tblSubscriberEducation row at a different qualification or course.

-- 1. The typo. Must run before the INSERTs: the reference data calls this row "Graduation", so
--    without the rename the ON CONFLICT ("Descr") target would miss and a SECOND graduation row
--    would appear alongside the misspelt one, splitting existing candidates across both.
UPDATE "tblMstrEducationType" SET "Descr" = 'Graduation' WHERE "Descr" = 'Gradution';

-- 2. The grouping column, and the natural keys the loaders conflict on.
ALTER TABLE "tblMstrEducationType" ADD COLUMN IF NOT EXISTS "Category" VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS "tblMstrEducationType_Descr_key"
  ON "tblMstrEducationType" ("Descr");

CREATE UNIQUE INDEX IF NOT EXISTS "tblMstrCourse_EducationTypeID_DegreeName_key"
  ON "tblMstrCourse" ("EducationTypeID", "DegreeName");

CREATE INDEX IF NOT EXISTS "tblMstrCourse_EducationTypeID_idx"
  ON "tblMstrCourse" ("EducationTypeID");

-- 3. The legacy dump carried one course per school level, named after the level itself: a course
--    called "10th" sitting under a qualification called "10th". Renaming them to "General" both
--    removes that duplicate from the dropdown and lets the generated INSERT below skip its own
--    "General" row on conflict — so the candidates already pointing at these course ids keep a
--    valid, and now sensible, course.
UPDATE "tblMstrCourse" c SET "DegreeName" = 'General'
  FROM "tblMstrEducationType" t
 WHERE c."EducationTypeID" = t."EducationTypeID"
   AND c."DegreeName" = t."Descr"
   AND t."Descr" IN ('10th', '12th');

-- 4. The institution master.
CREATE TABLE IF NOT EXISTS "tblMstrInstitute" (
  "InstituteID" SERIAL PRIMARY KEY,
  "Name"        VARCHAR(300) NOT NULL,
  -- Lowercased and punctuation-stripped. UNIQUE, so "Dr. A.P.J. Abdul Kalam Technical
  -- University" and "Dr APJ Abdul Kalam Technical University" collapse to one row instead of
  -- doubling every suggestion list.
  "SearchKey"   VARCHAR(300) NOT NULL,
  -- What the typeahead matches: SearchKey plus the name's initialism. Nobody types "Indian
  -- Institute of Technology Patna" — they type "IIT Patna", and matching the full name alone
  -- returns nothing for the acronym, i.e. it looks broken on the best-known institutions.
  -- Separate from SearchKey because that column is UNIQUE and two institutions can share an
  -- initialism.
  "SearchText"  VARCHAR(400),
  "Kind"        VARCHAR(50),
  "StateID"     INTEGER REFERENCES "tblMstrState" ("StateID"),
  -- The city as written on the certificate, kept alongside CityID because tblMstrCily is a
  -- DISTRICT list: Bhubaneswar is in Khordha and Roorkee in Haridwar, so the district id alone
  -- cannot print the place a candidate would recognise.
  "City"        VARCHAR(150),
  "CityID"      INTEGER REFERENCES "tblMstrCily" ("CityID"),
  "FlgActive"   SMALLINT NOT NULL DEFAULT 1
);

ALTER TABLE "tblMstrInstitute" ADD COLUMN IF NOT EXISTS "SearchText" VARCHAR(400);

CREATE UNIQUE INDEX IF NOT EXISTS "tblMstrInstitute_SearchKey_key" ON "tblMstrInstitute" ("SearchKey");
CREATE INDEX IF NOT EXISTS "tblMstrInstitute_StateID_idx" ON "tblMstrInstitute" ("StateID");
-- Serves the prefix half of the ranking ("names that START with what was typed sort above
-- names that merely contain it").
CREATE INDEX IF NOT EXISTS "tblMstrInstitute_SearchText_pattern_idx"
  ON "tblMstrInstitute" ("SearchText" varchar_pattern_ops);

-- 5. Reference rows (generated — see the header).

-- Qualifications (tblMstrEducationType). Conflict target is the name, so a row that
-- already exists keeps its id and every tblSubscriberEducation row pointing at it.
INSERT INTO "tblMstrEducationType" ("EducationTypeID", "Descr", "HighestSeq", "Category") VALUES
  (100, 'Below 10th', 0, 'School'),
  (1, '10th', 1, 'School'),
  (2, '12th', 2, 'School'),
  (110, 'Diploma', 10, 'Diploma'),
  (111, 'Polytechnic Diploma', 11, 'Diploma'),
  (112, 'ITI', 12, 'Diploma'),
  (113, 'Advanced Diploma', 13, 'Diploma'),
  (114, 'PG Diploma', 55, 'Diploma'),
  (115, 'PGDM', 56, 'Diploma'),
  (3, 'Graduation', 20, 'Undergraduate'),
  (130, 'B.A.', 21, 'Undergraduate'),
  (131, 'B.Sc.', 22, 'Undergraduate'),
  (132, 'B.Com.', 23, 'Undergraduate'),
  (133, 'BBA', 24, 'Undergraduate'),
  (134, 'BMS', 25, 'Undergraduate'),
  (135, 'BCA', 26, 'Undergraduate'),
  (136, 'B.Tech', 27, 'Undergraduate'),
  (137, 'B.E.', 28, 'Undergraduate'),
  (138, 'B.Arch', 29, 'Undergraduate'),
  (139, 'B.Plan', 30, 'Undergraduate'),
  (140, 'B.Des', 31, 'Undergraduate'),
  (141, 'B.Pharm', 32, 'Undergraduate'),
  (142, 'B.Ed.', 33, 'Undergraduate'),
  (143, 'B.El.Ed.', 34, 'Undergraduate'),
  (144, 'LL.B.', 35, 'Undergraduate'),
  (145, 'MBBS', 36, 'Undergraduate'),
  (146, 'BDS', 37, 'Undergraduate'),
  (147, 'BAMS', 38, 'Undergraduate'),
  (148, 'BHMS', 39, 'Undergraduate'),
  (149, 'BUMS', 40, 'Undergraduate'),
  (150, 'BNYS', 41, 'Undergraduate'),
  (151, 'BPT', 42, 'Undergraduate'),
  (152, 'BOT', 43, 'Undergraduate'),
  (153, 'BASLP', 44, 'Undergraduate'),
  (154, 'B.Optom.', 45, 'Undergraduate'),
  (155, 'B.Sc. Nursing', 46, 'Undergraduate'),
  (156, 'B.V.Sc. & A.H.', 47, 'Undergraduate'),
  (157, 'B.Sc. Agriculture', 48, 'Undergraduate'),
  (158, 'B.F.Sc.', 49, 'Undergraduate'),
  (159, 'BSW', 50, 'Undergraduate'),
  (160, 'BJMC', 51, 'Undergraduate'),
  (161, 'BMM', 52, 'Undergraduate'),
  (162, 'BHM', 53, 'Undergraduate'),
  (163, 'BFA', 54, 'Undergraduate'),
  (164, 'B.P.Ed.', 55, 'Undergraduate'),
  (165, 'B.Voc.', 56, 'Undergraduate'),
  (166, 'B.Lib.I.Sc.', 57, 'Undergraduate'),
  (167, 'B.Stat.', 58, 'Undergraduate'),
  (168, 'B.Text.', 59, 'Undergraduate'),
  (4, 'Post Graduation', 60, 'Postgraduate'),
  (180, 'M.A.', 61, 'Postgraduate'),
  (181, 'M.Sc.', 62, 'Postgraduate'),
  (182, 'M.Com.', 63, 'Postgraduate'),
  (183, 'MBA', 64, 'Postgraduate'),
  (184, 'MCA', 65, 'Postgraduate'),
  (185, 'M.Tech', 66, 'Postgraduate'),
  (186, 'M.E.', 67, 'Postgraduate'),
  (187, 'MS (Engineering / Science)', 68, 'Postgraduate'),
  (188, 'M.Arch', 69, 'Postgraduate'),
  (189, 'M.Plan', 70, 'Postgraduate'),
  (190, 'M.Des', 71, 'Postgraduate'),
  (191, 'M.Pharm', 72, 'Postgraduate'),
  (192, 'M.Ed.', 73, 'Postgraduate'),
  (193, 'LL.M.', 74, 'Postgraduate'),
  (194, 'MD (Doctor of Medicine)', 75, 'Postgraduate'),
  (195, 'MS (Master of Surgery)', 76, 'Postgraduate'),
  (196, 'MDS', 77, 'Postgraduate'),
  (197, 'MPT', 78, 'Postgraduate'),
  (198, 'M.Sc. Nursing', 79, 'Postgraduate'),
  (199, 'MPH', 80, 'Postgraduate'),
  (200, 'MHA', 81, 'Postgraduate'),
  (201, 'MSW', 82, 'Postgraduate'),
  (202, 'MJMC', 83, 'Postgraduate'),
  (203, 'MHM', 84, 'Postgraduate'),
  (204, 'MFA', 85, 'Postgraduate'),
  (205, 'M.P.Ed.', 86, 'Postgraduate'),
  (206, 'M.Voc.', 87, 'Postgraduate'),
  (207, 'M.Lib.I.Sc.', 88, 'Postgraduate'),
  (208, 'M.Stat.', 89, 'Postgraduate'),
  (209, 'M.V.Sc.', 90, 'Postgraduate'),
  (210, 'M.Sc. Agriculture', 91, 'Postgraduate'),
  (211, 'M.F.Sc.', 92, 'Postgraduate'),
  (230, 'M.Phil.', 100, 'Doctorate'),
  (231, 'Ph.D.', 101, 'Doctorate'),
  (232, 'D.Sc.', 102, 'Doctorate'),
  (233, 'D.Litt.', 103, 'Doctorate'),
  (234, 'LL.D.', 104, 'Doctorate'),
  (235, 'DM (Doctorate of Medicine)', 105, 'Doctorate'),
  (236, 'M.Ch.', 106, 'Doctorate'),
  (237, 'Post Doctoral Fellowship', 107, 'Doctorate'),
  (250, 'Other', 120, 'Other')
ON CONFLICT ("Descr") DO UPDATE SET "Category" = EXCLUDED."Category", "HighestSeq" = EXCLUDED."HighestSeq";

-- Keep the identity sequence ahead of the explicit ids above.
SELECT setval(pg_get_serial_sequence('"tblMstrEducationType"', 'EducationTypeID'),
  GREATEST((SELECT MAX("EducationTypeID") FROM "tblMstrEducationType"), 1), true);

-- Courses (tblMstrCourse): the branch/stream inside a qualification. EducationTypeID is
-- looked up by name rather than assumed, so this cannot land a course under the wrong
-- qualification if an environment numbered its rows differently. ShortForm is NOT NULL
-- in the legacy schema and branches have no agreed acronym, so it is stored empty.
INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'Below 10th'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = '10th'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Science (PCM)'),
    ('Science (PCB)'),
    ('Science (PCMB)'),
    ('Commerce'),
    ('Arts / Humanities'),
    ('Vocational'),
    ('General'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = '12th'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Engineering'),
    ('Computer Applications'),
    ('Business Management'),
    ('Nursing'),
    ('Pharmacy'),
    ('Elementary Education (D.El.Ed)'),
    ('Hotel Management'),
    ('Fashion Design'),
    ('Fine Arts'),
    ('Agriculture'),
    ('Animation and Multimedia'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'Diploma'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Computer Science and Engineering'),
    ('Information Technology'),
    ('Electronics and Communication Engineering'),
    ('Electrical Engineering'),
    ('Electrical and Electronics Engineering'),
    ('Mechanical Engineering'),
    ('Civil Engineering'),
    ('Chemical Engineering'),
    ('Aerospace Engineering'),
    ('Aeronautical Engineering'),
    ('Automobile Engineering'),
    ('Biotechnology'),
    ('Biomedical Engineering'),
    ('Industrial Engineering'),
    ('Production Engineering'),
    ('Instrumentation Engineering'),
    ('Electronics and Instrumentation Engineering'),
    ('Electronics Engineering'),
    ('Artificial Intelligence'),
    ('Artificial Intelligence and Machine Learning'),
    ('Data Science'),
    ('Cyber Security'),
    ('Software Engineering'),
    ('Internet of Things'),
    ('Robotics and Automation'),
    ('Mechatronics'),
    ('Environmental Engineering'),
    ('Mining Engineering'),
    ('Petroleum Engineering'),
    ('Agricultural Engineering'),
    ('Food Technology'),
    ('Textile Engineering'),
    ('Metallurgical Engineering'),
    ('Materials Science and Engineering'),
    ('Computer Engineering'),
    ('Computer Science and Business Systems'),
    ('Marine Engineering'),
    ('Ceramic Engineering'),
    ('Polymer and Plastics Engineering'),
    ('Structural Engineering'),
    ('Power Engineering'),
    ('Printing Technology'),
    ('Dairy Technology'),
    ('Leather Technology'),
    ('Nanotechnology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'Polytechnic Diploma'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Electrician'),
    ('Fitter'),
    ('Welder'),
    ('Turner'),
    ('Machinist'),
    ('Mechanic (Motor Vehicle)'),
    ('Mechanic (Diesel)'),
    ('Draughtsman (Civil)'),
    ('Draughtsman (Mechanical)'),
    ('Computer Operator and Programming Assistant'),
    ('Electronics Mechanic'),
    ('Refrigeration and Air Conditioning Technician'),
    ('Plumber'),
    ('Carpenter'),
    ('Wireman'),
    ('Instrument Mechanic'),
    ('Sheet Metal Worker'),
    ('Surveyor'),
    ('Stenographer'),
    ('Dress Making'),
    ('Sewing Technology'),
    ('Information Technology'),
    ('Painter (General)'),
    ('Tool and Die Maker'),
    ('Foundryman'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'ITI'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Engineering'),
    ('Computer Applications'),
    ('Business Management'),
    ('Nursing'),
    ('Pharmacy'),
    ('Elementary Education (D.El.Ed)'),
    ('Hotel Management'),
    ('Fashion Design'),
    ('Fine Arts'),
    ('Agriculture'),
    ('Animation and Multimedia'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'Advanced Diploma'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Finance'),
    ('Marketing'),
    ('Human Resource Management'),
    ('Operations Management'),
    ('Information Technology'),
    ('Business Analytics'),
    ('International Business'),
    ('Supply Chain Management'),
    ('Entrepreneurship'),
    ('Healthcare Management'),
    ('Rural Management'),
    ('Retail Management'),
    ('Banking and Insurance'),
    ('Hospitality Management'),
    ('Agri-Business Management'),
    ('Digital Marketing'),
    ('Project Management'),
    ('Data Science'),
    ('General Management'),
    ('Public Policy'),
    ('Media and Communication'),
    ('Sports Management'),
    ('Real Estate Management'),
    ('Aviation Management'),
    ('Logistics Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'PG Diploma'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Finance'),
    ('Marketing'),
    ('Human Resource Management'),
    ('Operations Management'),
    ('Information Technology'),
    ('Business Analytics'),
    ('International Business'),
    ('Supply Chain Management'),
    ('Entrepreneurship'),
    ('Healthcare Management'),
    ('Rural Management'),
    ('Retail Management'),
    ('Banking and Insurance'),
    ('Hospitality Management'),
    ('Agri-Business Management'),
    ('Digital Marketing'),
    ('Project Management'),
    ('Data Science'),
    ('General Management'),
    ('Public Policy'),
    ('Media and Communication'),
    ('Sports Management'),
    ('Real Estate Management'),
    ('Aviation Management'),
    ('Logistics Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'PGDM'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'Graduation'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('English'),
    ('Hindi'),
    ('History'),
    ('Political Science'),
    ('Economics'),
    ('Sociology'),
    ('Psychology'),
    ('Philosophy'),
    ('Geography'),
    ('Public Administration'),
    ('Sanskrit'),
    ('Urdu'),
    ('Education'),
    ('Fine Arts'),
    ('Journalism and Mass Communication'),
    ('Social Work'),
    ('Home Science'),
    ('Anthropology'),
    ('Archaeology'),
    ('Music'),
    ('Rural Development'),
    ('Statistics'),
    ('Mathematics'),
    ('Physical Education'),
    ('Tourism'),
    ('Linguistics'),
    ('Library and Information Science'),
    ('Regional Language'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.A.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Physics'),
    ('Chemistry'),
    ('Mathematics'),
    ('Biology'),
    ('Botany'),
    ('Zoology'),
    ('Computer Science'),
    ('Information Technology'),
    ('Biotechnology'),
    ('Microbiology'),
    ('Biochemistry'),
    ('Statistics'),
    ('Electronics'),
    ('Geology'),
    ('Environmental Science'),
    ('Agriculture'),
    ('Home Science'),
    ('Psychology'),
    ('Nutrition and Dietetics'),
    ('Forensic Science'),
    ('Data Science'),
    ('Life Sciences'),
    ('Medical Laboratory Technology'),
    ('Radiology and Imaging Technology'),
    ('Fashion Design'),
    ('Hotel Management'),
    ('Animation and Multimedia'),
    ('Aviation'),
    ('Geography'),
    ('Physical Science'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Sc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Accounting and Finance'),
    ('Banking and Insurance'),
    ('Taxation'),
    ('Computer Applications'),
    ('Financial Markets'),
    ('Business Administration'),
    ('Economics'),
    ('Corporate Secretaryship'),
    ('Cost and Management Accounting'),
    ('E-Commerce'),
    ('Marketing'),
    ('Statistics'),
    ('Honours'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Com.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Finance'),
    ('Marketing'),
    ('Human Resource Management'),
    ('Operations Management'),
    ('Information Technology'),
    ('Business Analytics'),
    ('International Business'),
    ('Supply Chain Management'),
    ('Entrepreneurship'),
    ('Healthcare Management'),
    ('Rural Management'),
    ('Retail Management'),
    ('Banking and Insurance'),
    ('Hospitality Management'),
    ('Agri-Business Management'),
    ('Digital Marketing'),
    ('Project Management'),
    ('Data Science'),
    ('General Management'),
    ('Public Policy'),
    ('Media and Communication'),
    ('Sports Management'),
    ('Real Estate Management'),
    ('Aviation Management'),
    ('Logistics Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BBA'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Finance'),
    ('Marketing'),
    ('Human Resource Management'),
    ('Operations Management'),
    ('Information Technology'),
    ('Business Analytics'),
    ('International Business'),
    ('Supply Chain Management'),
    ('Entrepreneurship'),
    ('Healthcare Management'),
    ('Rural Management'),
    ('Retail Management'),
    ('Banking and Insurance'),
    ('Hospitality Management'),
    ('Agri-Business Management'),
    ('Digital Marketing'),
    ('Project Management'),
    ('Data Science'),
    ('General Management'),
    ('Public Policy'),
    ('Media and Communication'),
    ('Sports Management'),
    ('Real Estate Management'),
    ('Aviation Management'),
    ('Logistics Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BMS'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Software Engineering'),
    ('Data Science'),
    ('Cyber Security'),
    ('Artificial Intelligence'),
    ('Cloud Computing'),
    ('Web Technologies'),
    ('Computer Networking'),
    ('Mobile Application Development'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BCA'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Computer Science and Engineering'),
    ('Information Technology'),
    ('Electronics and Communication Engineering'),
    ('Electrical Engineering'),
    ('Electrical and Electronics Engineering'),
    ('Mechanical Engineering'),
    ('Civil Engineering'),
    ('Chemical Engineering'),
    ('Aerospace Engineering'),
    ('Aeronautical Engineering'),
    ('Automobile Engineering'),
    ('Biotechnology'),
    ('Biomedical Engineering'),
    ('Industrial Engineering'),
    ('Production Engineering'),
    ('Instrumentation Engineering'),
    ('Electronics and Instrumentation Engineering'),
    ('Electronics Engineering'),
    ('Artificial Intelligence'),
    ('Artificial Intelligence and Machine Learning'),
    ('Data Science'),
    ('Cyber Security'),
    ('Software Engineering'),
    ('Internet of Things'),
    ('Robotics and Automation'),
    ('Mechatronics'),
    ('Environmental Engineering'),
    ('Mining Engineering'),
    ('Petroleum Engineering'),
    ('Agricultural Engineering'),
    ('Food Technology'),
    ('Textile Engineering'),
    ('Metallurgical Engineering'),
    ('Materials Science and Engineering'),
    ('Computer Engineering'),
    ('Computer Science and Business Systems'),
    ('Marine Engineering'),
    ('Ceramic Engineering'),
    ('Polymer and Plastics Engineering'),
    ('Structural Engineering'),
    ('Power Engineering'),
    ('Printing Technology'),
    ('Dairy Technology'),
    ('Leather Technology'),
    ('Nanotechnology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Tech'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Computer Science and Engineering'),
    ('Information Technology'),
    ('Electronics and Communication Engineering'),
    ('Electrical Engineering'),
    ('Electrical and Electronics Engineering'),
    ('Mechanical Engineering'),
    ('Civil Engineering'),
    ('Chemical Engineering'),
    ('Aerospace Engineering'),
    ('Aeronautical Engineering'),
    ('Automobile Engineering'),
    ('Biotechnology'),
    ('Biomedical Engineering'),
    ('Industrial Engineering'),
    ('Production Engineering'),
    ('Instrumentation Engineering'),
    ('Electronics and Instrumentation Engineering'),
    ('Electronics Engineering'),
    ('Artificial Intelligence'),
    ('Artificial Intelligence and Machine Learning'),
    ('Data Science'),
    ('Cyber Security'),
    ('Software Engineering'),
    ('Internet of Things'),
    ('Robotics and Automation'),
    ('Mechatronics'),
    ('Environmental Engineering'),
    ('Mining Engineering'),
    ('Petroleum Engineering'),
    ('Agricultural Engineering'),
    ('Food Technology'),
    ('Textile Engineering'),
    ('Metallurgical Engineering'),
    ('Materials Science and Engineering'),
    ('Computer Engineering'),
    ('Computer Science and Business Systems'),
    ('Marine Engineering'),
    ('Ceramic Engineering'),
    ('Polymer and Plastics Engineering'),
    ('Structural Engineering'),
    ('Power Engineering'),
    ('Printing Technology'),
    ('Dairy Technology'),
    ('Leather Technology'),
    ('Nanotechnology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.E.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Architecture'),
    ('Urban Design'),
    ('Landscape Architecture'),
    ('Building Engineering and Management'),
    ('Architectural Conservation'),
    ('Sustainable Architecture'),
    ('Interior Design'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Arch'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Urban Planning'),
    ('Regional Planning'),
    ('Transport Planning'),
    ('Environmental Planning'),
    ('Housing'),
    ('Infrastructure Planning'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Plan'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Fashion Design'),
    ('Industrial Design'),
    ('Product Design'),
    ('Communication Design'),
    ('Interior Design'),
    ('Graphic Design'),
    ('Textile Design'),
    ('Animation and Film Design'),
    ('User Experience Design'),
    ('Jewellery Design'),
    ('Automobile Design'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Des'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Pharmaceutics'),
    ('Pharmacology'),
    ('Pharmaceutical Chemistry'),
    ('Pharmacognosy'),
    ('Pharmacy Practice'),
    ('Quality Assurance'),
    ('Industrial Pharmacy'),
    ('Clinical Pharmacy'),
    ('Drug Regulatory Affairs'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Pharm'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Elementary Education'),
    ('Special Education'),
    ('Educational Administration'),
    ('Curriculum and Pedagogy'),
    ('Science Education'),
    ('Mathematics Education'),
    ('Language Education'),
    ('Social Science Education'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Ed.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Elementary Education'),
    ('Special Education'),
    ('Educational Administration'),
    ('Curriculum and Pedagogy'),
    ('Science Education'),
    ('Mathematics Education'),
    ('Language Education'),
    ('Social Science Education'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.El.Ed.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Constitutional Law'),
    ('Corporate Law'),
    ('Criminal Law'),
    ('Civil Law'),
    ('International Law'),
    ('Labour Law'),
    ('Intellectual Property Law'),
    ('Taxation Law'),
    ('Human Rights Law'),
    ('Environmental Law'),
    ('Family Law'),
    ('Cyber Law'),
    ('Business Law'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'LL.B.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Medicine and Surgery'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MBBS'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Oral and Maxillofacial Surgery'),
    ('Orthodontics and Dentofacial Orthopaedics'),
    ('Periodontology'),
    ('Prosthodontics and Crown & Bridge'),
    ('Conservative Dentistry and Endodontics'),
    ('Oral Pathology and Microbiology'),
    ('Paediatric and Preventive Dentistry'),
    ('Public Health Dentistry'),
    ('Oral Medicine and Radiology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BDS'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Ayurvedic Medicine and Surgery'),
    ('Panchakarma'),
    ('Dravyaguna'),
    ('Kayachikitsa'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BAMS'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Homoeopathic Medicine and Surgery'),
    ('Materia Medica'),
    ('Repertory'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BHMS'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Unani Medicine and Surgery'),
    ('Ilmul Advia'),
    ('Moalajat'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BUMS'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Naturopathy and Yogic Sciences'),
    ('Yoga Therapy'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BNYS'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Orthopaedic Physiotherapy'),
    ('Neurological Physiotherapy'),
    ('Cardiopulmonary Physiotherapy'),
    ('Sports Physiotherapy'),
    ('Paediatric Physiotherapy'),
    ('Community Physiotherapy'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BPT'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Occupational Therapy'),
    ('Paediatric Occupational Therapy'),
    ('Neuro Rehabilitation'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BOT'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Audiology'),
    ('Speech Language Pathology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BASLP'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Optometry'),
    ('Vision Science'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Optom.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General Nursing'),
    ('Medical Surgical Nursing'),
    ('Community Health Nursing'),
    ('Child Health Nursing'),
    ('Obstetrics and Gynaecological Nursing'),
    ('Psychiatric Nursing'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Sc. Nursing'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Veterinary Science and Animal Husbandry'),
    ('Veterinary Medicine'),
    ('Veterinary Surgery'),
    ('Animal Nutrition'),
    ('Animal Genetics and Breeding'),
    ('Livestock Production Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.V.Sc. & A.H.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Agronomy'),
    ('Horticulture'),
    ('Soil Science'),
    ('Plant Pathology'),
    ('Entomology'),
    ('Agricultural Economics'),
    ('Genetics and Plant Breeding'),
    ('Agricultural Extension'),
    ('Food Science and Technology'),
    ('Sericulture'),
    ('Forestry'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Sc. Agriculture'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Fisheries Science'),
    ('Aquaculture'),
    ('Fish Processing Technology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.F.Sc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Medical and Psychiatric Social Work'),
    ('Community Development'),
    ('Human Resource Management'),
    ('Family and Child Welfare'),
    ('Rural Development'),
    ('Criminology and Correctional Administration'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BSW'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Journalism'),
    ('Mass Communication'),
    ('Advertising and Public Relations'),
    ('Electronic Media'),
    ('Print Media'),
    ('Film and Television Production'),
    ('Digital Media'),
    ('Corporate Communication'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BJMC'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Journalism'),
    ('Mass Communication'),
    ('Advertising and Public Relations'),
    ('Electronic Media'),
    ('Print Media'),
    ('Film and Television Production'),
    ('Digital Media'),
    ('Corporate Communication'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BMM'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Hotel Management'),
    ('Culinary Arts'),
    ('Food and Beverage Service'),
    ('Hospitality Administration'),
    ('Tourism and Travel Management'),
    ('Front Office Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BHM'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Painting'),
    ('Sculpture'),
    ('Applied Art'),
    ('Art History'),
    ('Photography'),
    ('Music'),
    ('Dance'),
    ('Theatre'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'BFA'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Physical Education'),
    ('Sports Coaching'),
    ('Yoga'),
    ('Sports Management'),
    ('Exercise Physiology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.P.Ed.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Software Development'),
    ('Retail Management'),
    ('Healthcare'),
    ('Hospitality and Tourism'),
    ('Automobile Servicing'),
    ('Beauty and Wellness'),
    ('Banking and Financial Services'),
    ('Media and Entertainment'),
    ('Agriculture'),
    ('Construction'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Voc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Library and Information Science'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Lib.I.Sc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Statistics'),
    ('Applied Statistics'),
    ('Data Science'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Stat.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Textile Technology'),
    ('Fashion Technology'),
    ('Apparel Production'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'B.Text.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'Post Graduation'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('English'),
    ('Hindi'),
    ('History'),
    ('Political Science'),
    ('Economics'),
    ('Sociology'),
    ('Psychology'),
    ('Philosophy'),
    ('Geography'),
    ('Public Administration'),
    ('Sanskrit'),
    ('Urdu'),
    ('Education'),
    ('Fine Arts'),
    ('Journalism and Mass Communication'),
    ('Social Work'),
    ('Home Science'),
    ('Anthropology'),
    ('Archaeology'),
    ('Music'),
    ('Rural Development'),
    ('Statistics'),
    ('Mathematics'),
    ('Physical Education'),
    ('Tourism'),
    ('Linguistics'),
    ('Library and Information Science'),
    ('Regional Language'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.A.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Physics'),
    ('Chemistry'),
    ('Mathematics'),
    ('Biology'),
    ('Botany'),
    ('Zoology'),
    ('Computer Science'),
    ('Information Technology'),
    ('Biotechnology'),
    ('Microbiology'),
    ('Biochemistry'),
    ('Statistics'),
    ('Electronics'),
    ('Geology'),
    ('Environmental Science'),
    ('Agriculture'),
    ('Home Science'),
    ('Psychology'),
    ('Nutrition and Dietetics'),
    ('Forensic Science'),
    ('Data Science'),
    ('Life Sciences'),
    ('Medical Laboratory Technology'),
    ('Radiology and Imaging Technology'),
    ('Fashion Design'),
    ('Hotel Management'),
    ('Animation and Multimedia'),
    ('Aviation'),
    ('Geography'),
    ('Physical Science'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Sc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Accounting and Finance'),
    ('Banking and Insurance'),
    ('Taxation'),
    ('Computer Applications'),
    ('Financial Markets'),
    ('Business Administration'),
    ('Economics'),
    ('Corporate Secretaryship'),
    ('Cost and Management Accounting'),
    ('E-Commerce'),
    ('Marketing'),
    ('Statistics'),
    ('Honours'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Com.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Finance'),
    ('Marketing'),
    ('Human Resource Management'),
    ('Operations Management'),
    ('Information Technology'),
    ('Business Analytics'),
    ('International Business'),
    ('Supply Chain Management'),
    ('Entrepreneurship'),
    ('Healthcare Management'),
    ('Rural Management'),
    ('Retail Management'),
    ('Banking and Insurance'),
    ('Hospitality Management'),
    ('Agri-Business Management'),
    ('Digital Marketing'),
    ('Project Management'),
    ('Data Science'),
    ('General Management'),
    ('Public Policy'),
    ('Media and Communication'),
    ('Sports Management'),
    ('Real Estate Management'),
    ('Aviation Management'),
    ('Logistics Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MBA'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Software Engineering'),
    ('Data Science'),
    ('Cyber Security'),
    ('Artificial Intelligence'),
    ('Cloud Computing'),
    ('Web Technologies'),
    ('Computer Networking'),
    ('Mobile Application Development'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MCA'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Computer Science and Engineering'),
    ('Information Technology'),
    ('Electronics and Communication Engineering'),
    ('Electrical Engineering'),
    ('Electrical and Electronics Engineering'),
    ('Mechanical Engineering'),
    ('Civil Engineering'),
    ('Chemical Engineering'),
    ('Aerospace Engineering'),
    ('Aeronautical Engineering'),
    ('Automobile Engineering'),
    ('Biotechnology'),
    ('Biomedical Engineering'),
    ('Industrial Engineering'),
    ('Production Engineering'),
    ('Instrumentation Engineering'),
    ('Electronics and Instrumentation Engineering'),
    ('Electronics Engineering'),
    ('Artificial Intelligence'),
    ('Artificial Intelligence and Machine Learning'),
    ('Data Science'),
    ('Cyber Security'),
    ('Software Engineering'),
    ('Internet of Things'),
    ('Robotics and Automation'),
    ('Mechatronics'),
    ('Environmental Engineering'),
    ('Mining Engineering'),
    ('Petroleum Engineering'),
    ('Agricultural Engineering'),
    ('Food Technology'),
    ('Textile Engineering'),
    ('Metallurgical Engineering'),
    ('Materials Science and Engineering'),
    ('Computer Engineering'),
    ('Computer Science and Business Systems'),
    ('Marine Engineering'),
    ('Ceramic Engineering'),
    ('Polymer and Plastics Engineering'),
    ('Structural Engineering'),
    ('Power Engineering'),
    ('Printing Technology'),
    ('Dairy Technology'),
    ('Leather Technology'),
    ('Nanotechnology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Tech'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Computer Science and Engineering'),
    ('Information Technology'),
    ('Electronics and Communication Engineering'),
    ('Electrical Engineering'),
    ('Electrical and Electronics Engineering'),
    ('Mechanical Engineering'),
    ('Civil Engineering'),
    ('Chemical Engineering'),
    ('Aerospace Engineering'),
    ('Aeronautical Engineering'),
    ('Automobile Engineering'),
    ('Biotechnology'),
    ('Biomedical Engineering'),
    ('Industrial Engineering'),
    ('Production Engineering'),
    ('Instrumentation Engineering'),
    ('Electronics and Instrumentation Engineering'),
    ('Electronics Engineering'),
    ('Artificial Intelligence'),
    ('Artificial Intelligence and Machine Learning'),
    ('Data Science'),
    ('Cyber Security'),
    ('Software Engineering'),
    ('Internet of Things'),
    ('Robotics and Automation'),
    ('Mechatronics'),
    ('Environmental Engineering'),
    ('Mining Engineering'),
    ('Petroleum Engineering'),
    ('Agricultural Engineering'),
    ('Food Technology'),
    ('Textile Engineering'),
    ('Metallurgical Engineering'),
    ('Materials Science and Engineering'),
    ('Computer Engineering'),
    ('Computer Science and Business Systems'),
    ('Marine Engineering'),
    ('Ceramic Engineering'),
    ('Polymer and Plastics Engineering'),
    ('Structural Engineering'),
    ('Power Engineering'),
    ('Printing Technology'),
    ('Dairy Technology'),
    ('Leather Technology'),
    ('Nanotechnology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.E.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Computer Science and Engineering'),
    ('Information Technology'),
    ('Electronics and Communication Engineering'),
    ('Electrical Engineering'),
    ('Electrical and Electronics Engineering'),
    ('Mechanical Engineering'),
    ('Civil Engineering'),
    ('Chemical Engineering'),
    ('Aerospace Engineering'),
    ('Aeronautical Engineering'),
    ('Automobile Engineering'),
    ('Biotechnology'),
    ('Biomedical Engineering'),
    ('Industrial Engineering'),
    ('Production Engineering'),
    ('Instrumentation Engineering'),
    ('Electronics and Instrumentation Engineering'),
    ('Electronics Engineering'),
    ('Artificial Intelligence'),
    ('Artificial Intelligence and Machine Learning'),
    ('Data Science'),
    ('Cyber Security'),
    ('Software Engineering'),
    ('Internet of Things'),
    ('Robotics and Automation'),
    ('Mechatronics'),
    ('Environmental Engineering'),
    ('Mining Engineering'),
    ('Petroleum Engineering'),
    ('Agricultural Engineering'),
    ('Food Technology'),
    ('Textile Engineering'),
    ('Metallurgical Engineering'),
    ('Materials Science and Engineering'),
    ('Computer Engineering'),
    ('Computer Science and Business Systems'),
    ('Marine Engineering'),
    ('Ceramic Engineering'),
    ('Polymer and Plastics Engineering'),
    ('Structural Engineering'),
    ('Power Engineering'),
    ('Printing Technology'),
    ('Dairy Technology'),
    ('Leather Technology'),
    ('Nanotechnology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MS (Engineering / Science)'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Architecture'),
    ('Urban Design'),
    ('Landscape Architecture'),
    ('Building Engineering and Management'),
    ('Architectural Conservation'),
    ('Sustainable Architecture'),
    ('Interior Design'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Arch'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Urban Planning'),
    ('Regional Planning'),
    ('Transport Planning'),
    ('Environmental Planning'),
    ('Housing'),
    ('Infrastructure Planning'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Plan'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Fashion Design'),
    ('Industrial Design'),
    ('Product Design'),
    ('Communication Design'),
    ('Interior Design'),
    ('Graphic Design'),
    ('Textile Design'),
    ('Animation and Film Design'),
    ('User Experience Design'),
    ('Jewellery Design'),
    ('Automobile Design'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Des'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Pharmaceutics'),
    ('Pharmacology'),
    ('Pharmaceutical Chemistry'),
    ('Pharmacognosy'),
    ('Pharmacy Practice'),
    ('Quality Assurance'),
    ('Industrial Pharmacy'),
    ('Clinical Pharmacy'),
    ('Drug Regulatory Affairs'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Pharm'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Elementary Education'),
    ('Special Education'),
    ('Educational Administration'),
    ('Curriculum and Pedagogy'),
    ('Science Education'),
    ('Mathematics Education'),
    ('Language Education'),
    ('Social Science Education'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Ed.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Constitutional Law'),
    ('Corporate Law'),
    ('Criminal Law'),
    ('Civil Law'),
    ('International Law'),
    ('Labour Law'),
    ('Intellectual Property Law'),
    ('Taxation Law'),
    ('Human Rights Law'),
    ('Environmental Law'),
    ('Family Law'),
    ('Cyber Law'),
    ('Business Law'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'LL.M.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General Medicine'),
    ('General Surgery'),
    ('Paediatrics'),
    ('Obstetrics and Gynaecology'),
    ('Orthopaedics'),
    ('Dermatology'),
    ('Psychiatry'),
    ('Radiodiagnosis'),
    ('Anaesthesiology'),
    ('Pathology'),
    ('Ophthalmology'),
    ('ENT (Otorhinolaryngology)'),
    ('Community Medicine'),
    ('Microbiology'),
    ('Pharmacology'),
    ('Physiology'),
    ('Biochemistry'),
    ('Anatomy'),
    ('Cardiology'),
    ('Neurology'),
    ('Nephrology'),
    ('Gastroenterology'),
    ('Endocrinology'),
    ('Medical Oncology'),
    ('Urology'),
    ('Plastic Surgery'),
    ('Neurosurgery'),
    ('Cardiothoracic Surgery'),
    ('Emergency Medicine'),
    ('Respiratory Medicine'),
    ('Forensic Medicine'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MD (Doctor of Medicine)'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General Medicine'),
    ('General Surgery'),
    ('Paediatrics'),
    ('Obstetrics and Gynaecology'),
    ('Orthopaedics'),
    ('Dermatology'),
    ('Psychiatry'),
    ('Radiodiagnosis'),
    ('Anaesthesiology'),
    ('Pathology'),
    ('Ophthalmology'),
    ('ENT (Otorhinolaryngology)'),
    ('Community Medicine'),
    ('Microbiology'),
    ('Pharmacology'),
    ('Physiology'),
    ('Biochemistry'),
    ('Anatomy'),
    ('Cardiology'),
    ('Neurology'),
    ('Nephrology'),
    ('Gastroenterology'),
    ('Endocrinology'),
    ('Medical Oncology'),
    ('Urology'),
    ('Plastic Surgery'),
    ('Neurosurgery'),
    ('Cardiothoracic Surgery'),
    ('Emergency Medicine'),
    ('Respiratory Medicine'),
    ('Forensic Medicine'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MS (Master of Surgery)'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Oral and Maxillofacial Surgery'),
    ('Orthodontics and Dentofacial Orthopaedics'),
    ('Periodontology'),
    ('Prosthodontics and Crown & Bridge'),
    ('Conservative Dentistry and Endodontics'),
    ('Oral Pathology and Microbiology'),
    ('Paediatric and Preventive Dentistry'),
    ('Public Health Dentistry'),
    ('Oral Medicine and Radiology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MDS'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Orthopaedic Physiotherapy'),
    ('Neurological Physiotherapy'),
    ('Cardiopulmonary Physiotherapy'),
    ('Sports Physiotherapy'),
    ('Paediatric Physiotherapy'),
    ('Community Physiotherapy'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MPT'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General Nursing'),
    ('Medical Surgical Nursing'),
    ('Community Health Nursing'),
    ('Child Health Nursing'),
    ('Obstetrics and Gynaecological Nursing'),
    ('Psychiatric Nursing'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Sc. Nursing'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Public Health'),
    ('Epidemiology'),
    ('Health Policy and Management'),
    ('Biostatistics'),
    ('Environmental Health'),
    ('Nutrition'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MPH'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Hospital Administration'),
    ('Healthcare Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MHA'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Medical and Psychiatric Social Work'),
    ('Community Development'),
    ('Human Resource Management'),
    ('Family and Child Welfare'),
    ('Rural Development'),
    ('Criminology and Correctional Administration'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MSW'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Journalism'),
    ('Mass Communication'),
    ('Advertising and Public Relations'),
    ('Electronic Media'),
    ('Print Media'),
    ('Film and Television Production'),
    ('Digital Media'),
    ('Corporate Communication'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MJMC'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Hotel Management'),
    ('Culinary Arts'),
    ('Food and Beverage Service'),
    ('Hospitality Administration'),
    ('Tourism and Travel Management'),
    ('Front Office Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MHM'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Painting'),
    ('Sculpture'),
    ('Applied Art'),
    ('Art History'),
    ('Photography'),
    ('Music'),
    ('Dance'),
    ('Theatre'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'MFA'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Physical Education'),
    ('Sports Coaching'),
    ('Yoga'),
    ('Sports Management'),
    ('Exercise Physiology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.P.Ed.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Software Development'),
    ('Retail Management'),
    ('Healthcare'),
    ('Hospitality and Tourism'),
    ('Automobile Servicing'),
    ('Beauty and Wellness'),
    ('Banking and Financial Services'),
    ('Media and Entertainment'),
    ('Agriculture'),
    ('Construction'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Voc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Library and Information Science'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Lib.I.Sc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Statistics'),
    ('Applied Statistics'),
    ('Data Science'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Stat.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Veterinary Science and Animal Husbandry'),
    ('Veterinary Medicine'),
    ('Veterinary Surgery'),
    ('Animal Nutrition'),
    ('Animal Genetics and Breeding'),
    ('Livestock Production Management'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.V.Sc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Agronomy'),
    ('Horticulture'),
    ('Soil Science'),
    ('Plant Pathology'),
    ('Entomology'),
    ('Agricultural Economics'),
    ('Genetics and Plant Breeding'),
    ('Agricultural Extension'),
    ('Food Science and Technology'),
    ('Sericulture'),
    ('Forestry'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Sc. Agriculture'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Fisheries Science'),
    ('Aquaculture'),
    ('Fish Processing Technology'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.F.Sc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Engineering and Technology'),
    ('Computer Science'),
    ('Management'),
    ('Commerce'),
    ('Economics'),
    ('Physics'),
    ('Chemistry'),
    ('Mathematics'),
    ('Life Sciences'),
    ('Biotechnology'),
    ('Medicine'),
    ('Pharmacy'),
    ('Law'),
    ('Education'),
    ('English'),
    ('Hindi'),
    ('History'),
    ('Political Science'),
    ('Sociology'),
    ('Psychology'),
    ('Philosophy'),
    ('Geography'),
    ('Agriculture'),
    ('Environmental Science'),
    ('Social Work'),
    ('Journalism and Mass Communication'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Phil.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Engineering and Technology'),
    ('Computer Science'),
    ('Management'),
    ('Commerce'),
    ('Economics'),
    ('Physics'),
    ('Chemistry'),
    ('Mathematics'),
    ('Life Sciences'),
    ('Biotechnology'),
    ('Medicine'),
    ('Pharmacy'),
    ('Law'),
    ('Education'),
    ('English'),
    ('Hindi'),
    ('History'),
    ('Political Science'),
    ('Sociology'),
    ('Psychology'),
    ('Philosophy'),
    ('Geography'),
    ('Agriculture'),
    ('Environmental Science'),
    ('Social Work'),
    ('Journalism and Mass Communication'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'Ph.D.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Engineering and Technology'),
    ('Computer Science'),
    ('Management'),
    ('Commerce'),
    ('Economics'),
    ('Physics'),
    ('Chemistry'),
    ('Mathematics'),
    ('Life Sciences'),
    ('Biotechnology'),
    ('Medicine'),
    ('Pharmacy'),
    ('Law'),
    ('Education'),
    ('English'),
    ('Hindi'),
    ('History'),
    ('Political Science'),
    ('Sociology'),
    ('Psychology'),
    ('Philosophy'),
    ('Geography'),
    ('Agriculture'),
    ('Environmental Science'),
    ('Social Work'),
    ('Journalism and Mass Communication'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'D.Sc.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Engineering and Technology'),
    ('Computer Science'),
    ('Management'),
    ('Commerce'),
    ('Economics'),
    ('Physics'),
    ('Chemistry'),
    ('Mathematics'),
    ('Life Sciences'),
    ('Biotechnology'),
    ('Medicine'),
    ('Pharmacy'),
    ('Law'),
    ('Education'),
    ('English'),
    ('Hindi'),
    ('History'),
    ('Political Science'),
    ('Sociology'),
    ('Psychology'),
    ('Philosophy'),
    ('Geography'),
    ('Agriculture'),
    ('Environmental Science'),
    ('Social Work'),
    ('Journalism and Mass Communication'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'D.Litt.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General'),
    ('Constitutional Law'),
    ('Corporate Law'),
    ('Criminal Law'),
    ('Civil Law'),
    ('International Law'),
    ('Labour Law'),
    ('Intellectual Property Law'),
    ('Taxation Law'),
    ('Human Rights Law'),
    ('Environmental Law'),
    ('Family Law'),
    ('Cyber Law'),
    ('Business Law'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'LL.D.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General Medicine'),
    ('General Surgery'),
    ('Paediatrics'),
    ('Obstetrics and Gynaecology'),
    ('Orthopaedics'),
    ('Dermatology'),
    ('Psychiatry'),
    ('Radiodiagnosis'),
    ('Anaesthesiology'),
    ('Pathology'),
    ('Ophthalmology'),
    ('ENT (Otorhinolaryngology)'),
    ('Community Medicine'),
    ('Microbiology'),
    ('Pharmacology'),
    ('Physiology'),
    ('Biochemistry'),
    ('Anatomy'),
    ('Cardiology'),
    ('Neurology'),
    ('Nephrology'),
    ('Gastroenterology'),
    ('Endocrinology'),
    ('Medical Oncology'),
    ('Urology'),
    ('Plastic Surgery'),
    ('Neurosurgery'),
    ('Cardiothoracic Surgery'),
    ('Emergency Medicine'),
    ('Respiratory Medicine'),
    ('Forensic Medicine'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'DM (Doctorate of Medicine)'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('General Medicine'),
    ('General Surgery'),
    ('Paediatrics'),
    ('Obstetrics and Gynaecology'),
    ('Orthopaedics'),
    ('Dermatology'),
    ('Psychiatry'),
    ('Radiodiagnosis'),
    ('Anaesthesiology'),
    ('Pathology'),
    ('Ophthalmology'),
    ('ENT (Otorhinolaryngology)'),
    ('Community Medicine'),
    ('Microbiology'),
    ('Pharmacology'),
    ('Physiology'),
    ('Biochemistry'),
    ('Anatomy'),
    ('Cardiology'),
    ('Neurology'),
    ('Nephrology'),
    ('Gastroenterology'),
    ('Endocrinology'),
    ('Medical Oncology'),
    ('Urology'),
    ('Plastic Surgery'),
    ('Neurosurgery'),
    ('Cardiothoracic Surgery'),
    ('Emergency Medicine'),
    ('Respiratory Medicine'),
    ('Forensic Medicine'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'M.Ch.'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Engineering and Technology'),
    ('Computer Science'),
    ('Management'),
    ('Commerce'),
    ('Economics'),
    ('Physics'),
    ('Chemistry'),
    ('Mathematics'),
    ('Life Sciences'),
    ('Biotechnology'),
    ('Medicine'),
    ('Pharmacy'),
    ('Law'),
    ('Education'),
    ('English'),
    ('Hindi'),
    ('History'),
    ('Political Science'),
    ('Sociology'),
    ('Psychology'),
    ('Philosophy'),
    ('Geography'),
    ('Agriculture'),
    ('Environmental Science'),
    ('Social Work'),
    ('Journalism and Mass Communication'),
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'Post Doctoral Fellowship'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")
SELECT v.name, '', t."EducationTypeID"
FROM (VALUES
    ('Other')
  ) AS v(name)
CROSS JOIN "tblMstrEducationType" t
WHERE t."Descr" = 'Other'
ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;

-- Institutions (tblMstrInstitute). StateID is resolved from the state name; CityID is
-- resolved only when a district in that state carries the same name, because
-- tblMstrCily is a district list and many campuses sit in a city named differently
-- from its district (Bhubaneswar/Khordha, Roorkee/Haridwar). The City text always
-- holds the place a candidate would recognise.
INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Dr. B. R. Ambedkar Institute of Technology', 'dr b r ambedkar institute technology', 'dr b r ambedkar institute technology dbrait', 'Institute', 'Port Blair'),
    ('Jawaharlal Nehru Rajkeeya Mahavidyalaya', 'jawaharlal nehru rajkeeya mahavidyalaya', 'jawaharlal nehru rajkeeya mahavidyalaya jnrm', 'College', 'Port Blair'),
    ('Andaman and Nicobar Islands Institute of Medical Sciences', 'andaman nicobar islands institute medical sciences', 'andaman nicobar islands institute medical sciences aniims', 'Institute', 'Port Blair'),
    ('Tagore Government College of Education', 'tagore government college education', 'tagore government college education tgce', 'College', 'Port Blair')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Andaman Nicobar'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Andhra University', 'andhra university', 'andhra university au', 'University', 'Visakhapatnam'),
    ('Sri Venkateswara University', 'sri venkateswara university', 'sri venkateswara university svu', 'University', 'Tirupati'),
    ('Acharya Nagarjuna University', 'acharya nagarjuna university', 'acharya nagarjuna university anu', 'University', 'Guntur'),
    ('Jawaharlal Nehru Technological University Kakinada', 'jawaharlal nehru technological university kakinada', 'jawaharlal nehru technological university kakinada jntuk', 'University', 'Kakinada'),
    ('Jawaharlal Nehru Technological University Anantapur', 'jawaharlal nehru technological university anantapur', 'jawaharlal nehru technological university anantapur jntua', 'University', 'Anantapur'),
    ('Indian Institute of Technology Tirupati', 'indian institute technology tirupati', 'indian institute technology tirupati iitt', 'Institute', 'Tirupati'),
    ('National Institute of Technology Andhra Pradesh', 'national institute technology andhra pradesh', 'national institute technology andhra pradesh nitap', 'Institute', 'Tadepalligudem'),
    ('Indian Institute of Management Visakhapatnam', 'indian institute management visakhapatnam', 'indian institute management visakhapatnam iimv', 'Institute', 'Visakhapatnam'),
    ('Indian Institute of Science Education and Research Tirupati', 'indian institute science education research tirupati', 'indian institute science education research tirupati iisert', 'Institute', 'Tirupati'),
    ('Rajiv Gandhi University of Knowledge Technologies', 'rajiv gandhi university knowledge technologies', 'rajiv gandhi university knowledge technologies rgukt', 'University', 'Nuzvid'),
    ('Sri Padmavati Mahila Visvavidyalayam', 'sri padmavati mahila visvavidyalayam', 'sri padmavati mahila visvavidyalayam spmv', 'University', 'Tirupati'),
    ('Krishna University', 'krishna university', 'krishna university ku', 'University', 'Machilipatnam'),
    ('Adikavi Nannaya University', 'adikavi nannaya university', 'adikavi nannaya university anu', 'University', 'Rajahmundry'),
    ('Yogi Vemana University', 'yogi vemana university', 'yogi vemana university yvu', 'University', 'Kadapa'),
    ('Dr. B. R. Ambedkar University Srikakulam', 'dr b r ambedkar university srikakulam', 'dr b r ambedkar university srikakulam dbraus', 'University', 'Srikakulam'),
    ('Vignan''s Foundation for Science, Technology and Research', 'vignans foundation science technology research', 'vignans foundation science technology research vfstr', 'University', 'Guntur'),
    ('Koneru Lakshmaiah Education Foundation (KL University)', 'koneru lakshmaiah education foundation kl university', 'koneru lakshmaiah education foundation kl university klefku', 'University', 'Guntur'),
    ('GITAM (Gandhi Institute of Technology and Management)', 'gitam gandhi institute technology management', 'gitam gandhi institute technology management ggitm', 'University', 'Visakhapatnam'),
    ('Sri Venkateswara Institute of Medical Sciences', 'sri venkateswara institute medical sciences', 'sri venkateswara institute medical sciences svims', 'Institute', 'Tirupati'),
    ('Andhra Loyola College', 'andhra loyola college', 'andhra loyola college alc', 'College', 'Vijayawada'),
    ('Acharya N. G. Ranga Agricultural University', 'acharya n g ranga agricultural university', 'acharya n g ranga agricultural university angrau', 'University', 'Guntur')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Andhra Pradesh'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Rajiv Gandhi University', 'rajiv gandhi university', 'rajiv gandhi university rgu', 'University', 'Itanagar'),
    ('National Institute of Technology Arunachal Pradesh', 'national institute technology arunachal pradesh', 'national institute technology arunachal pradesh nitap', 'Institute', 'Jote'),
    ('North Eastern Regional Institute of Science and Technology', 'north eastern regional institute science technology', 'north eastern regional institute science technology nerist', 'Institute', 'Nirjuli'),
    ('Arunachal University of Studies', 'arunachal university studies', 'arunachal university studies aus', 'University', 'Namsai'),
    ('Himalayan University', 'himalayan university', 'himalayan university hu', 'University', 'Itanagar'),
    ('Tomo Riba Institute of Health and Medical Sciences', 'tomo riba institute health medical sciences', 'tomo riba institute health medical sciences trihms', 'Institute', 'Naharlagun')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Arunachal Pradesh'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Gauhati University', 'gauhati university', 'gauhati university gu', 'University', 'Guwahati'),
    ('Dibrugarh University', 'dibrugarh university', 'dibrugarh university du', 'University', 'Dibrugarh'),
    ('Assam University', 'assam university', 'assam university au', 'University', 'Silchar'),
    ('Tezpur University', 'tezpur university', 'tezpur university tu', 'University', 'Tezpur'),
    ('Cotton University', 'cotton university', 'cotton university cu', 'University', 'Guwahati'),
    ('Bodoland University', 'bodoland university', 'bodoland university bu', 'University', 'Kokrajhar'),
    ('Indian Institute of Technology Guwahati', 'indian institute technology guwahati', 'indian institute technology guwahati iitg', 'Institute', 'Guwahati'),
    ('National Institute of Technology Silchar', 'national institute technology silchar', 'national institute technology silchar nits', 'Institute', 'Silchar'),
    ('Indian Institute of Information Technology Guwahati', 'indian institute information technology guwahati', 'indian institute information technology guwahati iiitg', 'Institute', 'Guwahati'),
    ('Assam Agricultural University', 'assam agricultural university', 'assam agricultural university aau', 'University', 'Jorhat'),
    ('Assam Engineering College', 'assam engineering college', 'assam engineering college aec', 'College', 'Guwahati'),
    ('Gauhati Medical College and Hospital', 'gauhati medical college hospital', 'gauhati medical college hospital gmch', 'College', 'Guwahati'),
    ('Assam Medical College', 'assam medical college', 'assam medical college amc', 'College', 'Dibrugarh'),
    ('Krishna Kanta Handiqui State Open University', 'krishna kanta handiqui state open university', 'krishna kanta handiqui state open university kkhsou', 'University', 'Guwahati'),
    ('National Law University and Judicial Academy, Assam', 'national law university judicial academy assam', 'national law university judicial academy assam nlujaa', 'University', 'Guwahati'),
    ('Royal Global University', 'royal global university', 'royal global university rgu', 'University', 'Guwahati'),
    ('Assam Down Town University', 'assam down town university', 'assam down town university adtu', 'University', 'Guwahati'),
    ('Assam Science and Technology University', 'assam science technology university', 'assam science technology university astu', 'University', 'Guwahati')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Assam'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Patna University', 'patna university', 'patna university pu', 'University', 'Patna'),
    ('Magadh University', 'magadh university', 'magadh university mu', 'University', 'Bodh Gaya'),
    ('Lalit Narayan Mithila University', 'lalit narayan mithila university', 'lalit narayan mithila university lnmu', 'University', 'Darbhanga'),
    ('Babasaheb Bhimrao Ambedkar Bihar University', 'babasaheb bhimrao ambedkar bihar university', 'babasaheb bhimrao ambedkar bihar university bbabu', 'University', 'Muzaffarpur'),
    ('Tilka Manjhi Bhagalpur University', 'tilka manjhi bhagalpur university', 'tilka manjhi bhagalpur university tmbu', 'University', 'Bhagalpur'),
    ('Veer Kunwar Singh University', 'veer kunwar singh university', 'veer kunwar singh university vksu', 'University', 'Arrah'),
    ('Jai Prakash University', 'jai prakash university', 'jai prakash university jpu', 'University', 'Chapra'),
    ('Bhupendra Narayan Mandal University', 'bhupendra narayan mandal university', 'bhupendra narayan mandal university bnmu', 'University', 'Madhepura'),
    ('Patliputra University', 'patliputra university', 'patliputra university pu', 'University', 'Patna'),
    ('Munger University', 'munger university', 'munger university mu', 'University', 'Munger'),
    ('Purnea University', 'purnea university', 'purnea university pu', 'University', 'Purnia'),
    ('Kameshwar Singh Darbhanga Sanskrit University', 'kameshwar singh darbhanga sanskrit university', 'kameshwar singh darbhanga sanskrit university ksdsu', 'University', 'Darbhanga'),
    ('Nalanda Open University', 'nalanda open university', 'nalanda open university nou', 'University', 'Patna'),
    ('Aryabhatta Knowledge University', 'aryabhatta knowledge university', 'aryabhatta knowledge university aku', 'University', 'Patna'),
    ('Nalanda University', 'nalanda university', 'nalanda university nu', 'University', 'Rajgir'),
    ('Central University of South Bihar', 'central university south bihar', 'central university south bihar cusb', 'University', 'Gaya'),
    ('Bihar Engineering University', 'bihar engineering university', 'bihar engineering university beu', 'University', 'Patna'),
    ('Indian Institute of Technology Patna', 'indian institute technology patna', 'indian institute technology patna iitp', 'Institute', 'Patna'),
    ('National Institute of Technology Patna', 'national institute technology patna', 'national institute technology patna nitp', 'Institute', 'Patna'),
    ('Indian Institute of Management Bodh Gaya', 'indian institute management bodh gaya', 'indian institute management bodh gaya iimbg', 'Institute', 'Bodh Gaya'),
    ('Chanakya National Law University', 'chanakya national law university', 'chanakya national law university cnlu', 'University', 'Patna'),
    ('Chandragupt Institute of Management Patna', 'chandragupt institute management patna', 'chandragupt institute management patna cimp', 'Institute', 'Patna'),
    ('Development Management Institute', 'development management institute', 'development management institute dmi', 'Institute', 'Patna'),
    ('National Institute of Fashion Technology Patna', 'national institute fashion technology patna', 'national institute fashion technology patna niftp', 'Institute', 'Patna'),
    ('All India Institute of Medical Sciences Patna', 'all india institute medical sciences patna', 'all india institute medical sciences patna aiimsp', 'Institute', 'Patna'),
    ('Indira Gandhi Institute of Medical Sciences', 'indira gandhi institute medical sciences', 'indira gandhi institute medical sciences igims', 'Institute', 'Patna'),
    ('Patna Medical College and Hospital', 'patna medical college hospital', 'patna medical college hospital pmch', 'College', 'Patna'),
    ('Nalanda Medical College and Hospital', 'nalanda medical college hospital', 'nalanda medical college hospital nmch', 'College', 'Patna'),
    ('Darbhanga Medical College and Hospital', 'darbhanga medical college hospital', 'darbhanga medical college hospital dmch', 'College', 'Darbhanga'),
    ('Shri Krishna Medical College and Hospital', 'shri krishna medical college hospital', 'shri krishna medical college hospital skmch', 'College', 'Muzaffarpur'),
    ('Muzaffarpur Institute of Technology', 'muzaffarpur institute technology', 'muzaffarpur institute technology mit', 'Institute', 'Muzaffarpur'),
    ('Birla Institute of Technology Patna Campus', 'birla institute technology patna campus', 'birla institute technology patna campus bitpc', 'Institute', 'Patna'),
    ('Bihar Agricultural University', 'bihar agricultural university', 'bihar agricultural university bau', 'University', 'Sabour'),
    ('Dr. Rajendra Prasad Central Agricultural University', 'dr rajendra prasad central agricultural university', 'dr rajendra prasad central agricultural university drpcau', 'University', 'Samastipur'),
    ('Gaya College', 'gaya college', 'gaya college gc', 'College', 'Gaya'),
    ('Langat Singh College', 'langat singh college', 'langat singh college lsc', 'College', 'Muzaffarpur'),
    ('Bihar National College', 'bihar national college', 'bihar national college bnc', 'College', 'Patna'),
    ('A. N. College', 'a n college', 'a n college anc', 'College', 'Patna')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Bihar'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Panjab University', 'panjab university', 'panjab university pu', 'University', 'Chandigarh'),
    ('Post Graduate Institute of Medical Education and Research', 'post graduate institute medical education research', 'post graduate institute medical education research pgimer', 'Institute', 'Chandigarh'),
    ('Punjab Engineering College', 'punjab engineering college', 'punjab engineering college pec', 'College', 'Chandigarh'),
    ('Government Medical College and Hospital Chandigarh', 'government medical college hospital chandigarh', 'government medical college hospital chandigarh gmchc', 'College', 'Chandigarh'),
    ('Chandigarh College of Engineering and Technology', 'chandigarh college engineering technology', 'chandigarh college engineering technology ccet', 'College', 'Chandigarh'),
    ('DAV College Chandigarh', 'dav college chandigarh', 'dav college chandigarh dcc', 'College', 'Chandigarh'),
    ('Government College of Art Chandigarh', 'government college art chandigarh', 'government college art chandigarh gcac', 'College', 'Chandigarh')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Chandigarh'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Pandit Ravishankar Shukla University', 'pandit ravishankar shukla university', 'pandit ravishankar shukla university prsu', 'University', 'Raipur'),
    ('Guru Ghasidas Vishwavidyalaya', 'guru ghasidas vishwavidyalaya', 'guru ghasidas vishwavidyalaya ggv', 'University', 'Bilaspur'),
    ('National Institute of Technology Raipur', 'national institute technology raipur', 'national institute technology raipur nitr', 'Institute', 'Raipur'),
    ('Indian Institute of Technology Bhilai', 'indian institute technology bhilai', 'indian institute technology bhilai iitb', 'Institute', 'Bhilai'),
    ('Indian Institute of Management Raipur', 'indian institute management raipur', 'indian institute management raipur iimr', 'Institute', 'Raipur'),
    ('Chhattisgarh Swami Vivekanand Technical University', 'chhattisgarh swami vivekanand technical university', 'chhattisgarh swami vivekanand technical university csvtu', 'University', 'Bhilai'),
    ('Hidayatullah National Law University', 'hidayatullah national law university', 'hidayatullah national law university hnlu', 'University', 'Raipur'),
    ('All India Institute of Medical Sciences Raipur', 'all india institute medical sciences raipur', 'all india institute medical sciences raipur aiimsr', 'Institute', 'Raipur'),
    ('Indira Gandhi Krishi Vishwavidyalaya', 'indira gandhi krishi vishwavidyalaya', 'indira gandhi krishi vishwavidyalaya igkv', 'University', 'Raipur'),
    ('Pt. Deendayal Upadhyay Memorial Health Sciences University', 'pt deendayal upadhyay memorial health sciences university', 'pt deendayal upadhyay memorial health sciences university pdumhsu', 'University', 'Raipur'),
    ('Shaheed Mahendra Karma Vishwavidyalaya', 'shaheed mahendra karma vishwavidyalaya', 'shaheed mahendra karma vishwavidyalaya smkv', 'University', 'Jagdalpur'),
    ('Government Engineering College Bilaspur', 'government engineering college bilaspur', 'government engineering college bilaspur gecb', 'College', 'Bilaspur')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Chhattisgarh'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Government College Silvassa', 'government college silvassa', 'government college silvassa gcs', 'College', 'Silvassa'),
    ('SSR College of Arts, Commerce and Science', 'ssr college arts commerce science', 'ssr college arts commerce science scacs', 'College', 'Silvassa'),
    ('SSR Institute of Management and Research', 'ssr institute management research', 'ssr institute management research simr', 'Institute', 'Silvassa'),
    ('Government College Daman', 'government college daman', 'government college daman gcd', 'College', 'Daman'),
    ('Government Polytechnic Daman', 'government polytechnic daman', 'government polytechnic daman gpd', 'College', 'Daman')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Dadra Nagar Haveli and Daman and Diu'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('University of Delhi', 'university delhi', 'university delhi ud', 'University', 'Delhi'),
    ('Jawaharlal Nehru University', 'jawaharlal nehru university', 'jawaharlal nehru university jnu', 'University', 'Delhi'),
    ('Jamia Millia Islamia', 'jamia millia islamia', 'jamia millia islamia jmi', 'University', 'Delhi'),
    ('Indian Institute of Technology Delhi', 'indian institute technology delhi', 'indian institute technology delhi iitd', 'Institute', 'Delhi'),
    ('All India Institute of Medical Sciences Delhi', 'all india institute medical sciences delhi', 'all india institute medical sciences delhi aiimsd', 'Institute', 'Delhi'),
    ('Delhi Technological University', 'delhi technological university', 'delhi technological university dtu', 'University', 'Delhi'),
    ('Netaji Subhas University of Technology', 'netaji subhas university technology', 'netaji subhas university technology nsut', 'University', 'Delhi'),
    ('Indraprastha Institute of Information Technology Delhi', 'indraprastha institute information technology delhi', 'indraprastha institute information technology delhi iiitd', 'Institute', 'Delhi'),
    ('Guru Gobind Singh Indraprastha University', 'guru gobind singh indraprastha university', 'guru gobind singh indraprastha university ggsiu', 'University', 'Delhi'),
    ('Ambedkar University Delhi', 'ambedkar university delhi', 'ambedkar university delhi aud', 'University', 'Delhi'),
    ('National Law University Delhi', 'national law university delhi', 'national law university delhi nlud', 'University', 'Delhi'),
    ('Indira Gandhi National Open University', 'indira gandhi national open university', 'indira gandhi national open university ignou', 'University', 'Delhi'),
    ('Jamia Hamdard', 'jamia hamdard', 'jamia hamdard jh', 'University', 'Delhi'),
    ('Indian Agricultural Research Institute', 'indian agricultural research institute', 'indian agricultural research institute iari', 'Institute', 'Delhi'),
    ('Indian Institute of Foreign Trade', 'indian institute foreign trade', 'indian institute foreign trade iift', 'Institute', 'Delhi'),
    ('School of Planning and Architecture Delhi', 'school planning architecture delhi', 'school planning architecture delhi spad', 'Institute', 'Delhi'),
    ('National Institute of Fashion Technology Delhi', 'national institute fashion technology delhi', 'national institute fashion technology delhi niftd', 'Institute', 'Delhi'),
    ('Faculty of Management Studies, University of Delhi', 'faculty management studies university delhi', 'faculty management studies university delhi fmsud', 'Institute', 'Delhi'),
    ('Maulana Azad Medical College', 'maulana azad medical college', 'maulana azad medical college mamc', 'College', 'Delhi'),
    ('Lady Hardinge Medical College', 'lady hardinge medical college', 'lady hardinge medical college lhmc', 'College', 'Delhi'),
    ('Vardhman Mahavir Medical College', 'vardhman mahavir medical college', 'vardhman mahavir medical college vmmc', 'College', 'Delhi'),
    ('University College of Medical Sciences', 'university college medical sciences', 'university college medical sciences ucms', 'College', 'Delhi'),
    ('Shri Ram College of Commerce', 'shri ram college commerce', 'shri ram college commerce srcc', 'College', 'Delhi'),
    ('St. Stephen''s College', 'st stephens college', 'st stephens college ssc', 'College', 'Delhi'),
    ('Hindu College', 'hindu college', 'hindu college hc', 'College', 'Delhi'),
    ('Lady Shri Ram College for Women', 'lady shri ram college women', 'lady shri ram college women lsrcw', 'College', 'Delhi'),
    ('Hansraj College', 'hansraj college', 'hansraj college hc', 'College', 'Delhi'),
    ('Miranda House', 'miranda house', 'miranda house mh', 'College', 'Delhi'),
    ('Kirori Mal College', 'kirori mal college', 'kirori mal college kmc', 'College', 'Delhi'),
    ('Ramjas College', 'ramjas college', 'ramjas college rc', 'College', 'Delhi'),
    ('Sri Venkateswara College', 'sri venkateswara college', 'sri venkateswara college svc', 'College', 'Delhi'),
    ('Netaji Subhas Institute of Technology', 'netaji subhas institute technology', 'netaji subhas institute technology nsit', 'Institute', 'Delhi')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Delhi'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Goa University', 'goa university', 'goa university gu', 'University', 'Panaji'),
    ('National Institute of Technology Goa', 'national institute technology goa', 'national institute technology goa nitg', 'Institute', 'Ponda'),
    ('Birla Institute of Technology and Science Pilani, Goa Campus', 'birla institute technology science pilani goa campus', 'birla institute technology science pilani goa campus bitspgc', 'Institute', 'Zuarinagar'),
    ('Goa Medical College', 'goa medical college', 'goa medical college gmc', 'College', 'Bambolim'),
    ('Goa Institute of Management', 'goa institute management', 'goa institute management gim', 'Institute', 'Sanquelim'),
    ('Goa College of Engineering', 'goa college engineering', 'goa college engineering gce', 'College', 'Ponda')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Goa'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Gujarat University', 'gujarat university', 'gujarat university gu', 'University', 'Ahmedabad'),
    ('Maharaja Sayajirao University of Baroda', 'maharaja sayajirao university baroda', 'maharaja sayajirao university baroda msub', 'University', 'Vadodara'),
    ('Sardar Patel University', 'sardar patel university', 'sardar patel university spu', 'University', 'Anand'),
    ('Saurashtra University', 'saurashtra university', 'saurashtra university su', 'University', 'Rajkot'),
    ('Veer Narmad South Gujarat University', 'veer narmad south gujarat university', 'veer narmad south gujarat university vnsgu', 'University', 'Surat'),
    ('Krantiguru Shyamji Krishna Verma Kachchh University', 'krantiguru shyamji krishna verma kachchh university', 'krantiguru shyamji krishna verma kachchh university kskvku', 'University', 'Bhuj'),
    ('Gujarat Technological University', 'gujarat technological university', 'gujarat technological university gtu', 'University', 'Ahmedabad'),
    ('Indian Institute of Technology Gandhinagar', 'indian institute technology gandhinagar', 'indian institute technology gandhinagar iitg', 'Institute', 'Gandhinagar'),
    ('Indian Institute of Management Ahmedabad', 'indian institute management ahmedabad', 'indian institute management ahmedabad iima', 'Institute', 'Ahmedabad'),
    ('Sardar Vallabhbhai National Institute of Technology', 'sardar vallabhbhai national institute technology', 'sardar vallabhbhai national institute technology svnit', 'Institute', 'Surat'),
    ('Dhirubhai Ambani Institute of Information and Communication Technology', 'dhirubhai ambani institute information communication technology', 'dhirubhai ambani institute information communication technology daiict', 'Institute', 'Gandhinagar'),
    ('Pandit Deendayal Energy University', 'pandit deendayal energy university', 'pandit deendayal energy university pdeu', 'University', 'Gandhinagar'),
    ('Nirma University', 'nirma university', 'nirma university nu', 'University', 'Ahmedabad'),
    ('National Institute of Design', 'national institute design', 'national institute design nid', 'Institute', 'Ahmedabad'),
    ('CEPT University', 'cept university', 'cept university cu', 'University', 'Ahmedabad'),
    ('Gujarat National Law University', 'gujarat national law university', 'gujarat national law university gnlu', 'University', 'Gandhinagar'),
    ('Charotar University of Science and Technology', 'charotar university science technology', 'charotar university science technology cust', 'University', 'Anand'),
    ('Ganpat University', 'ganpat university', 'ganpat university gu', 'University', 'Mehsana'),
    ('Marwadi University', 'marwadi university', 'marwadi university mu', 'University', 'Rajkot'),
    ('B. J. Medical College', 'b j medical college', 'b j medical college bjmc', 'College', 'Ahmedabad'),
    ('Anand Agricultural University', 'anand agricultural university', 'anand agricultural university aau', 'University', 'Anand'),
    ('Institute of Rural Management Anand', 'institute rural management anand', 'institute rural management anand irma', 'Institute', 'Anand'),
    ('L. D. College of Engineering', 'l d college engineering', 'l d college engineering ldce', 'College', 'Ahmedabad')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Gujarat'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Kurukshetra University', 'kurukshetra university', 'kurukshetra university ku', 'University', 'Kurukshetra'),
    ('Maharshi Dayanand University', 'maharshi dayanand university', 'maharshi dayanand university mdu', 'University', 'Rohtak'),
    ('Guru Jambheshwar University of Science and Technology', 'guru jambheshwar university science technology', 'guru jambheshwar university science technology gjust', 'University', 'Hisar'),
    ('Chaudhary Devi Lal University', 'chaudhary devi lal university', 'chaudhary devi lal university cdlu', 'University', 'Sirsa'),
    ('Central University of Haryana', 'central university haryana', 'central university haryana cuh', 'University', 'Mahendragarh'),
    ('National Institute of Technology Kurukshetra', 'national institute technology kurukshetra', 'national institute technology kurukshetra nitk', 'Institute', 'Kurukshetra'),
    ('Indian Institute of Management Rohtak', 'indian institute management rohtak', 'indian institute management rohtak iimr', 'Institute', 'Rohtak'),
    ('National Institute of Food Technology Entrepreneurship and Management', 'national institute food technology entrepreneurship management', 'national institute food technology entrepreneurship management niftem', 'Institute', 'Sonipat'),
    ('Chaudhary Charan Singh Haryana Agricultural University', 'chaudhary charan singh haryana agricultural university', 'chaudhary charan singh haryana agricultural university ccshau', 'University', 'Hisar'),
    ('Deenbandhu Chhotu Ram University of Science and Technology', 'deenbandhu chhotu ram university science technology', 'deenbandhu chhotu ram university science technology dcrust', 'University', 'Murthal'),
    ('J. C. Bose University of Science and Technology, YMCA', 'j c bose university science technology ymca', 'j c bose university science technology ymca jcbusty', 'University', 'Faridabad'),
    ('Ashoka University', 'ashoka university', 'ashoka university au', 'University', 'Sonipat'),
    ('O. P. Jindal Global University', 'o p jindal global university', 'o p jindal global university opjgu', 'University', 'Sonipat'),
    ('Manav Rachna International Institute of Research and Studies', 'manav rachna international institute research studies', 'manav rachna international institute research studies mriirs', 'University', 'Faridabad'),
    ('Amity University Haryana', 'amity university haryana', 'amity university haryana auh', 'University', 'Gurugram'),
    ('SGT University', 'sgt university', 'sgt university su', 'University', 'Gurugram'),
    ('The NorthCap University', 'northcap university', 'northcap university nu', 'University', 'Gurugram'),
    ('Pandit Bhagwat Dayal Sharma Post Graduate Institute of Medical Sciences', 'pandit bhagwat dayal sharma post graduate institute medical sciences', 'pandit bhagwat dayal sharma post graduate institute medical sciences pbdspgims', 'Institute', 'Rohtak'),
    ('National Brain Research Centre', 'national brain research centre', 'national brain research centre nbrc', 'Institute', 'Gurugram')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Haryana'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Himachal Pradesh University', 'himachal pradesh university', 'himachal pradesh university hpu', 'University', 'Shimla'),
    ('Central University of Himachal Pradesh', 'central university himachal pradesh', 'central university himachal pradesh cuhp', 'University', 'Dharamshala'),
    ('Indian Institute of Technology Mandi', 'indian institute technology mandi', 'indian institute technology mandi iitm', 'Institute', 'Mandi'),
    ('National Institute of Technology Hamirpur', 'national institute technology hamirpur', 'national institute technology hamirpur nith', 'Institute', 'Hamirpur'),
    ('Indian Institute of Management Sirmaur', 'indian institute management sirmaur', 'indian institute management sirmaur iims', 'Institute', 'Sirmaur'),
    ('Dr. Yashwant Singh Parmar University of Horticulture and Forestry', 'dr yashwant singh parmar university horticulture forestry', 'dr yashwant singh parmar university horticulture forestry dyspuhf', 'University', 'Solan'),
    ('Chaudhary Sarwan Kumar Himachal Pradesh Krishi Vishvavidyalaya', 'chaudhary sarwan kumar himachal pradesh krishi vishvavidyalaya', 'chaudhary sarwan kumar himachal pradesh krishi vishvavidyalaya cskhpkv', 'University', 'Palampur'),
    ('Jaypee University of Information Technology', 'jaypee university information technology', 'jaypee university information technology juit', 'University', 'Solan'),
    ('Shoolini University', 'shoolini university', 'shoolini university su', 'University', 'Solan'),
    ('Indira Gandhi Medical College', 'indira gandhi medical college', 'indira gandhi medical college igmc', 'College', 'Shimla'),
    ('Atal Medical and Research University', 'atal medical research university', 'atal medical research university amru', 'University', 'Mandi')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Himachal Pradesh'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('University of Kashmir', 'university kashmir', 'university kashmir uk', 'University', 'Srinagar'),
    ('University of Jammu', 'university jammu', 'university jammu uj', 'University', 'Jammu'),
    ('Central University of Kashmir', 'central university kashmir', 'central university kashmir cuk', 'University', 'Ganderbal'),
    ('Central University of Jammu', 'central university jammu', 'central university jammu cuj', 'University', 'Samba'),
    ('Indian Institute of Technology Jammu', 'indian institute technology jammu', 'indian institute technology jammu iitj', 'Institute', 'Jammu'),
    ('National Institute of Technology Srinagar', 'national institute technology srinagar', 'national institute technology srinagar nits', 'Institute', 'Srinagar'),
    ('Shri Mata Vaishno Devi University', 'shri mata vaishno devi university', 'shri mata vaishno devi university smvdu', 'University', 'Katra'),
    ('Islamic University of Science and Technology', 'islamic university science technology', 'islamic university science technology iust', 'University', 'Awantipora'),
    ('Baba Ghulam Shah Badshah University', 'baba ghulam shah badshah university', 'baba ghulam shah badshah university bgsbu', 'University', 'Rajouri'),
    ('Sher-e-Kashmir University of Agricultural Sciences and Technology of Kashmir', 'sher e kashmir university agricultural sciences technology kashmir', 'sher e kashmir university agricultural sciences technology kashmir sekuastk', 'University', 'Srinagar'),
    ('Sher-e-Kashmir University of Agricultural Sciences and Technology of Jammu', 'sher e kashmir university agricultural sciences technology jammu', 'sher e kashmir university agricultural sciences technology jammu sekuastj', 'University', 'Jammu'),
    ('Sher-i-Kashmir Institute of Medical Sciences', 'sher i kashmir institute medical sciences', 'sher i kashmir institute medical sciences sikims', 'Institute', 'Srinagar'),
    ('Government Medical College Srinagar', 'government medical college srinagar', 'government medical college srinagar gmcs', 'College', 'Srinagar'),
    ('Government Medical College Jammu', 'government medical college jammu', 'government medical college jammu gmcj', 'College', 'Jammu'),
    ('Cluster University of Jammu', 'cluster university jammu', 'cluster university jammu cuj', 'University', 'Jammu'),
    ('Cluster University of Srinagar', 'cluster university srinagar', 'cluster university srinagar cus', 'University', 'Srinagar')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Jammu Kashmir'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Ranchi University', 'ranchi university', 'ranchi university ru', 'University', 'Ranchi'),
    ('Vinoba Bhave University', 'vinoba bhave university', 'vinoba bhave university vbu', 'University', 'Hazaribagh'),
    ('Kolhan University', 'kolhan university', 'kolhan university ku', 'University', 'Chaibasa'),
    ('Nilamber-Pitamber University', 'nilamber pitamber university', 'nilamber pitamber university npu', 'University', 'Medininagar'),
    ('Sido Kanhu Murmu University', 'sido kanhu murmu university', 'sido kanhu murmu university skmu', 'University', 'Dumka'),
    ('Central University of Jharkhand', 'central university jharkhand', 'central university jharkhand cuj', 'University', 'Ranchi'),
    ('Jharkhand University of Technology', 'jharkhand university technology', 'jharkhand university technology jut', 'University', 'Ranchi'),
    ('Indian Institute of Technology (ISM) Dhanbad', 'indian institute technology ism dhanbad', 'indian institute technology ism dhanbad iitid', 'Institute', 'Dhanbad'),
    ('National Institute of Technology Jamshedpur', 'national institute technology jamshedpur', 'national institute technology jamshedpur nitj', 'Institute', 'Jamshedpur'),
    ('Indian Institute of Management Ranchi', 'indian institute management ranchi', 'indian institute management ranchi iimr', 'Institute', 'Ranchi'),
    ('Birla Institute of Technology Mesra', 'birla institute technology mesra', 'birla institute technology mesra bitm', 'Institute', 'Ranchi'),
    ('Xavier School of Management (XLRI)', 'xavier school management xlri', 'xavier school management xlri xsmx', 'Institute', 'Jamshedpur'),
    ('National University of Study and Research in Law', 'national university study research in law', 'national university study research in law nusril', 'University', 'Ranchi'),
    ('Rajendra Institute of Medical Sciences', 'rajendra institute medical sciences', 'rajendra institute medical sciences rims', 'Institute', 'Ranchi'),
    ('Birsa Agricultural University', 'birsa agricultural university', 'birsa agricultural university bau', 'University', 'Ranchi'),
    ('St. Xavier’s College Ranchi', 'st xaviers college ranchi', 'st xaviers college ranchi sxcr', 'College', 'Ranchi')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Jharkhand'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Bangalore University', 'bangalore university', 'bangalore university bu', 'University', 'Bengaluru'),
    ('University of Mysore', 'university mysore', 'university mysore um', 'University', 'Mysuru'),
    ('Karnatak University', 'karnatak university', 'karnatak university ku', 'University', 'Dharwad'),
    ('Kuvempu University', 'kuvempu university', 'kuvempu university ku', 'University', 'Shivamogga'),
    ('Mangalore University', 'mangalore university', 'mangalore university mu', 'University', 'Mangaluru'),
    ('Visvesvaraya Technological University', 'visvesvaraya technological university', 'visvesvaraya technological university vtu', 'University', 'Belagavi'),
    ('Indian Institute of Science', 'indian institute science', 'indian institute science iis', 'Institute', 'Bengaluru'),
    ('Indian Institute of Management Bangalore', 'indian institute management bangalore', 'indian institute management bangalore iimb', 'Institute', 'Bengaluru'),
    ('Indian Institute of Technology Dharwad', 'indian institute technology dharwad', 'indian institute technology dharwad iitd', 'Institute', 'Dharwad'),
    ('National Institute of Technology Karnataka', 'national institute technology karnataka', 'national institute technology karnataka nitk', 'Institute', 'Surathkal'),
    ('International Institute of Information Technology Bangalore', 'international institute information technology bangalore', 'international institute information technology bangalore iiitb', 'Institute', 'Bengaluru'),
    ('National Law School of India University', 'national law school india university', 'national law school india university nlsiu', 'University', 'Bengaluru'),
    ('Manipal Academy of Higher Education', 'manipal academy higher education', 'manipal academy higher education mahe', 'University', 'Manipal'),
    ('R. V. College of Engineering', 'r v college engineering', 'r v college engineering rvce', 'College', 'Bengaluru'),
    ('B. M. S. College of Engineering', 'b m s college engineering', 'b m s college engineering bmsce', 'College', 'Bengaluru'),
    ('M. S. Ramaiah Institute of Technology', 'm s ramaiah institute technology', 'm s ramaiah institute technology msrit', 'Institute', 'Bengaluru'),
    ('PES University', 'pes university', 'pes university pu', 'University', 'Bengaluru'),
    ('Christ University', 'christ university', 'christ university cu', 'University', 'Bengaluru'),
    ('Jain University', 'jain university', 'jain university ju', 'University', 'Bengaluru'),
    ('Dayananda Sagar College of Engineering', 'dayananda sagar college engineering', 'dayananda sagar college engineering dsce', 'College', 'Bengaluru'),
    ('Siddaganga Institute of Technology', 'siddaganga institute technology', 'siddaganga institute technology sit', 'Institute', 'Tumakuru'),
    ('KLE Technological University', 'kle technological university', 'kle technological university ktu', 'University', 'Hubballi'),
    ('University of Agricultural Sciences Bangalore', 'university agricultural sciences bangalore', 'university agricultural sciences bangalore uasb', 'University', 'Bengaluru'),
    ('Rajiv Gandhi University of Health Sciences', 'rajiv gandhi university health sciences', 'rajiv gandhi university health sciences rguhs', 'University', 'Bengaluru'),
    ('Kasturba Medical College Manipal', 'kasturba medical college manipal', 'kasturba medical college manipal kmcm', 'College', 'Manipal'),
    ('JSS Academy of Higher Education and Research', 'jss academy higher education research', 'jss academy higher education research jaher', 'University', 'Mysuru'),
    ('National Institute of Mental Health and Neurosciences', 'national institute mental health neurosciences', 'national institute mental health neurosciences nimhn', 'Institute', 'Bengaluru'),
    ('St. Joseph''s College Bengaluru', 'st josephs college bengaluru', 'st josephs college bengaluru sjcb', 'College', 'Bengaluru'),
    ('Bangalore Medical College and Research Institute', 'bangalore medical college research institute', 'bangalore medical college research institute bmcri', 'College', 'Bengaluru')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Karnataka'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('University of Kerala', 'university kerala', 'university kerala uk', 'University', 'Thiruvananthapuram'),
    ('Cochin University of Science and Technology', 'cochin university science technology', 'cochin university science technology cust', 'University', 'Kochi'),
    ('Mahatma Gandhi University', 'mahatma gandhi university', 'mahatma gandhi university mgu', 'University', 'Kottayam'),
    ('University of Calicut', 'university calicut', 'university calicut uc', 'University', 'Thenhipalam'),
    ('Kannur University', 'kannur university', 'kannur university ku', 'University', 'Kannur'),
    ('APJ Abdul Kalam Technological University', 'apj abdul kalam technological university', 'apj abdul kalam technological university aaktu', 'University', 'Thiruvananthapuram'),
    ('Indian Institute of Technology Palakkad', 'indian institute technology palakkad', 'indian institute technology palakkad iitp', 'Institute', 'Palakkad'),
    ('National Institute of Technology Calicut', 'national institute technology calicut', 'national institute technology calicut nitc', 'Institute', 'Kozhikode'),
    ('Indian Institute of Management Kozhikode', 'indian institute management kozhikode', 'indian institute management kozhikode iimk', 'Institute', 'Kozhikode'),
    ('Indian Institute of Space Science and Technology', 'indian institute space science technology', 'indian institute space science technology iisst', 'Institute', 'Thiruvananthapuram'),
    ('College of Engineering Trivandrum', 'college engineering trivandrum', 'college engineering trivandrum cet', 'College', 'Thiruvananthapuram'),
    ('Government Engineering College Thrissur', 'government engineering college thrissur', 'government engineering college thrissur gect', 'College', 'Thrissur'),
    ('Sree Chitra Tirunal Institute for Medical Sciences and Technology', 'sree chitra tirunal institute medical sciences technology', 'sree chitra tirunal institute medical sciences technology sctimst', 'Institute', 'Thiruvananthapuram'),
    ('Government Medical College Thiruvananthapuram', 'government medical college thiruvananthapuram', 'government medical college thiruvananthapuram gmct', 'College', 'Thiruvananthapuram'),
    ('Amrita Vishwa Vidyapeetham', 'amrita vishwa vidyapeetham', 'amrita vishwa vidyapeetham avv', 'University', 'Kollam'),
    ('Kerala Agricultural University', 'kerala agricultural university', 'kerala agricultural university kau', 'University', 'Thrissur'),
    ('National University of Advanced Legal Studies', 'national university advanced legal studies', 'national university advanced legal studies nuals', 'University', 'Kochi'),
    ('Kerala University of Fisheries and Ocean Studies', 'kerala university fisheries ocean studies', 'kerala university fisheries ocean studies kufos', 'University', 'Kochi'),
    ('Sree Sankaracharya University of Sanskrit', 'sree sankaracharya university sanskrit', 'sree sankaracharya university sanskrit ssus', 'University', 'Kalady'),
    ('Kerala University of Health Sciences', 'kerala university health sciences', 'kerala university health sciences kuhs', 'University', 'Thrissur')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Kerala'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('University of Ladakh', 'university ladakh', 'university ladakh ul', 'University', 'Leh'),
    ('Eliezer Joldan Memorial College', 'eliezer joldan memorial college', 'eliezer joldan memorial college ejmc', 'College', 'Leh'),
    ('Government Degree College Kargil', 'government degree college kargil', 'government degree college kargil gdck', 'College', 'Kargil')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Ladakh'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Calicut University Centre Lakshadweep', 'calicut university centre lakshadweep', 'calicut university centre lakshadweep cucl', 'College', 'Kavaratti'),
    ('Government Polytechnic Kadmat', 'government polytechnic kadmat', 'government polytechnic kadmat gpk', 'College', 'Kadmat')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Lakshadweep'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Devi Ahilya Vishwavidyalaya', 'devi ahilya vishwavidyalaya', 'devi ahilya vishwavidyalaya dav', 'University', 'Indore'),
    ('Barkatullah University', 'barkatullah university', 'barkatullah university bu', 'University', 'Bhopal'),
    ('Rani Durgavati Vishwavidyalaya', 'rani durgavati vishwavidyalaya', 'rani durgavati vishwavidyalaya rdv', 'University', 'Jabalpur'),
    ('Jiwaji University', 'jiwaji university', 'jiwaji university ju', 'University', 'Gwalior'),
    ('Vikram University', 'vikram university', 'vikram university vu', 'University', 'Ujjain'),
    ('Dr. Harisingh Gour Vishwavidyalaya', 'dr harisingh gour vishwavidyalaya', 'dr harisingh gour vishwavidyalaya dhgv', 'University', 'Sagar'),
    ('Rajiv Gandhi Proudyogiki Vishwavidyalaya', 'rajiv gandhi proudyogiki vishwavidyalaya', 'rajiv gandhi proudyogiki vishwavidyalaya rgpv', 'University', 'Bhopal'),
    ('Indian Institute of Technology Indore', 'indian institute technology indore', 'indian institute technology indore iiti', 'Institute', 'Indore'),
    ('Indian Institute of Management Indore', 'indian institute management indore', 'indian institute management indore iimi', 'Institute', 'Indore'),
    ('Maulana Azad National Institute of Technology', 'maulana azad national institute technology', 'maulana azad national institute technology manit', 'Institute', 'Bhopal'),
    ('Indian Institute of Science Education and Research Bhopal', 'indian institute science education research bhopal', 'indian institute science education research bhopal iiserb', 'Institute', 'Bhopal'),
    ('Atal Bihari Vajpayee Indian Institute of Information Technology and Management', 'atal bihari vajpayee indian institute information technology management', 'atal bihari vajpayee indian institute information technology management abviiitm', 'Institute', 'Gwalior'),
    ('National Law Institute University', 'national law institute university', 'national law institute university nliu', 'University', 'Bhopal'),
    ('All India Institute of Medical Sciences Bhopal', 'all india institute medical sciences bhopal', 'all india institute medical sciences bhopal aiimsb', 'Institute', 'Bhopal'),
    ('Jawaharlal Nehru Krishi Vishwa Vidyalaya', 'jawaharlal nehru krishi vishwa vidyalaya', 'jawaharlal nehru krishi vishwa vidyalaya jnkvv', 'University', 'Jabalpur'),
    ('Rajmata Vijayaraje Scindia Krishi Vishwa Vidyalaya', 'rajmata vijayaraje scindia krishi vishwa vidyalaya', 'rajmata vijayaraje scindia krishi vishwa vidyalaya rvskvv', 'University', 'Gwalior'),
    ('Madhav Institute of Technology and Science', 'madhav institute technology science', 'madhav institute technology science mits', 'Institute', 'Gwalior'),
    ('Shri Govindram Seksaria Institute of Technology and Science', 'shri govindram seksaria institute technology science', 'shri govindram seksaria institute technology science sgsits', 'Institute', 'Indore'),
    ('Gandhi Medical College Bhopal', 'gandhi medical college bhopal', 'gandhi medical college bhopal gmcb', 'College', 'Bhopal'),
    ('Netaji Subhash Chandra Bose Medical College', 'netaji subhash chandra bose medical college', 'netaji subhash chandra bose medical college nscbmc', 'College', 'Jabalpur'),
    ('Amity University Madhya Pradesh', 'amity university madhya pradesh', 'amity university madhya pradesh aump', 'University', 'Gwalior'),
    ('Indian Institute of Forest Management', 'indian institute forest management', 'indian institute forest management iifm', 'Institute', 'Bhopal')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Madhya Pradesh'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('University of Mumbai', 'university mumbai', 'university mumbai um', 'University', 'Mumbai'),
    ('Savitribai Phule Pune University', 'savitribai phule pune university', 'savitribai phule pune university sppu', 'University', 'Pune'),
    ('Rashtrasant Tukadoji Maharaj Nagpur University', 'rashtrasant tukadoji maharaj nagpur university', 'rashtrasant tukadoji maharaj nagpur university rtmnu', 'University', 'Nagpur'),
    ('Shivaji University', 'shivaji university', 'shivaji university su', 'University', 'Kolhapur'),
    ('Dr. Babasaheb Ambedkar Marathwada University', 'dr babasaheb ambedkar marathwada university', 'dr babasaheb ambedkar marathwada university dbamu', 'University', 'Aurangabad'),
    ('Sant Gadge Baba Amravati University', 'sant gadge baba amravati university', 'sant gadge baba amravati university sgbau', 'University', 'Amravati'),
    ('Swami Ramanand Teerth Marathwada University', 'swami ramanand teerth marathwada university', 'swami ramanand teerth marathwada university srtmu', 'University', 'Nanded'),
    ('Kavayitri Bahinabai Chaudhari North Maharashtra University', 'kavayitri bahinabai chaudhari north maharashtra university', 'kavayitri bahinabai chaudhari north maharashtra university kbcnmu', 'University', 'Jalgaon'),
    ('SNDT Women''s University', 'sndt womens university', 'sndt womens university swu', 'University', 'Mumbai'),
    ('Indian Institute of Technology Bombay', 'indian institute technology bombay', 'indian institute technology bombay iitb', 'Institute', 'Mumbai'),
    ('Indian Institute of Management Mumbai', 'indian institute management mumbai', 'indian institute management mumbai iimm', 'Institute', 'Mumbai'),
    ('Indian Institute of Management Nagpur', 'indian institute management nagpur', 'indian institute management nagpur iimn', 'Institute', 'Nagpur'),
    ('Veermata Jijabai Technological Institute', 'veermata jijabai technological institute', 'veermata jijabai technological institute vjti', 'Institute', 'Mumbai'),
    ('Institute of Chemical Technology', 'institute chemical technology', 'institute chemical technology ict', 'Institute', 'Mumbai'),
    ('Visvesvaraya National Institute of Technology', 'visvesvaraya national institute technology', 'visvesvaraya national institute technology vnit', 'Institute', 'Nagpur'),
    ('College of Engineering Pune', 'college engineering pune', 'college engineering pune cep', 'College', 'Pune'),
    ('Tata Institute of Social Sciences', 'tata institute social sciences', 'tata institute social sciences tiss', 'Institute', 'Mumbai'),
    ('Indian Institute of Science Education and Research Pune', 'indian institute science education research pune', 'indian institute science education research pune iiserp', 'Institute', 'Pune'),
    ('Homi Bhabha National Institute', 'homi bhabha national institute', 'homi bhabha national institute hbni', 'Institute', 'Mumbai'),
    ('Symbiosis International University', 'symbiosis international university', 'symbiosis international university siu', 'University', 'Pune'),
    ('Dr. D. Y. Patil Vidyapeeth', 'dr d y patil vidyapeeth', 'dr d y patil vidyapeeth ddypv', 'University', 'Pune'),
    ('Bharati Vidyapeeth', 'bharati vidyapeeth', 'bharati vidyapeeth bv', 'University', 'Pune'),
    ('MIT World Peace University', 'mit world peace university', 'mit world peace university mwpu', 'University', 'Pune'),
    ('Maharashtra University of Health Sciences', 'maharashtra university health sciences', 'maharashtra university health sciences muhs', 'University', 'Nashik'),
    ('Maharashtra National Law University Mumbai', 'maharashtra national law university mumbai', 'maharashtra national law university mumbai mnlum', 'University', 'Mumbai'),
    ('Seth G. S. Medical College and KEM Hospital', 'seth g s medical college kem hospital', 'seth g s medical college kem hospital sgsmckh', 'College', 'Mumbai'),
    ('Grant Government Medical College', 'grant government medical college', 'grant government medical college ggmc', 'College', 'Mumbai'),
    ('Armed Forces Medical College', 'armed forces medical college', 'armed forces medical college afmc', 'College', 'Pune'),
    ('St. Xavier''s College Mumbai', 'st xaviers college mumbai', 'st xaviers college mumbai sxcm', 'College', 'Mumbai'),
    ('Fergusson College', 'fergusson college', 'fergusson college fc', 'College', 'Pune'),
    ('Sardar Patel Institute of Technology', 'sardar patel institute technology', 'sardar patel institute technology spit', 'Institute', 'Mumbai'),
    ('K. J. Somaiya College of Engineering', 'k j somaiya college engineering', 'k j somaiya college engineering kjsce', 'College', 'Mumbai'),
    ('Vishwakarma Institute of Technology', 'vishwakarma institute technology', 'vishwakarma institute technology vit', 'Institute', 'Pune'),
    ('Government College of Engineering Karad', 'government college engineering karad', 'government college engineering karad gcek', 'College', 'Karad'),
    ('Film and Television Institute of India', 'film television institute india', 'film television institute india ftii', 'Institute', 'Pune'),
    ('Gokhale Institute of Politics and Economics', 'gokhale institute politics economics', 'gokhale institute politics economics gipe', 'Institute', 'Pune'),
    ('Dr. Panjabrao Deshmukh Krishi Vidyapeeth', 'dr panjabrao deshmukh krishi vidyapeeth', 'dr panjabrao deshmukh krishi vidyapeeth dpdkv', 'University', 'Akola'),
    ('Mahatma Phule Krishi Vidyapeeth', 'mahatma phule krishi vidyapeeth', 'mahatma phule krishi vidyapeeth mpkv', 'University', 'Rahuri')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Maharashtra'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Manipur University', 'manipur university', 'manipur university mu', 'University', 'Imphal'),
    ('Dhanamanjuri University', 'dhanamanjuri university', 'dhanamanjuri university du', 'University', 'Imphal'),
    ('Manipur Technical University', 'manipur technical university', 'manipur technical university mtu', 'University', 'Imphal'),
    ('National Institute of Technology Manipur', 'national institute technology manipur', 'national institute technology manipur nitm', 'Institute', 'Imphal'),
    ('Indian Institute of Information Technology Manipur', 'indian institute information technology manipur', 'indian institute information technology manipur iiitm', 'Institute', 'Imphal'),
    ('Central Agricultural University', 'central agricultural university', 'central agricultural university cau', 'University', 'Imphal'),
    ('Regional Institute of Medical Sciences', 'regional institute medical sciences', 'regional institute medical sciences rims', 'Institute', 'Imphal'),
    ('Jawaharlal Nehru Institute of Medical Sciences', 'jawaharlal nehru institute medical sciences', 'jawaharlal nehru institute medical sciences jnims', 'Institute', 'Imphal')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Manipur'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('North-Eastern Hill University', 'north eastern hill university', 'north eastern hill university nehu', 'University', 'Shillong'),
    ('Indian Institute of Management Shillong', 'indian institute management shillong', 'indian institute management shillong iims', 'Institute', 'Shillong'),
    ('National Institute of Technology Meghalaya', 'national institute technology meghalaya', 'national institute technology meghalaya nitm', 'Institute', 'Shillong'),
    ('North Eastern Indira Gandhi Regional Institute of Health and Medical Sciences', 'north eastern indira gandhi regional institute health medical sciences', 'north eastern indira gandhi regional institute health medical sciences neigrihms', 'Institute', 'Shillong'),
    ('Martin Luther Christian University', 'martin luther christian university', 'martin luther christian university mlcu', 'University', 'Shillong'),
    ('University of Science and Technology Meghalaya', 'university science technology meghalaya', 'university science technology meghalaya ustm', 'University', 'Ri Bhoi'),
    ('St. Anthony''s College', 'st anthonys college', 'st anthonys college sac', 'College', 'Shillong')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Meghalaya'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Mizoram University', 'mizoram university', 'mizoram university mu', 'University', 'Aizawl'),
    ('National Institute of Technology Mizoram', 'national institute technology mizoram', 'national institute technology mizoram nitm', 'Institute', 'Aizawl'),
    ('Pachhunga University College', 'pachhunga university college', 'pachhunga university college puc', 'College', 'Aizawl'),
    ('Government Aizawl College', 'government aizawl college', 'government aizawl college gac', 'College', 'Aizawl'),
    ('Zoram Medical College', 'zoram medical college', 'zoram medical college zmc', 'College', 'Falkawn'),
    ('Regional Institute of Paramedical and Nursing Sciences', 'regional institute paramedical nursing sciences', 'regional institute paramedical nursing sciences ripns', 'Institute', 'Aizawl')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Mizoram'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Nagaland University', 'nagaland university', 'nagaland university nu', 'University', 'Lumami'),
    ('National Institute of Technology Nagaland', 'national institute technology nagaland', 'national institute technology nagaland nitn', 'Institute', 'Dimapur'),
    ('St. Joseph University', 'st joseph university', 'st joseph university sju', 'University', 'Dimapur'),
    ('ICFAI University Nagaland', 'icfai university nagaland', 'icfai university nagaland iun', 'University', 'Dimapur'),
    ('Kohima Science College', 'kohima science college', 'kohima science college ksc', 'College', 'Kohima'),
    ('Nagaland Institute of Medical Sciences and Research', 'nagaland institute medical sciences research', 'nagaland institute medical sciences research nimsr', 'Institute', 'Kohima')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Nagaland'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Utkal University', 'utkal university', 'utkal university uu', 'University', 'Bhubaneswar'),
    ('Sambalpur University', 'sambalpur university', 'sambalpur university su', 'University', 'Sambalpur'),
    ('Berhampur University', 'berhampur university', 'berhampur university bu', 'University', 'Berhampur'),
    ('Fakir Mohan University', 'fakir mohan university', 'fakir mohan university fmu', 'University', 'Balasore'),
    ('Ravenshaw University', 'ravenshaw university', 'ravenshaw university ru', 'University', 'Cuttack'),
    ('Central University of Odisha', 'central university odisha', 'central university odisha cuo', 'University', 'Koraput'),
    ('Biju Patnaik University of Technology', 'biju patnaik university technology', 'biju patnaik university technology bput', 'University', 'Rourkela'),
    ('Indian Institute of Technology Bhubaneswar', 'indian institute technology bhubaneswar', 'indian institute technology bhubaneswar iitb', 'Institute', 'Bhubaneswar'),
    ('National Institute of Technology Rourkela', 'national institute technology rourkela', 'national institute technology rourkela nitr', 'Institute', 'Rourkela'),
    ('Indian Institute of Management Sambalpur', 'indian institute management sambalpur', 'indian institute management sambalpur iims', 'Institute', 'Sambalpur'),
    ('Indian Institute of Science Education and Research Berhampur', 'indian institute science education research berhampur', 'indian institute science education research berhampur iiserb', 'Institute', 'Berhampur'),
    ('Xavier University Bhubaneswar', 'xavier university bhubaneswar', 'xavier university bhubaneswar xub', 'University', 'Bhubaneswar'),
    ('Kalinga Institute of Industrial Technology', 'kalinga institute industrial technology', 'kalinga institute industrial technology kiit', 'University', 'Bhubaneswar'),
    ('Siksha O Anusandhan University', 'siksha o anusandhan university', 'siksha o anusandhan university soau', 'University', 'Bhubaneswar'),
    ('Veer Surendra Sai University of Technology', 'veer surendra sai university technology', 'veer surendra sai university technology vssut', 'University', 'Burla'),
    ('Odisha University of Agriculture and Technology', 'odisha university agriculture technology', 'odisha university agriculture technology ouat', 'University', 'Bhubaneswar'),
    ('All India Institute of Medical Sciences Bhubaneswar', 'all india institute medical sciences bhubaneswar', 'all india institute medical sciences bhubaneswar aiimsb', 'Institute', 'Bhubaneswar'),
    ('S.C.B. Medical College and Hospital', 's c b medical college hospital', 's c b medical college hospital scbmch', 'College', 'Cuttack'),
    ('National Law University Odisha', 'national law university odisha', 'national law university odisha nluo', 'University', 'Cuttack')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Odisha'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Pondicherry University', 'pondicherry university', 'pondicherry university pu', 'University', 'Puducherry'),
    ('Jawaharlal Institute of Postgraduate Medical Education and Research', 'jawaharlal institute postgraduate medical education research', 'jawaharlal institute postgraduate medical education research jipmer', 'Institute', 'Puducherry'),
    ('Puducherry Technological University', 'puducherry technological university', 'puducherry technological university ptu', 'University', 'Puducherry'),
    ('Mahatma Gandhi Medical College and Research Institute', 'mahatma gandhi medical college research institute', 'mahatma gandhi medical college research institute mgmcri', 'College', 'Puducherry'),
    ('Indira Gandhi Medical College and Research Institute', 'indira gandhi medical college research institute', 'indira gandhi medical college research institute igmcri', 'College', 'Puducherry'),
    ('Sri Manakula Vinayagar Engineering College', 'sri manakula vinayagar engineering college', 'sri manakula vinayagar engineering college smvec', 'College', 'Puducherry'),
    ('Kanchi Mamunivar Government Institute for Postgraduate Studies and Research', 'kanchi mamunivar government institute postgraduate studies research', 'kanchi mamunivar government institute postgraduate studies research kmgipsr', 'Institute', 'Puducherry')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Puducherry'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Punjabi University', 'punjabi university', 'punjabi university pu', 'University', 'Patiala'),
    ('Guru Nanak Dev University', 'guru nanak dev university', 'guru nanak dev university gndu', 'University', 'Amritsar'),
    ('Central University of Punjab', 'central university punjab', 'central university punjab cup', 'University', 'Bathinda'),
    ('I. K. Gujral Punjab Technical University', 'i k gujral punjab technical university', 'i k gujral punjab technical university ikgptu', 'University', 'Kapurthala'),
    ('Thapar Institute of Engineering and Technology', 'thapar institute engineering technology', 'thapar institute engineering technology tiet', 'Institute', 'Patiala'),
    ('Indian Institute of Technology Ropar', 'indian institute technology ropar', 'indian institute technology ropar iitr', 'Institute', 'Rupnagar'),
    ('Indian Institute of Management Amritsar', 'indian institute management amritsar', 'indian institute management amritsar iima', 'Institute', 'Amritsar'),
    ('Dr. B. R. Ambedkar National Institute of Technology Jalandhar', 'dr b r ambedkar national institute technology jalandhar', 'dr b r ambedkar national institute technology jalandhar dbranitj', 'Institute', 'Jalandhar'),
    ('Lovely Professional University', 'lovely professional university', 'lovely professional university lpu', 'University', 'Phagwara'),
    ('Chandigarh University', 'chandigarh university', 'chandigarh university cu', 'University', 'Mohali'),
    ('Punjab Agricultural University', 'punjab agricultural university', 'punjab agricultural university pau', 'University', 'Ludhiana'),
    ('Guru Angad Dev Veterinary and Animal Sciences University', 'guru angad dev veterinary animal sciences university', 'guru angad dev veterinary animal sciences university gadvasu', 'University', 'Ludhiana'),
    ('Rajiv Gandhi National University of Law', 'rajiv gandhi national university law', 'rajiv gandhi national university law rgnul', 'University', 'Patiala'),
    ('Christian Medical College Ludhiana', 'christian medical college ludhiana', 'christian medical college ludhiana cmcl', 'College', 'Ludhiana'),
    ('Government Medical College Amritsar', 'government medical college amritsar', 'government medical college amritsar gmca', 'College', 'Amritsar'),
    ('Sri Guru Granth Sahib World University', 'sri guru granth sahib world university', 'sri guru granth sahib world university sggswu', 'University', 'Fatehgarh Sahib'),
    ('Guru Kashi University', 'guru kashi university', 'guru kashi university gku', 'University', 'Bathinda')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Punjab'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('University of Rajasthan', 'university rajasthan', 'university rajasthan ur', 'University', 'Jaipur'),
    ('Mohanlal Sukhadia University', 'mohanlal sukhadia university', 'mohanlal sukhadia university msu', 'University', 'Udaipur'),
    ('Jai Narain Vyas University', 'jai narain vyas university', 'jai narain vyas university jnvu', 'University', 'Jodhpur'),
    ('Maharshi Dayanand Saraswati University', 'maharshi dayanand saraswati university', 'maharshi dayanand saraswati university mdsu', 'University', 'Ajmer'),
    ('Maharaja Ganga Singh University', 'maharaja ganga singh university', 'maharaja ganga singh university mgsu', 'University', 'Bikaner'),
    ('Central University of Rajasthan', 'central university rajasthan', 'central university rajasthan cur', 'University', 'Kishangarh'),
    ('Rajasthan Technical University', 'rajasthan technical university', 'rajasthan technical university rtu', 'University', 'Kota'),
    ('Indian Institute of Technology Jodhpur', 'indian institute technology jodhpur', 'indian institute technology jodhpur iitj', 'Institute', 'Jodhpur'),
    ('Indian Institute of Management Udaipur', 'indian institute management udaipur', 'indian institute management udaipur iimu', 'Institute', 'Udaipur'),
    ('Malaviya National Institute of Technology', 'malaviya national institute technology', 'malaviya national institute technology mnit', 'Institute', 'Jaipur'),
    ('Birla Institute of Technology and Science Pilani', 'birla institute technology science pilani', 'birla institute technology science pilani bitsp', 'Institute', 'Pilani'),
    ('LNM Institute of Information Technology', 'lnm institute information technology', 'lnm institute information technology liit', 'Institute', 'Jaipur'),
    ('Manipal University Jaipur', 'manipal university jaipur', 'manipal university jaipur muj', 'University', 'Jaipur'),
    ('Banasthali Vidyapith', 'banasthali vidyapith', 'banasthali vidyapith bv', 'University', 'Banasthali'),
    ('Amity University Rajasthan', 'amity university rajasthan', 'amity university rajasthan aur', 'University', 'Jaipur'),
    ('Jaipur National University', 'jaipur national university', 'jaipur national university jnu', 'University', 'Jaipur'),
    ('Vivekananda Global University', 'vivekananda global university', 'vivekananda global university vgu', 'University', 'Jaipur'),
    ('National Law University Jodhpur', 'national law university jodhpur', 'national law university jodhpur nluj', 'University', 'Jodhpur'),
    ('All India Institute of Medical Sciences Jodhpur', 'all india institute medical sciences jodhpur', 'all india institute medical sciences jodhpur aiimsj', 'Institute', 'Jodhpur'),
    ('Sawai Man Singh Medical College', 'sawai man singh medical college', 'sawai man singh medical college smsmc', 'College', 'Jaipur'),
    ('Maharana Pratap University of Agriculture and Technology', 'maharana pratap university agriculture technology', 'maharana pratap university agriculture technology mpuat', 'University', 'Udaipur'),
    ('Swami Keshwanand Rajasthan Agricultural University', 'swami keshwanand rajasthan agricultural university', 'swami keshwanand rajasthan agricultural university skrau', 'University', 'Bikaner'),
    ('Government Engineering College Ajmer', 'government engineering college ajmer', 'government engineering college ajmer geca', 'College', 'Ajmer')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Rajasthan'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Sikkim University', 'sikkim university', 'sikkim university su', 'University', 'Gangtok'),
    ('National Institute of Technology Sikkim', 'national institute technology sikkim', 'national institute technology sikkim nits', 'Institute', 'Ravangla'),
    ('Sikkim Manipal University', 'sikkim manipal university', 'sikkim manipal university smu', 'University', 'Gangtok'),
    ('Sikkim Manipal Institute of Medical Sciences', 'sikkim manipal institute medical sciences', 'sikkim manipal institute medical sciences smims', 'Institute', 'Gangtok'),
    ('ICFAI University Sikkim', 'icfai university sikkim', 'icfai university sikkim ius', 'University', 'Gangtok'),
    ('Sikkim Government College', 'sikkim government college', 'sikkim government college sgc', 'College', 'Gangtok')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Sikkim'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('University of Madras', 'university madras', 'university madras um', 'University', 'Chennai'),
    ('Anna University', 'anna university', 'anna university au', 'University', 'Chennai'),
    ('Bharathiar University', 'bharathiar university', 'bharathiar university bu', 'University', 'Coimbatore'),
    ('Bharathidasan University', 'bharathidasan university', 'bharathidasan university bu', 'University', 'Tiruchirappalli'),
    ('Madurai Kamaraj University', 'madurai kamaraj university', 'madurai kamaraj university mku', 'University', 'Madurai'),
    ('Annamalai University', 'annamalai university', 'annamalai university au', 'University', 'Chidambaram'),
    ('Alagappa University', 'alagappa university', 'alagappa university au', 'University', 'Karaikudi'),
    ('Periyar University', 'periyar university', 'periyar university pu', 'University', 'Salem'),
    ('Manonmaniam Sundaranar University', 'manonmaniam sundaranar university', 'manonmaniam sundaranar university msu', 'University', 'Tirunelveli'),
    ('Indian Institute of Technology Madras', 'indian institute technology madras', 'indian institute technology madras iitm', 'Institute', 'Chennai'),
    ('National Institute of Technology Tiruchirappalli', 'national institute technology tiruchirappalli', 'national institute technology tiruchirappalli nitt', 'Institute', 'Tiruchirappalli'),
    ('Indian Institute of Management Tiruchirappalli', 'indian institute management tiruchirappalli', 'indian institute management tiruchirappalli iimt', 'Institute', 'Tiruchirappalli'),
    ('Indian Institute of Information Technology Design and Manufacturing Kancheepuram', 'indian institute information technology design manufacturing kancheepuram', 'indian institute information technology design manufacturing kancheepuram iiitdmk', 'Institute', 'Chennai'),
    ('Vellore Institute of Technology', 'vellore institute technology', 'vellore institute technology vit', 'University', 'Vellore'),
    ('SRM Institute of Science and Technology', 'srm institute science technology', 'srm institute science technology sist', 'University', 'Kattankulathur'),
    ('Amrita Vishwa Vidyapeetham Coimbatore', 'amrita vishwa vidyapeetham coimbatore', 'amrita vishwa vidyapeetham coimbatore avvc', 'University', 'Coimbatore'),
    ('PSG College of Technology', 'psg college technology', 'psg college technology pct', 'College', 'Coimbatore'),
    ('Thiagarajar College of Engineering', 'thiagarajar college engineering', 'thiagarajar college engineering tce', 'College', 'Madurai'),
    ('College of Engineering Guindy', 'college engineering guindy', 'college engineering guindy ceg', 'College', 'Chennai'),
    ('Coimbatore Institute of Technology', 'coimbatore institute technology', 'coimbatore institute technology cit', 'Institute', 'Coimbatore'),
    ('Kongu Engineering College', 'kongu engineering college', 'kongu engineering college kec', 'College', 'Erode'),
    ('Sathyabama Institute of Science and Technology', 'sathyabama institute science technology', 'sathyabama institute science technology sist', 'University', 'Chennai'),
    ('Bharath Institute of Higher Education and Research', 'bharath institute higher education research', 'bharath institute higher education research biher', 'University', 'Chennai'),
    ('Sri Ramachandra Institute of Higher Education and Research', 'sri ramachandra institute higher education research', 'sri ramachandra institute higher education research sriher', 'University', 'Chennai'),
    ('Christian Medical College Vellore', 'christian medical college vellore', 'christian medical college vellore cmcv', 'College', 'Vellore'),
    ('Madras Medical College', 'madras medical college', 'madras medical college mmc', 'College', 'Chennai'),
    ('Tamil Nadu Dr. M.G.R. Medical University', 'tamil nadu dr m g r medical university', 'tamil nadu dr m g r medical university tndmgrmu', 'University', 'Chennai'),
    ('Tamil Nadu Agricultural University', 'tamil nadu agricultural university', 'tamil nadu agricultural university tnau', 'University', 'Coimbatore'),
    ('Loyola College', 'loyola college', 'loyola college lc', 'College', 'Chennai'),
    ('Presidency College Chennai', 'presidency college chennai', 'presidency college chennai pcc', 'College', 'Chennai'),
    ('PSGR Krishnammal College for Women', 'psgr krishnammal college women', 'psgr krishnammal college women pkcw', 'College', 'Coimbatore')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Tamil Nadu'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Osmania University', 'osmania university', 'osmania university ou', 'University', 'Hyderabad'),
    ('University of Hyderabad', 'university hyderabad', 'university hyderabad uh', 'University', 'Hyderabad'),
    ('Jawaharlal Nehru Technological University Hyderabad', 'jawaharlal nehru technological university hyderabad', 'jawaharlal nehru technological university hyderabad jntuh', 'University', 'Hyderabad'),
    ('Kakatiya University', 'kakatiya university', 'kakatiya university ku', 'University', 'Warangal'),
    ('Telangana University', 'telangana university', 'telangana university tu', 'University', 'Nizamabad'),
    ('Satavahana University', 'satavahana university', 'satavahana university su', 'University', 'Karimnagar'),
    ('Mahatma Gandhi University Nalgonda', 'mahatma gandhi university nalgonda', 'mahatma gandhi university nalgonda mgun', 'University', 'Nalgonda'),
    ('Indian Institute of Technology Hyderabad', 'indian institute technology hyderabad', 'indian institute technology hyderabad iith', 'Institute', 'Kandi'),
    ('National Institute of Technology Warangal', 'national institute technology warangal', 'national institute technology warangal nitw', 'Institute', 'Warangal'),
    ('International Institute of Information Technology Hyderabad', 'international institute information technology hyderabad', 'international institute information technology hyderabad iiith', 'Institute', 'Hyderabad'),
    ('Indian School of Business', 'indian school business', 'indian school business isb', 'Institute', 'Hyderabad'),
    ('Birla Institute of Technology and Science Pilani, Hyderabad Campus', 'birla institute technology science pilani hyderabad campus', 'birla institute technology science pilani hyderabad campus bitsphc', 'Institute', 'Hyderabad'),
    ('NALSAR University of Law', 'nalsar university law', 'nalsar university law nul', 'University', 'Hyderabad'),
    ('English and Foreign Languages University', 'english foreign languages university', 'english foreign languages university eflu', 'University', 'Hyderabad'),
    ('Maulana Azad National Urdu University', 'maulana azad national urdu university', 'maulana azad national urdu university manuu', 'University', 'Hyderabad'),
    ('Chaitanya Bharathi Institute of Technology', 'chaitanya bharathi institute technology', 'chaitanya bharathi institute technology cbit', 'Institute', 'Hyderabad'),
    ('Vasavi College of Engineering', 'vasavi college engineering', 'vasavi college engineering vce', 'College', 'Hyderabad'),
    ('CVR College of Engineering', 'cvr college engineering', 'cvr college engineering cce', 'College', 'Hyderabad'),
    ('Osmania Medical College', 'osmania medical college', 'osmania medical college omc', 'College', 'Hyderabad'),
    ('Gandhi Medical College Hyderabad', 'gandhi medical college hyderabad', 'gandhi medical college hyderabad gmch', 'College', 'Hyderabad'),
    ('Nizam''s Institute of Medical Sciences', 'nizams institute medical sciences', 'nizams institute medical sciences nims', 'Institute', 'Hyderabad'),
    ('Professor Jayashankar Telangana State Agricultural University', 'professor jayashankar telangana state agricultural university', 'professor jayashankar telangana state agricultural university pjtsau', 'University', 'Hyderabad'),
    ('National Institute of Rural Development and Panchayati Raj', 'national institute rural development panchayati raj', 'national institute rural development panchayati raj nirdpr', 'Institute', 'Hyderabad')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Telangana'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Tripura University', 'tripura university', 'tripura university tu', 'University', 'Agartala'),
    ('National Institute of Technology Agartala', 'national institute technology agartala', 'national institute technology agartala nita', 'Institute', 'Agartala'),
    ('Maharaja Bir Bikram University', 'maharaja bir bikram university', 'maharaja bir bikram university mbbu', 'University', 'Agartala'),
    ('Agartala Government Medical College', 'agartala government medical college', 'agartala government medical college agmc', 'College', 'Agartala'),
    ('ICFAI University Tripura', 'icfai university tripura', 'icfai university tripura iut', 'University', 'Agartala'),
    ('Tripura Institute of Technology', 'tripura institute technology', 'tripura institute technology tit', 'Institute', 'Agartala')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Tripura'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('University of Lucknow', 'university lucknow', 'university lucknow ul', 'University', 'Lucknow'),
    ('Banaras Hindu University', 'banaras hindu university', 'banaras hindu university bhu', 'University', 'Varanasi'),
    ('Aligarh Muslim University', 'aligarh muslim university', 'aligarh muslim university amu', 'University', 'Aligarh'),
    ('University of Allahabad', 'university allahabad', 'university allahabad ua', 'University', 'Prayagraj'),
    ('Chhatrapati Shahu Ji Maharaj University', 'chhatrapati shahu ji maharaj university', 'chhatrapati shahu ji maharaj university csjmu', 'University', 'Kanpur'),
    ('Dr. Bhimrao Ambedkar University', 'dr bhimrao ambedkar university', 'dr bhimrao ambedkar university dbau', 'University', 'Agra'),
    ('Chaudhary Charan Singh University', 'chaudhary charan singh university', 'chaudhary charan singh university ccsu', 'University', 'Meerut'),
    ('Deen Dayal Upadhyaya Gorakhpur University', 'deen dayal upadhyaya gorakhpur university', 'deen dayal upadhyaya gorakhpur university ddugu', 'University', 'Gorakhpur'),
    ('Bundelkhand University', 'bundelkhand university', 'bundelkhand university bu', 'University', 'Jhansi'),
    ('Veer Bahadur Singh Purvanchal University', 'veer bahadur singh purvanchal university', 'veer bahadur singh purvanchal university vbspu', 'University', 'Jaunpur'),
    ('Mahatma Jyotiba Phule Rohilkhand University', 'mahatma jyotiba phule rohilkhand university', 'mahatma jyotiba phule rohilkhand university mjpru', 'University', 'Bareilly'),
    ('Dr. Ram Manohar Lohia Avadh University', 'dr ram manohar lohia avadh university', 'dr ram manohar lohia avadh university drmlau', 'University', 'Ayodhya'),
    ('Siddharth University', 'siddharth university', 'siddharth university su', 'University', 'Siddharthnagar'),
    ('Dr. A.P.J. Abdul Kalam Technical University', 'dr a p j abdul kalam technical university', 'dr a p j abdul kalam technical university dapjaktu', 'University', 'Lucknow'),
    ('Indian Institute of Technology Kanpur', 'indian institute technology kanpur', 'indian institute technology kanpur iitk', 'Institute', 'Kanpur'),
    ('Indian Institute of Technology (BHU) Varanasi', 'indian institute technology bhu varanasi', 'indian institute technology bhu varanasi iitbv', 'Institute', 'Varanasi'),
    ('Indian Institute of Management Lucknow', 'indian institute management lucknow', 'indian institute management lucknow iiml', 'Institute', 'Lucknow'),
    ('Motilal Nehru National Institute of Technology', 'motilal nehru national institute technology', 'motilal nehru national institute technology mnnit', 'Institute', 'Prayagraj'),
    ('Indian Institute of Information Technology Allahabad', 'indian institute information technology allahabad', 'indian institute information technology allahabad iiita', 'Institute', 'Prayagraj'),
    ('Indian Institute of Information Technology Lucknow', 'indian institute information technology lucknow', 'indian institute information technology lucknow iiitl', 'Institute', 'Lucknow'),
    ('Harcourt Butler Technical University', 'harcourt butler technical university', 'harcourt butler technical university hbtu', 'University', 'Kanpur'),
    ('Madan Mohan Malaviya University of Technology', 'madan mohan malaviya university technology', 'madan mohan malaviya university technology mmmut', 'University', 'Gorakhpur'),
    ('Institute of Engineering and Technology Lucknow', 'institute engineering technology lucknow', 'institute engineering technology lucknow ietl', 'Institute', 'Lucknow'),
    ('Rajiv Gandhi Institute of Petroleum Technology', 'rajiv gandhi institute petroleum technology', 'rajiv gandhi institute petroleum technology rgipt', 'Institute', 'Jais'),
    ('Amity University Uttar Pradesh', 'amity university uttar pradesh', 'amity university uttar pradesh auup', 'University', 'Noida'),
    ('Sharda University', 'sharda university', 'sharda university su', 'University', 'Greater Noida'),
    ('Galgotias University', 'galgotias university', 'galgotias university gu', 'University', 'Greater Noida'),
    ('Bennett University', 'bennett university', 'bennett university bu', 'University', 'Greater Noida'),
    ('Jaypee Institute of Information Technology', 'jaypee institute information technology', 'jaypee institute information technology jiit', 'Institute', 'Noida'),
    ('Integral University', 'integral university', 'integral university iu', 'University', 'Lucknow'),
    ('Babu Banarasi Das University', 'babu banarasi das university', 'babu banarasi das university bbdu', 'University', 'Lucknow'),
    ('King George''s Medical University', 'king georges medical university', 'king georges medical university kgmu', 'University', 'Lucknow'),
    ('Sanjay Gandhi Postgraduate Institute of Medical Sciences', 'sanjay gandhi postgraduate institute medical sciences', 'sanjay gandhi postgraduate institute medical sciences sgpims', 'Institute', 'Lucknow'),
    ('Institute of Medical Sciences, BHU', 'institute medical sciences bhu', 'institute medical sciences bhu imsb', 'Institute', 'Varanasi'),
    ('Dr. Ram Manohar Lohia National Law University', 'dr ram manohar lohia national law university', 'dr ram manohar lohia national law university drmlnlu', 'University', 'Lucknow'),
    ('Sardar Vallabhbhai Patel University of Agriculture and Technology', 'sardar vallabhbhai patel university agriculture technology', 'sardar vallabhbhai patel university agriculture technology svpuat', 'University', 'Meerut'),
    ('Chandra Shekhar Azad University of Agriculture and Technology', 'chandra shekhar azad university agriculture technology', 'chandra shekhar azad university agriculture technology csauat', 'University', 'Kanpur'),
    ('Narendra Deva University of Agriculture and Technology', 'narendra deva university agriculture technology', 'narendra deva university agriculture technology nduat', 'University', 'Ayodhya'),
    ('Indian Veterinary Research Institute', 'indian veterinary research institute', 'indian veterinary research institute ivri', 'Institute', 'Bareilly'),
    ('National Institute of Fashion Technology Raebareli', 'national institute fashion technology raebareli', 'national institute fashion technology raebareli niftr', 'Institute', 'Raebareli')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Uttar Pradesh'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('Indian Institute of Technology Roorkee', 'indian institute technology roorkee', 'indian institute technology roorkee iitr', 'Institute', 'Roorkee'),
    ('Hemvati Nandan Bahuguna Garhwal University', 'hemvati nandan bahuguna garhwal university', 'hemvati nandan bahuguna garhwal university hnbgu', 'University', 'Srinagar'),
    ('Kumaun University', 'kumaun university', 'kumaun university ku', 'University', 'Nainital'),
    ('Doon University', 'doon university', 'doon university du', 'University', 'Dehradun'),
    ('Uttarakhand Technical University', 'uttarakhand technical university', 'uttarakhand technical university utu', 'University', 'Dehradun'),
    ('Sri Dev Suman Uttarakhand University', 'sri dev suman uttarakhand university', 'sri dev suman uttarakhand university sdsuu', 'University', 'Tehri Garhwal'),
    ('Graphic Era University', 'graphic era university', 'graphic era university geu', 'University', 'Dehradun'),
    ('University of Petroleum and Energy Studies', 'university petroleum energy studies', 'university petroleum energy studies upes', 'University', 'Dehradun'),
    ('Swami Rama Himalayan University', 'swami rama himalayan university', 'swami rama himalayan university srhu', 'University', 'Dehradun'),
    ('G. B. Pant University of Agriculture and Technology', 'g b pant university agriculture technology', 'g b pant university agriculture technology gbpuat', 'University', 'Pantnagar'),
    ('Indian Institute of Management Kashipur', 'indian institute management kashipur', 'indian institute management kashipur iimk', 'Institute', 'Kashipur'),
    ('All India Institute of Medical Sciences Rishikesh', 'all india institute medical sciences rishikesh', 'all india institute medical sciences rishikesh aiimsr', 'Institute', 'Rishikesh'),
    ('Forest Research Institute', 'forest research institute', 'forest research institute fri', 'Institute', 'Dehradun'),
    ('Wildlife Institute of India', 'wildlife institute india', 'wildlife institute india wii', 'Institute', 'Dehradun'),
    ('Govind Ballabh Pant Institute of Engineering and Technology', 'govind ballabh pant institute engineering technology', 'govind ballabh pant institute engineering technology gbpiet', 'Institute', 'Pauri Garhwal')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'Uttarakhand'
ON CONFLICT ("SearchKey") DO NOTHING;

INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")
SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,
  (SELECT c."CityID" FROM "tblMstrCily" c
    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)
FROM (VALUES
    ('University of Calcutta', 'university calcutta', 'university calcutta uc', 'University', 'Kolkata'),
    ('Jadavpur University', 'jadavpur university', 'jadavpur university ju', 'University', 'Kolkata'),
    ('Presidency University', 'presidency university', 'presidency university pu', 'University', 'Kolkata'),
    ('Rabindra Bharati University', 'rabindra bharati university', 'rabindra bharati university rbu', 'University', 'Kolkata'),
    ('Aliah University', 'aliah university', 'aliah university au', 'University', 'Kolkata'),
    ('Visva-Bharati University', 'visva bharati university', 'visva bharati university vbu', 'University', 'Santiniketan'),
    ('University of Burdwan', 'university burdwan', 'university burdwan ub', 'University', 'Bardhaman'),
    ('University of Kalyani', 'university kalyani', 'university kalyani uk', 'University', 'Kalyani'),
    ('University of North Bengal', 'university north bengal', 'university north bengal unb', 'University', 'Siliguri'),
    ('Vidyasagar University', 'vidyasagar university', 'vidyasagar university vu', 'University', 'Midnapore'),
    ('Kazi Nazrul University', 'kazi nazrul university', 'kazi nazrul university knu', 'University', 'Asansol'),
    ('Cooch Behar Panchanan Barma University', 'cooch behar panchanan barma university', 'cooch behar panchanan barma university cbpbu', 'University', 'Cooch Behar'),
    ('Maulana Abul Kalam Azad University of Technology', 'maulana abul kalam azad university technology', 'maulana abul kalam azad university technology makaut', 'University', 'Kolkata'),
    ('Indian Institute of Technology Kharagpur', 'indian institute technology kharagpur', 'indian institute technology kharagpur iitk', 'Institute', 'Kharagpur'),
    ('Indian Institute of Management Calcutta', 'indian institute management calcutta', 'indian institute management calcutta iimc', 'Institute', 'Kolkata'),
    ('Indian Statistical Institute', 'indian statistical institute', 'indian statistical institute isi', 'Institute', 'Kolkata'),
    ('Indian Institute of Science Education and Research Kolkata', 'indian institute science education research kolkata', 'indian institute science education research kolkata iiserk', 'Institute', 'Mohanpur'),
    ('National Institute of Technology Durgapur', 'national institute technology durgapur', 'national institute technology durgapur nitd', 'Institute', 'Durgapur'),
    ('Indian Institute of Engineering Science and Technology, Shibpur', 'indian institute engineering science technology shibpur', 'indian institute engineering science technology shibpur iiests', 'Institute', 'Howrah'),
    ('Institute of Engineering and Management', 'institute engineering management', 'institute engineering management iem', 'Institute', 'Kolkata'),
    ('Heritage Institute of Technology', 'heritage institute technology', 'heritage institute technology hit', 'Institute', 'Kolkata'),
    ('Jalpaiguri Government Engineering College', 'jalpaiguri government engineering college', 'jalpaiguri government engineering college jgec', 'College', 'Jalpaiguri'),
    ('Medical College Kolkata', 'medical college kolkata', 'medical college kolkata mck', 'College', 'Kolkata'),
    ('Institute of Post Graduate Medical Education and Research', 'institute post graduate medical education research', 'institute post graduate medical education research ipgmer', 'Institute', 'Kolkata'),
    ('West Bengal National University of Juridical Sciences', 'west bengal national university juridical sciences', 'west bengal national university juridical sciences wbnujs', 'University', 'Kolkata'),
    ('Bidhan Chandra Krishi Viswavidyalaya', 'bidhan chandra krishi viswavidyalaya', 'bidhan chandra krishi viswavidyalaya bckv', 'University', 'Mohanpur'),
    ('St. Xavier''s College Kolkata', 'st xaviers college kolkata', 'st xaviers college kolkata sxck', 'College', 'Kolkata')
  ) AS v(name, search_key, search_text, kind, city)
CROSS JOIN "tblMstrState" s
WHERE s."Descr" = 'West Bengal'
ON CONFLICT ("SearchKey") DO NOTHING;


-- Backfill SearchText for any row the INSERTs above skipped.
--
-- On a database that already had tblMstrInstitute the INSERTs all hit ON CONFLICT DO NOTHING,
-- so the column added by the ALTER would stay NULL for every existing row — and a NULL makes
-- `"SearchText" NOT LIKE …` evaluate to NULL rather than true, which silently turns the search
-- endpoint's filter into a no-op that returns the whole table for any query. Derived from
-- SearchKey with the same rule as instituteSearchText(): the key, then its initialism.
UPDATE "tblMstrInstitute"
   SET "SearchText" = "SearchKey" || ' ' || (
         SELECT string_agg(left(w, 1), '' ORDER BY ord)
           FROM regexp_split_to_table("SearchKey", ' ') WITH ORDINALITY AS s(w, ord)
       )
 WHERE "SearchText" IS NULL;
