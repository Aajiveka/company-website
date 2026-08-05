import { Fragment } from 'react';

import { Colophon, Masthead } from '../Chrome';
import { Para, Sheet, Txt } from '../primitives';
import { C, W } from '../tokens';

/** Five numbered highlight columns. */
const COLUMNS = [
  {
    marker: '| 1',
    markerX: 35.2,
    markerY: 348.3,
    x: 33.7,
    lines: [
      'Our platform is designed ',
      'to be user-friendly, with ',
      'an intuitive interface that ',
      'makes job search and ',
      'recruitment a breeze.',
    ],
  },
  {
    marker: ' | 2',
    markerX: 251.3,
    markerY: 348.0,
    x: 260.6,
    lines: [
      'We offer a wide range of ',
      'job listings across various ',
      'industries and skill sets, ',
      'providing job seekers with ',
      'a diverse range of ',
      'opportunities to choose ',
      'from.',
    ],
  },
  {
    marker: ' | 3',
    markerX: 478.2,
    markerY: 348.0,
    x: 487.5,
    lines: [
      'Our platform uses ',
      'advanced AI algorithms ',
      'and data analytics to ',
      'match job seekers with ',
      'the right opportunities, ',
      'ensuring a higher chance ',
      'of success for both job ',
      'seekers and employers.',
    ],
  },
  {
    marker: ' | 4',
    markerX: 705.1,
    markerY: 348.0,
    x: 714.4,
    lines: [
      'We prioritize the privacy ',
      'and security of our users, ',
      'with robust data ',
      'encryption and secure ',
      'servers to protect user ',
      'data.',
    ],
  },
  {
    marker: ' | 5',
    markerX: 931.9,
    markerY: 348.0,
    x: 941.2,
    lines: [
      'We are committed to ',
      'providing exceptional ',
      'customer service, with a ',
      'dedicated team of ',
      'professionals available to ',
      'assist job seekers and ',
      'employers with any ',
      'queries or concerns.',
    ],
  },
] as const;

/** Brochure page 6 — Why Choose Aajiveka. */
export function WhyChoose() {
  return (
    <Sheet label="Why choose Aajiveka">
      <Masthead />

      <Txt x={33.8} y={179} size={34.12} weight={W.medium}>
        Why Choose
      </Txt>
      <Txt x={33.7} y={213.2} size={48.62} weight={W.extrabold} color={C.navy}>
        AAJIVEKA?
      </Txt>

      <Txt x={33.5} y={286} size={14.26}>
        Looking for the right job? Look no further, Aajiveka can be your trusted partner. Here are the key highlights that make
        Aajiveka an optimum choice for users:
      </Txt>

      {COLUMNS.map((col) => (
        <Fragment key={col.marker}>
          <Txt x={col.markerX} y={col.markerY} size={37.83} weight={W.bold} color={C.navy}>
            {col.marker}
          </Txt>
          <Para x={col.x} y={413.4} size={16.12} lead={26.67} weight={W.light} lines={col.lines} />
        </Fragment>
      ))}

      <Colophon companyY={805.7} siteY={806.1} />
    </Sheet>
  );
}
