import { Colophon, Masthead } from '../Chrome';
import { Img, Para, Sheet, Txt } from '../primitives';
import { ASSET, C, W } from '../tokens';

const BODY = [
  '“Aajiveka”, which ultimately means a basic necessity for any individual to sustain themselves and achieve financial ',
  'stability. In the business world, the simple way to provide livelihood is by generating potential career opportunities that ',
  'not only benefit the employees but also the employers. And this is exactly what Aajiveka manifested into their business ',
  'fundamentals.',
  '',
  'In this technology-driven era, Aajiveka is considered as a next-gen leading job portal in India, that connects talented ',
  'professionals with top-notch employers to help them achieve their career aspirations. By doing so, Aajiveka enables ',
  'employers to attract and retain talented individuals, which can help them achieve their business goals.',
  '',
  'At the same time, job seekers can find best job opportunities that align with their skills, knowledge, and career ',
  "aspirations, thus achieving a fulfilling and rewarding career. Ultimately, Aajiveka's motive is to foster a win-win situation for ",
  'both employers and job seekers and contribute to the overall economic growth of the country.',
] as const;

/** Brochure page 2 — About Aajiveka. */
export function AboutAajiveka() {
  return (
    <Sheet label="About Aajiveka">
      <Masthead />

      <Txt x={28.1} y={276.6} size={37.67} weight={W.medium}>
        About
      </Txt>
      <Txt x={28.3} y={314.8} size={53.67} weight={W.extrabold} color={C.navy}>
        AAJIVEKA
      </Txt>

      <Para x={27.7} y={424} size={10.95} lead={17.8} lines={BODY} />

      <Img src={`${ASSET}/photo-about.jpg`} x={739.6} y={293.9} w={413} h={495.3} />

      <Colophon companyY={805.5} siteY={805.5} barY={789.2} />
    </Sheet>
  );
}
