export interface BlogPost {
  slug: string;
  title: string;
  image: string;
  excerpt: string;
  date: string;
  author: string;
  body: string[];
}

/** Blog posts — titles/images from Blogs.aspx; body copy is representative. */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'write-an-effective-resume',
    title: 'How to Write An Effective Resume',
    image: '/image/blog1.jpg',
    excerpt: 'A great resume opens doors. Learn how to structure yours to grab a recruiter’s attention in seconds.',
    date: 'June 12, 2026',
    author: 'Aajiveka Team',
    body: [
      'Your resume is often the first impression you make on an employer. A well-crafted resume highlights your most relevant skills and achievements while remaining concise and easy to scan.',
      'Start with a clear headline and a short professional summary. Use bullet points to describe accomplishments with measurable impact, and tailor the content to each role you apply for.',
      'Finally, keep the design clean and ATS-friendly. Avoid images or complex tables that automated screening systems may struggle to parse.',
    ],
  },
  {
    slug: 'importance-of-soft-skills',
    title: 'The Importance of Soft Skills in the Workplace: What Employers Look For?',
    image: '/image/blog2.jpg',
    excerpt: 'Technical ability gets you the interview — soft skills get you the job. Here’s what employers value most.',
    date: 'June 20, 2026',
    author: 'Aajiveka Team',
    body: [
      'Communication, collaboration and adaptability consistently rank among the most sought-after qualities in candidates across every industry.',
      'Employers want people who can work well in teams, navigate ambiguity, and communicate ideas clearly. Demonstrating these skills in interviews can set you apart from equally qualified candidates.',
    ],
  },
  {
    slug: 'ace-your-job-interview',
    title: 'How to Ace Your Job Interview: Common Questions and Best Answers',
    image: '/image/blog3.jpg',
    excerpt: 'Preparation is the secret to interview confidence. Review the most common questions and how to answer them.',
    date: 'June 28, 2026',
    author: 'Aajiveka Team',
    body: [
      'Interviews can be nerve-wracking, but preparation makes all the difference. Research the company, understand the role, and prepare stories that showcase your impact.',
      'Use the STAR method (Situation, Task, Action, Result) to structure your answers to behavioural questions, and always prepare thoughtful questions to ask the interviewer.',
    ],
  },
  {
    slug: 'top-industries-hiring',
    title: 'Top Industries Hiring in 2026',
    image: '/image/blog4.jpg',
    excerpt: 'From technology to healthcare, discover which sectors are actively growing and hiring this year.',
    date: 'July 2, 2026',
    author: 'Aajiveka Team',
    body: [
      'Technology, healthcare, renewable energy and financial services continue to lead hiring demand in 2026.',
      'Understanding where the opportunities are can help you focus your job search and upskill in the right direction.',
    ],
  },
  {
    slug: 'optimize-resume-for-ats',
    title: 'Tips to Optimize Your Resume for Applicant Tracking Systems',
    image: '/image/blog5.jpg',
    excerpt: 'Most resumes are screened by software before a human sees them. Learn how to get past the bots.',
    date: 'July 8, 2026',
    author: 'Aajiveka Team',
    body: [
      'Applicant Tracking Systems (ATS) scan resumes for keywords and formatting before they reach a recruiter.',
      'Use standard section headings, mirror keywords from the job description, and avoid graphics-heavy layouts to ensure your resume is parsed correctly.',
    ],
  },
];

export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
