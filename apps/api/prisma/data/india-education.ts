/**
 * India-wide education reference data.
 *
 * This module is the single source of truth for the three education masters:
 *
 *   tblMstrEducationType  — the "Education" dropdown: the qualification (10th, ITI, B.Tech, MBA, Ph.D.)
 *   tblMstrCourse         — the "Course" dropdown: the branch/stream INSIDE a qualification,
 *                           carrying the qualification's id so the UI cascades
 *   tblMstrInstitute      — the "Institution / University name" suggestions, keyed to a state
 *
 * The legacy backup only ever held four education types (10th, 12th, "Gradution",
 * Post Graduation) and eight courses, so the Education dropdown offered four options to a
 * country whose candidates hold several hundred distinct qualifications.
 *
 * Two consumers read this file:
 *   - `prisma/seed.ts`, for a fresh dev/CI database
 *   - `prisma/tools/build-education-sql.ts`, which renders it into the migration that ships
 *     the rows to production (docker-entrypoint.sh runs `migrate deploy`, never the seed)
 *
 * Both write with ON CONFLICT DO NOTHING against a natural key — the qualification's name, and
 * (qualification, course) for a course — never against the numeric id. Ids are therefore free to
 * differ between environments, and inserting a row into the middle of a list below can never
 * silently repoint an existing tblSubscriberEducation row at a different course.
 *
 * The four legacy education types keep ids 1-4 because live rows reference them; everything
 * added here is numbered from 100 up.
 */

export type QualificationCategory =
  | 'School'
  | 'Diploma'
  | 'Undergraduate'
  | 'Postgraduate'
  | 'Doctorate'
  | 'Other';

/** Category display order — the wizard renders one <optgroup> per category in this order. */
export const CATEGORY_ORDER: readonly QualificationCategory[] = [
  'School',
  'Diploma',
  'Undergraduate',
  'Postgraduate',
  'Doctorate',
  'Other',
];

export interface Qualification {
  /** Fixed for the four legacy rows, allocated from 100 up for everything added here. */
  id: number;
  /** Exactly what the Education dropdown shows, and the natural key rows are matched on. */
  label: string;
  category: QualificationCategory;
  /** tblMstrEducationType.HighestSeq — seniority, which is also the in-category sort order. */
  seq: number;
  /** The Course dropdown for this qualification. Never empty: Course is a required field. */
  courses: readonly string[];
}

/* ------------------------------------------------------------------ */
/* Shared course lists                                                 */
/* ------------------------------------------------------------------ */

/**
 * Engineering branches offered across Indian universities, shared by B.Tech / B.E. / M.Tech /
 * M.E. — a branch is a property of the discipline, not of the degree's level, and AICTE
 * approves the same branch names at both.
 */
const ENGINEERING = [
  'Computer Science and Engineering',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Electrical Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Aerospace Engineering',
  'Aeronautical Engineering',
  'Automobile Engineering',
  'Biotechnology',
  'Biomedical Engineering',
  'Industrial Engineering',
  'Production Engineering',
  'Instrumentation Engineering',
  'Electronics and Instrumentation Engineering',
  'Electronics Engineering',
  'Artificial Intelligence',
  'Artificial Intelligence and Machine Learning',
  'Data Science',
  'Cyber Security',
  'Software Engineering',
  'Internet of Things',
  'Robotics and Automation',
  'Mechatronics',
  'Environmental Engineering',
  'Mining Engineering',
  'Petroleum Engineering',
  'Agricultural Engineering',
  'Food Technology',
  'Textile Engineering',
  'Metallurgical Engineering',
  'Materials Science and Engineering',
  'Computer Engineering',
  'Computer Science and Business Systems',
  'Marine Engineering',
  'Ceramic Engineering',
  'Polymer and Plastics Engineering',
  'Structural Engineering',
  'Power Engineering',
  'Printing Technology',
  'Dairy Technology',
  'Leather Technology',
  'Nanotechnology',
  'Other',
] as const;

const BSC_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'Botany',
  'Zoology',
  'Computer Science',
  'Information Technology',
  'Biotechnology',
  'Microbiology',
  'Biochemistry',
  'Statistics',
  'Electronics',
  'Geology',
  'Environmental Science',
  'Agriculture',
  'Home Science',
  'Psychology',
  'Nutrition and Dietetics',
  'Forensic Science',
  'Data Science',
  'Life Sciences',
  'Medical Laboratory Technology',
  'Radiology and Imaging Technology',
  'Fashion Design',
  'Hotel Management',
  'Animation and Multimedia',
  'Aviation',
  'Geography',
  'Physical Science',
  'Other',
] as const;

const BA_SUBJECTS = [
  'English',
  'Hindi',
  'History',
  'Political Science',
  'Economics',
  'Sociology',
  'Psychology',
  'Philosophy',
  'Geography',
  'Public Administration',
  'Sanskrit',
  'Urdu',
  'Education',
  'Fine Arts',
  'Journalism and Mass Communication',
  'Social Work',
  'Home Science',
  'Anthropology',
  'Archaeology',
  'Music',
  'Rural Development',
  'Statistics',
  'Mathematics',
  'Physical Education',
  'Tourism',
  'Linguistics',
  'Library and Information Science',
  'Regional Language',
  'Other',
] as const;

const COMMERCE = [
  'General',
  'Accounting and Finance',
  'Banking and Insurance',
  'Taxation',
  'Computer Applications',
  'Financial Markets',
  'Business Administration',
  'Economics',
  'Corporate Secretaryship',
  'Cost and Management Accounting',
  'E-Commerce',
  'Marketing',
  'Statistics',
  'Honours',
  'Other',
] as const;

const MANAGEMENT = [
  'Finance',
  'Marketing',
  'Human Resource Management',
  'Operations Management',
  'Information Technology',
  'Business Analytics',
  'International Business',
  'Supply Chain Management',
  'Entrepreneurship',
  'Healthcare Management',
  'Rural Management',
  'Retail Management',
  'Banking and Insurance',
  'Hospitality Management',
  'Agri-Business Management',
  'Digital Marketing',
  'Project Management',
  'Data Science',
  'General Management',
  'Public Policy',
  'Media and Communication',
  'Sports Management',
  'Real Estate Management',
  'Aviation Management',
  'Logistics Management',
  'Other',
] as const;

const COMPUTER_APPLICATIONS = [
  'General',
  'Software Engineering',
  'Data Science',
  'Cyber Security',
  'Artificial Intelligence',
  'Cloud Computing',
  'Web Technologies',
  'Computer Networking',
  'Mobile Application Development',
  'Other',
] as const;

const LAW = [
  'General',
  'Constitutional Law',
  'Corporate Law',
  'Criminal Law',
  'Civil Law',
  'International Law',
  'Labour Law',
  'Intellectual Property Law',
  'Taxation Law',
  'Human Rights Law',
  'Environmental Law',
  'Family Law',
  'Cyber Law',
  'Business Law',
  'Other',
] as const;

/** MD / MS / DM / M.Ch specialities, as the NMC lists them. */
const MEDICAL_SPECIALITIES = [
  'General Medicine',
  'General Surgery',
  'Paediatrics',
  'Obstetrics and Gynaecology',
  'Orthopaedics',
  'Dermatology',
  'Psychiatry',
  'Radiodiagnosis',
  'Anaesthesiology',
  'Pathology',
  'Ophthalmology',
  'ENT (Otorhinolaryngology)',
  'Community Medicine',
  'Microbiology',
  'Pharmacology',
  'Physiology',
  'Biochemistry',
  'Anatomy',
  'Cardiology',
  'Neurology',
  'Nephrology',
  'Gastroenterology',
  'Endocrinology',
  'Medical Oncology',
  'Urology',
  'Plastic Surgery',
  'Neurosurgery',
  'Cardiothoracic Surgery',
  'Emergency Medicine',
  'Respiratory Medicine',
  'Forensic Medicine',
  'Other',
] as const;

const DENTAL = [
  'General',
  'Oral and Maxillofacial Surgery',
  'Orthodontics and Dentofacial Orthopaedics',
  'Periodontology',
  'Prosthodontics and Crown & Bridge',
  'Conservative Dentistry and Endodontics',
  'Oral Pathology and Microbiology',
  'Paediatric and Preventive Dentistry',
  'Public Health Dentistry',
  'Oral Medicine and Radiology',
  'Other',
] as const;

const PHARMACY = [
  'General',
  'Pharmaceutics',
  'Pharmacology',
  'Pharmaceutical Chemistry',
  'Pharmacognosy',
  'Pharmacy Practice',
  'Quality Assurance',
  'Industrial Pharmacy',
  'Clinical Pharmacy',
  'Drug Regulatory Affairs',
  'Other',
] as const;

const ARCHITECTURE = [
  'Architecture',
  'Urban Design',
  'Landscape Architecture',
  'Building Engineering and Management',
  'Architectural Conservation',
  'Sustainable Architecture',
  'Interior Design',
  'Other',
] as const;

const DESIGN = [
  'Fashion Design',
  'Industrial Design',
  'Product Design',
  'Communication Design',
  'Interior Design',
  'Graphic Design',
  'Textile Design',
  'Animation and Film Design',
  'User Experience Design',
  'Jewellery Design',
  'Automobile Design',
  'Other',
] as const;

const EDUCATION_SPECS = [
  'General',
  'Elementary Education',
  'Special Education',
  'Educational Administration',
  'Curriculum and Pedagogy',
  'Science Education',
  'Mathematics Education',
  'Language Education',
  'Social Science Education',
  'Other',
] as const;

/** NCVT/SCVT trades, which is what an ITI certificate actually names. */
const ITI_TRADES = [
  'Electrician',
  'Fitter',
  'Welder',
  'Turner',
  'Machinist',
  'Mechanic (Motor Vehicle)',
  'Mechanic (Diesel)',
  'Draughtsman (Civil)',
  'Draughtsman (Mechanical)',
  'Computer Operator and Programming Assistant',
  'Electronics Mechanic',
  'Refrigeration and Air Conditioning Technician',
  'Plumber',
  'Carpenter',
  'Wireman',
  'Instrument Mechanic',
  'Sheet Metal Worker',
  'Surveyor',
  'Stenographer',
  'Dress Making',
  'Sewing Technology',
  'Information Technology',
  'Painter (General)',
  'Tool and Die Maker',
  'Foundryman',
  'Other',
] as const;

const NURSING = [
  'General Nursing',
  'Medical Surgical Nursing',
  'Community Health Nursing',
  'Child Health Nursing',
  'Obstetrics and Gynaecological Nursing',
  'Psychiatric Nursing',
  'Other',
] as const;

const PHYSIOTHERAPY = [
  'General',
  'Orthopaedic Physiotherapy',
  'Neurological Physiotherapy',
  'Cardiopulmonary Physiotherapy',
  'Sports Physiotherapy',
  'Paediatric Physiotherapy',
  'Community Physiotherapy',
  'Other',
] as const;

const AGRICULTURE = [
  'Agronomy',
  'Horticulture',
  'Soil Science',
  'Plant Pathology',
  'Entomology',
  'Agricultural Economics',
  'Genetics and Plant Breeding',
  'Agricultural Extension',
  'Food Science and Technology',
  'Sericulture',
  'Forestry',
  'Other',
] as const;

const JOURNALISM = [
  'Journalism',
  'Mass Communication',
  'Advertising and Public Relations',
  'Electronic Media',
  'Print Media',
  'Film and Television Production',
  'Digital Media',
  'Corporate Communication',
  'Other',
] as const;

const HOSPITALITY = [
  'Hotel Management',
  'Culinary Arts',
  'Food and Beverage Service',
  'Hospitality Administration',
  'Tourism and Travel Management',
  'Front Office Management',
  'Other',
] as const;

const SOCIAL_WORK = [
  'General',
  'Medical and Psychiatric Social Work',
  'Community Development',
  'Human Resource Management',
  'Family and Child Welfare',
  'Rural Development',
  'Criminology and Correctional Administration',
  'Other',
] as const;

const VOCATIONAL = [
  'Software Development',
  'Retail Management',
  'Healthcare',
  'Hospitality and Tourism',
  'Automobile Servicing',
  'Beauty and Wellness',
  'Banking and Financial Services',
  'Media and Entertainment',
  'Agriculture',
  'Construction',
  'Other',
] as const;

const FINE_ARTS = [
  'Painting',
  'Sculpture',
  'Applied Art',
  'Art History',
  'Photography',
  'Music',
  'Dance',
  'Theatre',
  'Other',
] as const;

const PHYSICAL_EDUCATION = [
  'Physical Education',
  'Sports Coaching',
  'Yoga',
  'Sports Management',
  'Exercise Physiology',
  'Other',
] as const;

const PLANNING = [
  'Urban Planning',
  'Regional Planning',
  'Transport Planning',
  'Environmental Planning',
  'Housing',
  'Infrastructure Planning',
  'Other',
] as const;

const VETERINARY = [
  'Veterinary Science and Animal Husbandry',
  'Veterinary Medicine',
  'Veterinary Surgery',
  'Animal Nutrition',
  'Animal Genetics and Breeding',
  'Livestock Production Management',
  'Other',
] as const;

const PUBLIC_HEALTH = [
  'Public Health',
  'Epidemiology',
  'Health Policy and Management',
  'Biostatistics',
  'Environmental Health',
  'Nutrition',
  'Other',
] as const;

/** Ph.D. / M.Phil. / D.Sc. / D.Litt. are awarded in a research field, not a taught branch. */
const RESEARCH_FIELDS = [
  'Engineering and Technology',
  'Computer Science',
  'Management',
  'Commerce',
  'Economics',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Life Sciences',
  'Biotechnology',
  'Medicine',
  'Pharmacy',
  'Law',
  'Education',
  'English',
  'Hindi',
  'History',
  'Political Science',
  'Sociology',
  'Psychology',
  'Philosophy',
  'Geography',
  'Agriculture',
  'Environmental Science',
  'Social Work',
  'Journalism and Mass Communication',
  'Other',
] as const;

const DIPLOMA_FIELDS = [
  'Engineering',
  'Computer Applications',
  'Business Management',
  'Nursing',
  'Pharmacy',
  'Elementary Education (D.El.Ed)',
  'Hotel Management',
  'Fashion Design',
  'Fine Arts',
  'Agriculture',
  'Animation and Multimedia',
  'Other',
] as const;

/* ------------------------------------------------------------------ */
/* Qualifications                                                      */
/* ------------------------------------------------------------------ */

/**
 * The Education dropdown.
 *
 * Deliberately deduplicated: "Matriculation", "Secondary School" and "10th" name one
 * credential, as do "Intermediate", "Higher Secondary" and "12th". Listing each alias as its
 * own row would let two candidates with identical schooling pick different values, which is
 * exactly what breaks employer filtering later. One row per credential, aliases dropped.
 */
export const QUALIFICATIONS: readonly Qualification[] = [
  /* --- School ---------------------------------------------------- */
  { id: 100, label: 'Below 10th', category: 'School', seq: 0, courses: ['General', 'Other'] },
  // Legacy ids 1 and 2 — live tblSubscriberEducation rows point at them.
  { id: 1, label: '10th', category: 'School', seq: 1, courses: ['General', 'Other'] },
  {
    id: 2,
    label: '12th',
    category: 'School',
    seq: 2,
    courses: [
      'Science (PCM)',
      'Science (PCB)',
      'Science (PCMB)',
      'Commerce',
      'Arts / Humanities',
      'Vocational',
      // Boards that do not stream, and the home of the legacy "12th" course row: the migration
      // renames it to this rather than leaving a course called "12th" under a qualification
      // called "12th", which is the duplicate the old two-table split produced.
      'General',
      'Other',
    ],
  },

  /* --- Diploma --------------------------------------------------- */
  { id: 110, label: 'Diploma', category: 'Diploma', seq: 10, courses: DIPLOMA_FIELDS },
  { id: 111, label: 'Polytechnic Diploma', category: 'Diploma', seq: 11, courses: ENGINEERING },
  { id: 112, label: 'ITI', category: 'Diploma', seq: 12, courses: ITI_TRADES },
  { id: 113, label: 'Advanced Diploma', category: 'Diploma', seq: 13, courses: DIPLOMA_FIELDS },
  { id: 114, label: 'PG Diploma', category: 'Diploma', seq: 55, courses: MANAGEMENT },
  { id: 115, label: 'PGDM', category: 'Diploma', seq: 56, courses: MANAGEMENT },

  /* --- Undergraduate --------------------------------------------- */
  // Legacy id 3 — the generic level, kept for rows saved before qualifications existed.
  { id: 3, label: 'Graduation', category: 'Undergraduate', seq: 20, courses: ['General', 'Other'] },
  { id: 130, label: 'B.A.', category: 'Undergraduate', seq: 21, courses: BA_SUBJECTS },
  { id: 131, label: 'B.Sc.', category: 'Undergraduate', seq: 22, courses: BSC_SUBJECTS },
  { id: 132, label: 'B.Com.', category: 'Undergraduate', seq: 23, courses: COMMERCE },
  { id: 133, label: 'BBA', category: 'Undergraduate', seq: 24, courses: MANAGEMENT },
  { id: 134, label: 'BMS', category: 'Undergraduate', seq: 25, courses: MANAGEMENT },
  { id: 135, label: 'BCA', category: 'Undergraduate', seq: 26, courses: COMPUTER_APPLICATIONS },
  { id: 136, label: 'B.Tech', category: 'Undergraduate', seq: 27, courses: ENGINEERING },
  { id: 137, label: 'B.E.', category: 'Undergraduate', seq: 28, courses: ENGINEERING },
  { id: 138, label: 'B.Arch', category: 'Undergraduate', seq: 29, courses: ARCHITECTURE },
  { id: 139, label: 'B.Plan', category: 'Undergraduate', seq: 30, courses: PLANNING },
  { id: 140, label: 'B.Des', category: 'Undergraduate', seq: 31, courses: DESIGN },
  { id: 141, label: 'B.Pharm', category: 'Undergraduate', seq: 32, courses: PHARMACY },
  { id: 142, label: 'B.Ed.', category: 'Undergraduate', seq: 33, courses: EDUCATION_SPECS },
  { id: 143, label: 'B.El.Ed.', category: 'Undergraduate', seq: 34, courses: EDUCATION_SPECS },
  { id: 144, label: 'LL.B.', category: 'Undergraduate', seq: 35, courses: LAW },
  { id: 145, label: 'MBBS', category: 'Undergraduate', seq: 36, courses: ['Medicine and Surgery', 'Other'] },
  { id: 146, label: 'BDS', category: 'Undergraduate', seq: 37, courses: DENTAL },
  {
    id: 147,
    label: 'BAMS',
    category: 'Undergraduate',
    seq: 38,
    courses: ['Ayurvedic Medicine and Surgery', 'Panchakarma', 'Dravyaguna', 'Kayachikitsa', 'Other'],
  },
  {
    id: 148,
    label: 'BHMS',
    category: 'Undergraduate',
    seq: 39,
    courses: ['Homoeopathic Medicine and Surgery', 'Materia Medica', 'Repertory', 'Other'],
  },
  {
    id: 149,
    label: 'BUMS',
    category: 'Undergraduate',
    seq: 40,
    courses: ['Unani Medicine and Surgery', 'Ilmul Advia', 'Moalajat', 'Other'],
  },
  {
    id: 150,
    label: 'BNYS',
    category: 'Undergraduate',
    seq: 41,
    courses: ['Naturopathy and Yogic Sciences', 'Yoga Therapy', 'Other'],
  },
  { id: 151, label: 'BPT', category: 'Undergraduate', seq: 42, courses: PHYSIOTHERAPY },
  {
    id: 152,
    label: 'BOT',
    category: 'Undergraduate',
    seq: 43,
    courses: ['Occupational Therapy', 'Paediatric Occupational Therapy', 'Neuro Rehabilitation', 'Other'],
  },
  {
    id: 153,
    label: 'BASLP',
    category: 'Undergraduate',
    seq: 44,
    courses: ['Audiology', 'Speech Language Pathology', 'Other'],
  },
  { id: 154, label: 'B.Optom.', category: 'Undergraduate', seq: 45, courses: ['Optometry', 'Vision Science', 'Other'] },
  { id: 155, label: 'B.Sc. Nursing', category: 'Undergraduate', seq: 46, courses: NURSING },
  { id: 156, label: 'B.V.Sc. & A.H.', category: 'Undergraduate', seq: 47, courses: VETERINARY },
  { id: 157, label: 'B.Sc. Agriculture', category: 'Undergraduate', seq: 48, courses: AGRICULTURE },
  {
    id: 158,
    label: 'B.F.Sc.',
    category: 'Undergraduate',
    seq: 49,
    courses: ['Fisheries Science', 'Aquaculture', 'Fish Processing Technology', 'Other'],
  },
  { id: 159, label: 'BSW', category: 'Undergraduate', seq: 50, courses: SOCIAL_WORK },
  { id: 160, label: 'BJMC', category: 'Undergraduate', seq: 51, courses: JOURNALISM },
  { id: 161, label: 'BMM', category: 'Undergraduate', seq: 52, courses: JOURNALISM },
  { id: 162, label: 'BHM', category: 'Undergraduate', seq: 53, courses: HOSPITALITY },
  { id: 163, label: 'BFA', category: 'Undergraduate', seq: 54, courses: FINE_ARTS },
  { id: 164, label: 'B.P.Ed.', category: 'Undergraduate', seq: 55, courses: PHYSICAL_EDUCATION },
  { id: 165, label: 'B.Voc.', category: 'Undergraduate', seq: 56, courses: VOCATIONAL },
  {
    id: 166,
    label: 'B.Lib.I.Sc.',
    category: 'Undergraduate',
    seq: 57,
    courses: ['Library and Information Science', 'Other'],
  },
  {
    id: 167,
    label: 'B.Stat.',
    category: 'Undergraduate',
    seq: 58,
    courses: ['Statistics', 'Applied Statistics', 'Data Science', 'Other'],
  },
  {
    id: 168,
    label: 'B.Text.',
    category: 'Undergraduate',
    seq: 59,
    courses: ['Textile Technology', 'Fashion Technology', 'Apparel Production', 'Other'],
  },

  /* --- Postgraduate ---------------------------------------------- */
  // Legacy id 4 — the generic level.
  { id: 4, label: 'Post Graduation', category: 'Postgraduate', seq: 60, courses: ['General', 'Other'] },
  { id: 180, label: 'M.A.', category: 'Postgraduate', seq: 61, courses: BA_SUBJECTS },
  { id: 181, label: 'M.Sc.', category: 'Postgraduate', seq: 62, courses: BSC_SUBJECTS },
  { id: 182, label: 'M.Com.', category: 'Postgraduate', seq: 63, courses: COMMERCE },
  { id: 183, label: 'MBA', category: 'Postgraduate', seq: 64, courses: MANAGEMENT },
  { id: 184, label: 'MCA', category: 'Postgraduate', seq: 65, courses: COMPUTER_APPLICATIONS },
  { id: 185, label: 'M.Tech', category: 'Postgraduate', seq: 66, courses: ENGINEERING },
  { id: 186, label: 'M.E.', category: 'Postgraduate', seq: 67, courses: ENGINEERING },
  { id: 187, label: 'MS (Engineering / Science)', category: 'Postgraduate', seq: 68, courses: ENGINEERING },
  { id: 188, label: 'M.Arch', category: 'Postgraduate', seq: 69, courses: ARCHITECTURE },
  { id: 189, label: 'M.Plan', category: 'Postgraduate', seq: 70, courses: PLANNING },
  { id: 190, label: 'M.Des', category: 'Postgraduate', seq: 71, courses: DESIGN },
  { id: 191, label: 'M.Pharm', category: 'Postgraduate', seq: 72, courses: PHARMACY },
  { id: 192, label: 'M.Ed.', category: 'Postgraduate', seq: 73, courses: EDUCATION_SPECS },
  { id: 193, label: 'LL.M.', category: 'Postgraduate', seq: 74, courses: LAW },
  { id: 194, label: 'MD (Doctor of Medicine)', category: 'Postgraduate', seq: 75, courses: MEDICAL_SPECIALITIES },
  { id: 195, label: 'MS (Master of Surgery)', category: 'Postgraduate', seq: 76, courses: MEDICAL_SPECIALITIES },
  { id: 196, label: 'MDS', category: 'Postgraduate', seq: 77, courses: DENTAL },
  { id: 197, label: 'MPT', category: 'Postgraduate', seq: 78, courses: PHYSIOTHERAPY },
  { id: 198, label: 'M.Sc. Nursing', category: 'Postgraduate', seq: 79, courses: NURSING },
  { id: 199, label: 'MPH', category: 'Postgraduate', seq: 80, courses: PUBLIC_HEALTH },
  {
    id: 200,
    label: 'MHA',
    category: 'Postgraduate',
    seq: 81,
    courses: ['Hospital Administration', 'Healthcare Management', 'Other'],
  },
  { id: 201, label: 'MSW', category: 'Postgraduate', seq: 82, courses: SOCIAL_WORK },
  { id: 202, label: 'MJMC', category: 'Postgraduate', seq: 83, courses: JOURNALISM },
  { id: 203, label: 'MHM', category: 'Postgraduate', seq: 84, courses: HOSPITALITY },
  { id: 204, label: 'MFA', category: 'Postgraduate', seq: 85, courses: FINE_ARTS },
  { id: 205, label: 'M.P.Ed.', category: 'Postgraduate', seq: 86, courses: PHYSICAL_EDUCATION },
  { id: 206, label: 'M.Voc.', category: 'Postgraduate', seq: 87, courses: VOCATIONAL },
  {
    id: 207,
    label: 'M.Lib.I.Sc.',
    category: 'Postgraduate',
    seq: 88,
    courses: ['Library and Information Science', 'Other'],
  },
  {
    id: 208,
    label: 'M.Stat.',
    category: 'Postgraduate',
    seq: 89,
    courses: ['Statistics', 'Applied Statistics', 'Data Science', 'Other'],
  },
  { id: 209, label: 'M.V.Sc.', category: 'Postgraduate', seq: 90, courses: VETERINARY },
  { id: 210, label: 'M.Sc. Agriculture', category: 'Postgraduate', seq: 91, courses: AGRICULTURE },
  {
    id: 211,
    label: 'M.F.Sc.',
    category: 'Postgraduate',
    seq: 92,
    courses: ['Fisheries Science', 'Aquaculture', 'Fish Processing Technology', 'Other'],
  },

  /* --- Doctorate / research -------------------------------------- */
  { id: 230, label: 'M.Phil.', category: 'Doctorate', seq: 100, courses: RESEARCH_FIELDS },
  { id: 231, label: 'Ph.D.', category: 'Doctorate', seq: 101, courses: RESEARCH_FIELDS },
  { id: 232, label: 'D.Sc.', category: 'Doctorate', seq: 102, courses: RESEARCH_FIELDS },
  { id: 233, label: 'D.Litt.', category: 'Doctorate', seq: 103, courses: RESEARCH_FIELDS },
  { id: 234, label: 'LL.D.', category: 'Doctorate', seq: 104, courses: LAW },
  { id: 235, label: 'DM (Doctorate of Medicine)', category: 'Doctorate', seq: 105, courses: MEDICAL_SPECIALITIES },
  { id: 236, label: 'M.Ch.', category: 'Doctorate', seq: 106, courses: MEDICAL_SPECIALITIES },
  { id: 237, label: 'Post Doctoral Fellowship', category: 'Doctorate', seq: 107, courses: RESEARCH_FIELDS },

  /* --- Other ------------------------------------------------------ */
  { id: 250, label: 'Other', category: 'Other', seq: 120, courses: ['Other'] },
];
