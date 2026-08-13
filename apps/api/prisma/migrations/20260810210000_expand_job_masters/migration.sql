-- Expand employer masters so CSV bulk import can resolve Naukri-style Position / Skills / Cities.
-- Idempotent: only inserts labels that do not already exist (case-insensitive).

-- Positions from job-import-template-30-dummy.csv + common IT roles
INSERT INTO "tblMstrDesignation" ("Descr")
SELECT v.d
FROM (VALUES
  ('Frontend Developer'),
  ('Backend Developer'),
  ('Full Stack Developer'),
  ('QA Engineer'),
  ('DevOps Engineer'),
  ('UI/UX Designer'),
  ('Product Manager'),
  ('Data Analyst'),
  ('Business Analyst'),
  ('HR Executive'),
  ('Recruiter'),
  ('Marketing Executive'),
  ('Sales Executive'),
  ('Customer Support'),
  ('Python Developer'),
  ('React Developer'),
  ('Node.js Developer'),
  ('Android Developer'),
  ('iOS Developer'),
  ('AI Engineer'),
  ('ML Engineer'),
  ('Cloud Engineer'),
  ('Database Admin'),
  ('Graphic Designer'),
  ('Content Writer'),
  ('SEO Specialist'),
  ('Finance Executive'),
  ('Operations Executive'),
  ('Project Coordinator'),
  ('Technical Lead'),
  ('Software Engineer'),
  ('Java Developer'),
  ('Dot Net Developer'),
  ('PHP Developer'),
  ('Angular Developer'),
  ('Flutter Developer'),
  ('Manual Tester'),
  ('Automation Tester'),
  ('SDET'),
  ('Scrum Master'),
  ('Engineering Manager'),
  ('CTO'),
  ('HR Manager'),
  ('Talent Acquisition Specialist'),
  ('Digital Marketing Executive'),
  ('Account Manager'),
  ('Business Development Executive'),
  ('System Administrator'),
  ('Network Engineer'),
  ('Security Engineer'),
  ('Data Scientist'),
  ('Data Engineer'),
  ('Power BI Developer'),
  ('Salesforce Developer'),
  ('SAP Consultant'),
  ('Support Engineer'),
  ('Technical Writer'),
  ('UX Researcher')
) AS v(d)
WHERE NOT EXISTS (
  SELECT 1 FROM "tblMstrDesignation" x WHERE lower(trim(x."Descr")) = lower(trim(v.d))
);

-- Common tech / soft skills (CSV demo uses Skilled; these allow real skill tags)
INSERT INTO "tblMstrSkills" ("Descr")
SELECT v.d
FROM (VALUES
  ('JavaScript'),
  ('TypeScript'),
  ('React'),
  ('Angular'),
  ('Vue.js'),
  ('Node.js'),
  ('Express'),
  ('Java'),
  ('Spring Boot'),
  ('Python'),
  ('Django'),
  ('Flask'),
  ('FastAPI'),
  ('C#'),
  ('.NET'),
  ('PHP'),
  ('Laravel'),
  ('Go'),
  ('Ruby'),
  ('Ruby on Rails'),
  ('Kotlin'),
  ('Swift'),
  ('Flutter'),
  ('React Native'),
  ('Android'),
  ('iOS'),
  ('SQL'),
  ('MySQL'),
  ('PostgreSQL'),
  ('MongoDB'),
  ('Redis'),
  ('Oracle'),
  ('AWS'),
  ('Azure'),
  ('GCP'),
  ('Docker'),
  ('Kubernetes'),
  ('Jenkins'),
  ('CI/CD'),
  ('Git'),
  ('Linux'),
  ('HTML'),
  ('CSS'),
  ('Tailwind CSS'),
  ('GraphQL'),
  ('REST API'),
  ('Microservices'),
  ('System Design'),
  ('Data Structures'),
  ('Algorithms'),
  ('Selenium'),
  ('Cypress'),
  ('Playwright'),
  ('JMeter'),
  ('Manual Testing'),
  ('Automation Testing'),
  ('Machine Learning'),
  ('Deep Learning'),
  ('NLP'),
  ('TensorFlow'),
  ('PyTorch'),
  ('Pandas'),
  ('NumPy'),
  ('Power BI'),
  ('Tableau'),
  ('Excel'),
  ('Salesforce'),
  ('SAP'),
  ('Figma'),
  ('Adobe XD'),
  ('Photoshop'),
  ('Illustrator'),
  ('SEO'),
  ('Content Writing'),
  ('Digital Marketing'),
  ('Communication'),
  ('Leadership'),
  ('Agile'),
  ('Scrum'),
  ('JIRA'),
  ('Problem Solving')
) AS v(d)
WHERE NOT EXISTS (
  SELECT 1 FROM "tblMstrSkills" x WHERE lower(trim(x."Descr")) = lower(trim(v.d))
);

-- Cities used in the dummy Excel (existing: Pune, Gurugram, Hyderabad)
INSERT INTO "tblMstrCily" ("Descr", "StateID")
SELECT v.d, v.s
FROM (VALUES
  ('Bengaluru', 16),  -- Karnataka
  ('Bangalore', 16),  -- alias often used in CSVs
  ('Noida', 34),      -- Uttar Pradesh
  ('Mumbai', 21),     -- Maharashtra
  ('Delhi', 9),
  ('New Delhi', 9),
  ('Ahmedabad', 11),  -- Gujarat
  ('Kolkata', 36),    -- West Bengal
  ('Chandigarh', 6),
  ('Jaipur', 29)      -- Rajasthan
) AS v(d, s)
WHERE EXISTS (SELECT 1 FROM "tblMstrState" st WHERE st."StateID" = v.s)
  AND NOT EXISTS (
    SELECT 1 FROM "tblMstrCily" c WHERE lower(trim(c."Descr")) = lower(trim(v.d))
  );

SELECT setval(pg_get_serial_sequence('"tblMstrDesignation"', 'DesignationID'), COALESCE((SELECT MAX("DesignationID") FROM "tblMstrDesignation"), 1), true);
SELECT setval(pg_get_serial_sequence('"tblMstrSkills"', 'SkillID'), COALESCE((SELECT MAX("SkillID") FROM "tblMstrSkills"), 1), true);
SELECT setval(pg_get_serial_sequence('"tblMstrCily"', 'CityID'), COALESCE((SELECT MAX("CityID") FROM "tblMstrCily"), 1), true);
