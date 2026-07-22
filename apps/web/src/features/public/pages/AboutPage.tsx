import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';
import { ReviewSection } from '../components/ReviewSection';
import { DevicesSection } from '../components/DevicesSection';

const CHOOSE = [
  { icon: '/image/C1.svg', text: 'Our platform is designed to be user-friendly, with an intuitive interface that makes job search and recruitment a breeze.' },
  { icon: '/image/C2.svg', text: 'We offer a wide range of job listings across various industries and skill sets, providing job seekers with diverse opportunities.' },
  { icon: '/image/C3.svg', text: 'We prioritize the privacy and security of our users, with robust data encryption and secure servers to protect user data.' },
  { icon: '/image/C4.svg', text: 'Our platform uses advanced AI algorithms and data analytics to match job seekers with the right opportunities.' },
  { icon: '/image/C5.svg', text: 'We are committed to providing exceptional customer service, with a dedicated team available to assist with any queries.' },
];

const INDUSTRY = [
  { icon: '/image/I1.svg', title: 'Personalized AI Assistance', text: 'We assign dedicated AI-powered assistants to candidates to help them create impressive resumes for free, showcasing their skills in the best possible way.' },
  { icon: '/image/I2.svg', title: 'Skill-Based Job Matching', text: 'Our recruitment process matches the skills of candidates with job requirements, with filters to quickly narrow down the best-suited options.' },
  { icon: '/image/I3.svg', title: 'Easy to Get Started', text: 'Getting started with Aajiveka is simple. Candidates can sign up and start applying for jobs right away by uploading a resume and documents.' },
  { icon: '/image/I4.svg', title: 'Privacy and Security', text: 'We do not sell candidates’ databases to corporates and big firms, and take all measures to keep information secure and confidential.' },
  { icon: '/image/I5.svg', title: 'Comprehensive Support', text: 'Our AI-powered support team is available around the clock — guidance, career options, resume writing, feedback, courses and more.' },
];

export default function AboutPage() {
  return (
    <>
      <Seo
        title="About Us"
        description="Learn about Aajiveka — India's next-gen job portal empowering the workforce through technology, AI-powered resume building, and personalised career guidance."
        path="/about"
      />
      <PageBanner
        variant="about"
        title="Empowering India's workforce through technology: Aajiveka, where careers begin!"
      />

      {/* Mission */}
      <section className="py-12 md:py-20">
        <div className="container grid items-center gap-8 md:grid-cols-2">
          <div className="md:pr-10">
            <h2>Our Mission</h2>
            <p className="mt-4 text-gray-600">
              At Aajiveka, our mission is to revolutionize the job search industry in India by providing a
              tech-driven platform that empowers job seekers and employers alike. We strive to make the job
              search process faster, easier, and more efficient, while creating a positive impact on the lives
              of millions by connecting them to their dream jobs.
            </p>
          </div>
          <img src="/image/mission.jpg" alt="Our mission" className="w-full rounded-lg" loading="lazy" decoding="async" />
        </div>
      </section>

      {/* Vision */}
      <section className="pb-8">
        <div className="container grid items-center gap-8 md:grid-cols-2">
          <img src="/image/vision.png" alt="Our vision" className="w-full rounded-lg md:order-1" loading="lazy" decoding="async" />
          <div className="md:order-2 md:pl-10">
            <h2>Our Vision</h2>
            <p className="mt-4 text-gray-600">
              Our vision is to become India's leading job portal and to be recognized as a global leader in the
              job search industry. We use the latest technological innovations to create a seamless, intuitive
              job search experience, fostering a community of talented professionals who can network, learn and
              grow together.
            </p>
          </div>
        </div>
      </section>

      {/* Value */}
      <section className="py-12 md:py-20">
        <div className="container">
          <div className="mb-8 text-center">
            <h2>Our Value</h2>
            <p className="mt-2 text-gray-600">
              We are committed to delivering the highest quality of service by upholding the following values:
            </p>
          </div>
          <div className="grid items-center gap-8 md:grid-cols-3">
            <div className="space-y-5">
              <Value title="Customer-centricity" text="We put our users at the center of everything we do, striving to exceed their expectations." />
              <Value title="Collaboration" text="We build long-term relationships, working collaboratively with users, partners and employees." />
            </div>
            <img src="/image/value.png" alt="Our values" className="w-full" loading="lazy" decoding="async" />
            <div className="space-y-5">
              <Value title="Innovation" text="We continuously explore new technologies to improve our platform's functionality and experience." />
              <Value title="Transparency" text="We prioritize transparency and honesty in all our dealings with users and stakeholders." />
              <Value title="Diversity and Inclusivity" text="We create an inclusive platform promoting diversity, equity and accessibility for all." />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="pb-8">
        <div className="container grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            {CHOOSE.map((c) => (
              <div key={c.icon} className="flex items-start gap-4 rounded-xl bg-white p-5 shadow-card">
                <img src={c.icon} alt="" className="h-12 w-12 flex-shrink-0" loading="lazy" decoding="async" />
                <p className="text-sm text-gray-600">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="lg:pl-8">
            <h2>Why Choose Aajiveka?</h2>
            <p className="mt-4 text-gray-600">
              Looking for the right job? Look no further — Aajiveka can be your trusted partner. Here are the key
              highlights that make Aajiveka an optimum choice for users:
            </p>
            <Link to="/subscription">
              <Button className="mt-6">Get Started</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Industry */}
      <section className="bg-navy py-14 text-white md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-white">What Makes Us Best In The Recruitment Industry?</h2>
            <p className="mt-4 text-white/80">
              At Aajiveka, we take pride in being at the forefront of the recruitment industry, providing
              cutting-edge solutions to both candidates and companies.
            </p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {INDUSTRY.map((c) => (
              <div key={c.title} className="rounded-xl bg-white/5 p-6">
                <div className="mb-2 flex items-center gap-3">
                  <img src={c.icon} alt="" className="h-8 w-8" loading="lazy" decoding="async" />
                  <h6 className="font-heading text-lg font-semibold">{c.title}</h6>
                </div>
                <p className="text-sm text-white/80">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ReviewSection />
      <DevicesSection />
    </>
  );
}

function Value({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h5 className="mb-1.5 font-heading text-lg font-semibold text-navy">{title}</h5>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}
