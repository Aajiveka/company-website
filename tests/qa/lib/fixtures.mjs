// Deterministic, fictional test data. Every name is a random first+last pairing, every email
// is on example.com (RFC 2606 — undeliverable by design), and every phone sits in one
// synthetic series. Nothing here describes a real person or company.
import { deflateSync } from 'node:zlib';

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, a) => a[Math.floor(r() * a.length)];
export const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
export const sample = (r, a, n) => {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  return c.slice(0, n);
};

const FIRST_M = ['Aarav', 'Vihaan', 'Arjun', 'Kabir', 'Reyansh', 'Ishaan', 'Dhruv', 'Rohan', 'Karthik', 'Siddharth', 'Nikhil', 'Pranav', 'Aditya', 'Varun', 'Yash', 'Harsh', 'Manav', 'Tanmay', 'Rahul', 'Omkar', 'Sameer', 'Vikram', 'Akash', 'Naveen', 'Gautam', 'Imran', 'Faizan', 'Joel', 'Ritesh', 'Sandeep'];
const FIRST_F = ['Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Ishita', 'Kavya', 'Meera', 'Riya', 'Sneha', 'Pooja', 'Nandini', 'Shreya', 'Tanvi', 'Aisha', 'Lakshmi', 'Divya', 'Priya', 'Neha', 'Swati', 'Bhavana', 'Zoya', 'Fatima', 'Sana', 'Gayatri', 'Harini', 'Keerthi', 'Mansi', 'Payal', 'Ritika', 'Trisha'];
const LAST = ['Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Patel', 'Desai', 'Kulkarni', 'Joshi', 'Menon', 'Rao', 'Gupta', 'Agarwal', 'Bansal', 'Chopra', 'Malhotra', 'Bhat', 'Pillai', 'Shetty', 'Naidu', 'Mishra', 'Tiwari', 'Pandey', 'Saxena', 'Kapoor', 'Sinha', 'Das', 'Ghosh', 'Banerjee', 'Mukherjee', 'Khan', 'Siddiqui', 'Fernandes', 'DSouza', 'Gill', 'Sandhu', 'Chauhan', 'Rathore', 'Yadav', 'Thakur'];

export const CITY_NAMES = ['Bengaluru', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Noida', 'Gurugram', 'Delhi', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi', 'Indore', 'Chandigarh', 'Lucknow', 'Coimbatore', 'Nagpur', 'Bhubaneswar', 'Thiruvananthapuram', 'Visakhapatnam'];

/**
 * Role catalogue. `designation` must be a tblMstrDesignation label. Where the brief names a role
 * the master does not hold, `aliasOf` records the role it was mapped to (reported as a gap).
 */
export const ROLES = [
  { key: 'frontend', designation: 'Frontend Developer', skills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Tailwind CSS'], tech: true },
  { key: 'react', designation: 'React Developer', skills: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'GraphQL'], tech: true },
  { key: 'backend', designation: 'Backend Developer', skills: ['Node.js', 'Express', 'PostgreSQL', 'REST API', 'Docker', 'Microservices'], tech: true },
  { key: 'node', designation: 'Node.js Developer', skills: ['Node.js', 'Express', 'MongoDB', 'REST API', 'JavaScript', 'Redis'], tech: true },
  { key: 'fullstack', designation: 'Full Stack Developer', skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'Docker', 'REST API'], tech: true },
  { key: 'mern', designation: 'Full Stack Developer', aliasOf: 'MERN Stack Developer', skills: ['MongoDB', 'Express', 'React', 'Node.js', 'JavaScript', 'REST API'], tech: true },
  { key: 'java', designation: 'Java Developer', skills: ['Java', 'Spring Boot', 'Microservices', 'SQL', 'Oracle', 'Git'], tech: true },
  { key: 'python', designation: 'Python Developer', skills: ['Python', 'Django', 'Flask', 'FastAPI', 'PostgreSQL', 'REST API'], tech: true },
  { key: 'dataanalyst', designation: 'Data Analyst', skills: ['SQL', 'Excel', 'Power BI', 'Tableau', 'Python', 'Pandas'], tech: true },
  { key: 'datascientist', designation: 'Data Scientist', skills: ['Python', 'Machine Learning', 'Pandas', 'NumPy', 'TensorFlow', 'Deep Learning'], tech: true },
  { key: 'uiux', designation: 'UI/UX Designer', skills: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'HTML', 'CSS'], tech: true },
  { key: 'tester', designation: 'Manual Tester', aliasOf: 'Software Tester', skills: ['Manual Testing', 'JIRA', 'SQL', 'Selenium'], tech: true },
  { key: 'qa', designation: 'QA Engineer', skills: ['Automation Testing', 'Selenium', 'Cypress', 'Playwright', 'JMeter', 'JIRA'], tech: true },
  { key: 'devops', designation: 'DevOps Engineer', skills: ['Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'AWS', 'Linux'], tech: true },
  { key: 'cloud', designation: 'Cloud Engineer', skills: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Linux', 'Docker'], tech: true },
  { key: 'pm', designation: 'Product Manager', aliasOf: 'Project Manager', skills: ['Agile', 'Scrum', 'JIRA', 'Leadership', 'Communication'], tech: false },
  { key: 'hr', designation: 'HR Executive', skills: ['Communication', 'Excel', 'Leadership', 'Problem Solving'], tech: false },
  { key: 'digital', designation: 'Digital Marketing Executive', skills: ['Digital Marketing', 'SEO', 'Content Writing', 'Excel', 'Communication'], tech: false },
  { key: 'sales', designation: 'Sales Executive', skills: ['Communication', 'Salesforce', 'Excel', 'Leadership', 'Problem Solving'], tech: false },
  { key: 'accountant', designation: 'Finance Executive', aliasOf: 'Accountant', skills: ['Excel', 'SAP', 'SQL', 'Communication'], tech: false },
  { key: 'ba', designation: 'Business Analyst', skills: ['SQL', 'Excel', 'Power BI', 'JIRA', 'Agile', 'Communication'], tech: false },
  { key: 'support', designation: 'Customer Support', skills: ['Communication', 'Problem Solving', 'Excel', 'JIRA'], tech: false },
  { key: 'ops', designation: 'Operations Executive', skills: ['Excel', 'Communication', 'Problem Solving', 'Leadership', 'SAP'], tech: false },
  { key: 'content', designation: 'Content Writer', skills: ['Content Writing', 'SEO', 'Communication'], tech: false },
];
export const roleByKey = Object.fromEntries(ROLES.map((r) => [r.key, r]));

/** Industry groups from the brief → tblMstrIndustryType labels, and the roles they hire. */
export const INDUSTRIES = [
  { name: 'IT & Software Development', industry: 'IT Services & Consulting', roles: ['frontend', 'react', 'backend', 'node', 'fullstack', 'mern', 'java', 'python', 'qa', 'devops', 'cloud', 'tester'] },
  { name: 'Healthcare', industry: 'Medical Services / Hospital', roles: ['dataanalyst', 'support', 'ops', 'hr', 'accountant', 'java'] },
  { name: 'Banking & Finance', industry: 'Banking', roles: ['accountant', 'ba', 'java', 'dataanalyst', 'sales', 'support'] },
  { name: 'FinTech', industry: 'FinTech / Payments', roles: ['backend', 'node', 'react', 'devops', 'datascientist', 'ba', 'qa'] },
  { name: 'Education', industry: 'E-Learning / EdTech', roles: ['content', 'frontend', 'sales', 'support', 'uiux', 'digital'] },
  { name: 'Manufacturing', industry: 'Industrial Equipment / Machinery', roles: ['ops', 'accountant', 'hr', 'dataanalyst', 'sales'] },
  { name: 'E-commerce', industry: 'Internet', roles: ['fullstack', 'mern', 'react', 'digital', 'support', 'datascientist', 'uiux'] },
  { name: 'Retail', industry: 'Retail', roles: ['sales', 'ops', 'support', 'accountant', 'digital'] },
  { name: 'Construction', industry: 'Engineering & Construction', roles: ['pm', 'ops', 'accountant', 'hr'] },
  { name: 'Hospitality', industry: 'Hotels & Restaurants', roles: ['ops', 'support', 'sales', 'hr', 'digital'] },
  { name: 'Marketing', industry: 'Advertising & Marketing', roles: ['digital', 'content', 'uiux', 'sales', 'dataanalyst'] },
  { name: 'Logistics', industry: 'Courier / Logistics', roles: ['ops', 'dataanalyst', 'support', 'java', 'ba'] },
  { name: 'Telecommunications', industry: 'Telecom / ISP', roles: ['cloud', 'devops', 'support', 'sales', 'java'] },
  { name: 'Consulting', industry: 'Management Consulting', roles: ['ba', 'pm', 'dataanalyst', 'hr', 'accountant'] },
  { name: 'Startups', industry: 'Software Product', roles: ['fullstack', 'mern', 'python', 'uiux', 'pm', 'digital', 'devops'] },
  { name: 'Other', industry: 'Recruitment / Staffing', roles: ['hr', 'sales', 'support', 'ops'] },
];

/** Experience bands from the brief, with how many of the 1,000 fall in each. */
export const BANDS = [
  { key: 'fresher', n: 120, exp: [0, 0], ctc: [0, 0] },
  { key: 'intern', n: 80, exp: [0, 0], ctc: [0, 180000] },
  { key: '0-1', n: 110, exp: [0, 0], months: true, ctc: [180000, 400000] },
  { key: '1-2', n: 110, exp: [1, 1], ctc: [300000, 600000] },
  { key: '2-3', n: 110, exp: [2, 2], ctc: [450000, 900000] },
  { key: '3-5', n: 130, exp: [3, 4], ctc: [700000, 1400000] },
  { key: '5-8', n: 130, exp: [5, 7], ctc: [1100000, 2200000] },
  { key: '8-10', n: 100, exp: [8, 9], ctc: [1800000, 3200000] },
  { key: '10+', n: 110, exp: [10, 18], ctc: [2500000, 5000000] },
];

export function personName(r) {
  const gender = r() < 0.5 ? 'M' : 'F';
  return { gender, fullName: `${pick(r, gender === 'M' ? FIRST_M : FIRST_F)} ${pick(r, LAST)}` };
}

const CO_A = ['Nimbus', 'Vertex', 'Saffron', 'Cobalt', 'Lotus', 'Indigo', 'Granite', 'Monsoon', 'Peacock', 'Banyan', 'Quartz', 'Harbor', 'Kestrel', 'Orchid', 'Summit', 'Tidal', 'Aurora', 'Falcon', 'Meridian', 'Zephyr', 'Cedar', 'Onyx', 'Pinnacle', 'Riverbend', 'Sterling'];
const CO_B = { 'IT & Software Development': 'Softworks', Healthcare: 'Care Hospitals', 'Banking & Finance': 'Capital Bank', FinTech: 'Pay Technologies', Education: 'Learning Labs', Manufacturing: 'Engineering Works', 'E-commerce': 'Commerce', Retail: 'Retail Stores', Construction: 'Infra Builders', Hospitality: 'Hotels & Resorts', Marketing: 'Media & Ads', Logistics: 'Freight Logistics', Telecommunications: 'Telecom Networks', Consulting: 'Advisory Partners', Startups: 'Labs', Other: 'Staffing Services' };
export function companyName(i, group) {
  return `${CO_A[i % CO_A.length]} ${CO_B[group] ?? 'Enterprises'} ${i >= CO_A.length ? `${Math.floor(i / CO_A.length) + 1} ` : ''}Pvt Ltd (QA)`;
}

/* ---------------------------------------------------------------------------------------- */
/* Files                                                                                    */
/* ---------------------------------------------------------------------------------------- */

/** A real, one-page PDF with the candidate's name and skills, so page-count parsing runs. */
export function resumePdf(lines) {
  const esc = (s) => String(s).replace(/[\\()]/g, (c) => '\\' + c).replace(/[^\x20-\x7e]/g, '?');
  const text = ['BT', '/F1 12 Tf', '50 780 Td', '16 TL', ...lines.map((l) => `(${esc(l)}) '`), 'ET'].join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** A size×size PNG: two-tone diagonal so each avatar/logo is visibly distinct. */
export function png(size, [r1, g1, b1], [r2, g2, b2]) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (size * 3 + 1) + 1 + x * 3;
      const a = x + y < size;
      raw[o] = a ? r1 : r2; raw[o + 1] = a ? g1 : g2; raw[o + 2] = a ? b1 : b2;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
export const colour = (r) => [int(r, 20, 235), int(r, 20, 235), int(r, 20, 235)];
