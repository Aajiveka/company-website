import { Colophon, Masthead } from '../Chrome';
import { Img, Para, Sheet, Txt } from '../primitives';
import { ASSET, C, W } from '../tokens';

const BODY = [
  'At Aajiveka, we believe in creating an inclusive and diverse platform that faster growth and development for all. We are ',
  'committed to providing equal opportunities to all candidates and ensuring that every applicant is assessed based on their ',
  'unique skills and potential. ',
  '',
  'So candidates looking for the job can begin with the process by simply signing up for a Aajiveka app. Create an account, ',
  'add a skill set, and upload a resume and documents to seamlessly start the process of applying to the best suitable jobs. ',
  '',
  'But what if the candidates still need a resume? That’s where Aajiveka holds your hand and helps you jump onto the next ',
  'step of career-making. To make this mantra work, we have a dedicated pool of career counselors and experts who will ',
  "deeply evaluate the skills of the individual candidate and help in writing a resume. That's not all!",
  '',
  'At Aajiveka, we assigned a dedicated AI career assistant to the candidates, which will stand by your side right from ',
  'creating a free resume to finding right jobs. The moment you create an account, our AI career experts will help you find ',
  'the best job matches, deliver career opportunities to doorsteps, and assist career pathways at each phase of their journey.  ',
  '',
  'We strive to maintain transparency and integrity in all our dealings and ensure that the recruitment process is fair and ',
  'unbiased. Also, we take your privacy as the top priority, therefore, we are never into selling the database to the corporates ',
  'and big firms.',
  '',
  'Our expert team works closely with job seekers and employers to understand their requirements and provide customized ',
  'solutions that meet their unique needs by keeping in mind data security and candidates’ privacy.',
] as const;

/** Brochure page 3 — About Philosophy. */
export function Philosophy() {
  return (
    <Sheet label="About Philosophy">
      <Masthead />

      <Txt x={33.8} y={200.7} size={34.12} weight={W.medium}>
        About
      </Txt>
      <Txt x={34} y={235.3} size={48.62} weight={W.extrabold} color={C.navy}>
        PHILOSOPHY
      </Txt>

      <Para x={33.7} y={334.2} size={9.92} lead={16.12} lines={BODY} />

      <Img src={`${ASSET}/photo-philosophy.webp`} x={618.4} y={209.4} w={564.3} h={582.6} />

      <Colophon companyY={807.1} siteY={807.1} />
    </Sheet>
  );
}
