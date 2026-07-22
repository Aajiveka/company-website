import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { JobSearchBar } from '@/features/jobs/components/JobSearchBar';
import { SERVICES } from './services.data';

/**
 * Home page — faithful rebuild of index.aspx (hero, About, Our Story,
 * Our Philosophy, Our Service grid) on the NewTheme design tokens.
 */
export default function HomePage() {
  return (
    <>
      <Seo title="Home" path="/" />
      {/* -------------------------------- Hero -------------------------------- */}
      <section className="hero-banner relative flex min-h-[28rem] items-center overflow-hidden md:h-[600px] lg:h-[745px]">
        <img
          src="/image/slider_laptop.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-[4%] z-0 hidden w-[38%] max-w-[519px] object-contain md:block lg:right-[8%]"
        />
        <div className="container relative z-10">
          <div className="max-w-full text-white sm:max-w-3xl md:max-w-[52%]">
            <h1 className="mb-6 font-heading text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
              Unlock your Potential with Aajiveka - Your Ultimate Career Partner
            </h1>
            <JobSearchBar />
          </div>
        </div>
      </section>

      {/* ------------------------------- About -------------------------------- */}
      <section className="py-8 md:py-12 lg:py-20">
        <div className="container text-center">
          <h2>About Aajevika</h2>
          <p className="mx-auto mt-4 max-w-3xl text-gray-600">
            “Aajiveka”, which ultimately means a basic necessity for any individual to sustain themselves and
            achieve financial stability. In this technology-driven era, Aajiveka is a next-gen leading job portal
            in India, connecting talented professionals with top-notch employers to help them achieve their career
            aspirations. Aajiveka's motive is to foster a win-win situation for both employers and job seekers and
            contribute to the overall economic growth of the country.
          </p>
        </div>
      </section>

      {/* ----------------------------- Our Story ------------------------------ */}
      <section className="py-8">
        <div className="container">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="md:pr-10">
              <h2>Our Story</h2>
              <p className="mt-4 text-gray-600">
                Aajiveka was founded with a vision to revolutionize the recruitment industry in India by reaping the
                richness of innovative technologies. We bridge the gap between job seekers and employers with a
                user-friendly platform powered by AI and ML algorithms, combining manual and digital methods.
              </p>
              <p className="mt-3 text-gray-600">
                Rooted in the recruitment industry for years, we are one of the most trusted and reliable job
                portals in India, having helped thousands of job seekers find their dream jobs.
              </p>
            </div>
            <img src="/image/story.jpg" alt="Our story" className="w-full rounded-lg" loading="lazy" />
          </div>
          <div className="mt-6 text-center">
            <h3 className="font-heading text-2xl font-semibold text-primary">
              Empowering Careers, Transforming Lives.
            </h3>
          </div>
        </div>
      </section>

      {/* --------------------------- Our Philosophy --------------------------- */}
      <section className="my-8 bg-accent py-10 md:my-12 md:py-16 lg:my-20">
        <div className="container">
          <h2>Our Philosophy</h2>
          <div className="mt-4 max-w-4xl space-y-3 text-navy/80">
            <p>
              At Aajiveka, we believe in creating an inclusive and diverse platform that fosters growth and
              development for all. We are committed to providing equal opportunities to all candidates, assessed on
              their unique skills and potential.
            </p>
            <p>
              Candidates can begin by simply signing up: create an account, add a skill set, and upload a resume
              and documents to seamlessly start applying to the best suitable jobs.
            </p>
          </div>
          <div className="my-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:my-12 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <img
                key={n}
                src={`/image/philosophy${n}.png`}
                alt=""
                className="w-full"
                loading="lazy"
              />
            ))}
          </div>
          <div className="max-w-4xl space-y-3 text-navy/80">
            <p>
              We have a dedicated pool of career counselors and experts who deeply evaluate the skills of each
              candidate and help in writing a resume. We assign a dedicated AI career assistant to stand by your
              side, from creating a free resume to finding the right jobs.
            </p>
            <p>
              We maintain transparency and integrity in all our dealings, take your privacy as the top priority,
              and never sell the database to corporates and big firms.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------- Our Service ----------------------------- */}
      <section className="py-8 pb-16 text-center">
        <div className="container">
          <h2>Our Service</h2>
          <p className="mt-4 text-gray-600">
            We offer a wide range of services to both job seekers and employers, including:
          </p>
          <div className="mt-8 grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <article
                key={s.title}
                className="rounded-xl bg-white p-6 shadow-[0px_4px_40px_rgba(43,89,255,0.08)] transition hover:-translate-y-1"
              >
                <img src={s.icon} alt="" className="mx-auto h-16" loading="lazy" />
                <h5 className="mb-2 mt-3 font-heading text-lg font-semibold text-navy">{s.title}</h5>
                <p className="text-center text-sm text-gray-600">{s.text}</p>
              </article>
            ))}
          </div>
          <Link to="/subscription">
            <Button className="mt-10">Know More</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
