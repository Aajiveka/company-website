import { Fragment } from 'react';

import { Colophon, Masthead } from '../Chrome';
import { Img, Para, Sheet, Txt } from '../primitives';
import { ASSET, C, W } from '../tokens';

/** The seven steps, each with the exact position of its numeral and caption. */
const STEPS = [
  { n: '1.', nx: 663.8, ny: 215.2, label: 'Download the App ', lx: 512.9, ly: 267.1 },
  { n: '2.', nx: 954.0, ny: 274.8, label: 'Login/Signup App ', lx: 953.9, ly: 326.6 },
  { n: '3.', nx: 657.5, ny: 339.1, label: 'Create an Account', lx: 522.9, ly: 391.0 },
  { n: '4.', nx: 953.8, ny: 400.9, label: 'Add Skills', lx: 954.0, ly: 452.9 },
  { n: '5.', nx: 656.2, ny: 463.1, label: 'Upload Resume', lx: 545.8, ly: 514.9 },
  { n: '6.', nx: 954.0, ny: 527.4, label: 'Upload Documents ', lx: 953.9, ly: 579.2 },
  { n: '7.', nx: 657.6, ny: 586.9, label: 'Get Started With The Job', lx: 461.1, ly: 638.8 },
] as const;

const INTRO = [
  'to understand. Finding a job at ',
  'Aajiveka is just one step away ',
  'from your screen. Here is a ',
  'working mechanism of Aajiveka: ',
] as const;

/** Brochure page 4 — How it Works. */
export function HowItWorks() {
  return (
    <Sheet label="How it works">
      <Masthead showTollFree={false} />

      <Txt x={31.3} y={200.9} size={34.12} weight={W.medium}>
        How it
      </Txt>
      <Txt x={30.9} y={235.4} size={48.62} weight={W.extrabold} color={C.navy}>
        WORKS?
      </Txt>

      <Txt x={30.6} y={332.2} size={18.6}>
        {'Our workflow is simple and easy '}
      </Txt>
      <Para x={31.1} y={360.8} size={18.6} lead={28.53} lines={INTRO} />

      <Img src={`${ASSET}/phone-mockup.webp`} alt="Aajiveka app" x={714} y={216} w={221} h={460} />

      {STEPS.map((s) => (
        <Fragment key={s.n}>
          <Txt x={s.nx} y={s.ny} size={42.89} weight={W.extrabold} color={C.navy}>
            {s.n}
          </Txt>
          <Txt x={s.lx} y={s.ly} size={18.38} color="#000000">
            {s.label}
          </Txt>
        </Fragment>
      ))}

      <Colophon companyY={805.7} siteY={800.6} />
    </Sheet>
  );
}
