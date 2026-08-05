import { Fragment } from 'react';

import { Colophon, Masthead } from '../Chrome';
import { Box, Img, Sheet, Txt } from '../primitives';
import { ASSET, C, W } from '../tokens';

/** Table geometry, in PDF points. */
const TABLE = {
  left: 119.2,
  width: 954.4,
  headerY: 271.9,
  headerH: 39.9,
  firstRuleY: 311.8,
  firstLabelY: 320.1,
  pitch: 33.7,
} as const;

/** One row per benefit; `free` marks the single benefit the free tier includes. */
const ROWS = [
  { label: 'Resume Writing Tool', free: true },
  { label: 'Rank Higher in Search Results', free: false },
  { label: 'Profile Performance', free: false },
  { label: 'Highlighted Profile', free: false },
  { label: 'Access to Premium Resume Maker', free: false },
  { label: 'Dedicated Career Counselor', free: false },
  { label: 'Priority Access to Jobs', free: false },
  { label: 'Profile-based Job Recommendations', free: false },
  { label: 'Expand Job Search', free: false },
  { label: 'Direct Message to Recruiters', free: false },
  { label: 'Exclusive Access to Confidential Jobs', free: false },
  { label: 'Interview Calls', free: false, note: '(6 interview calls)', tickX: 859.5 },
  { label: 'Job Alerts on Email/SMS', free: false },
] as const;

const TICK = { w: 22.38, h: 17.38 };
const CROSS = { w: 20.7, h: 21.5 };

/** Brochure page 9 — What We Offer (free vs premium). */
export function WhatWeOffer() {
  return (
    <Sheet label="What we offer">
      <Masthead titleY={20.9} cinY={22.1} tollFreeY={41} illustrationY={14.2} badgeY={13.6} />

      <Txt x={409.4} y={112.2} size={46.26} weight={W.extrabold} color={C.navy}>
        What We Offer?
      </Txt>
      <Txt x={28.6} y={180.1} size={18.85}>
        {"With Aajiveka's subscription plans, you can take your job search to the next level. We offer monthly, quarterly, half-yearly,"}
      </Txt>
      <Txt x={338.6} y={210.7} size={18.85}>
        and annual plans that cater to your needs and budget.
      </Txt>

      <Box x={TABLE.left} y={TABLE.headerY} w={TABLE.width} h={TABLE.headerH} fill={C.navy} />
      <Txt x={140.5} y={281.7} size={17.84} weight={W.semibold} color={C.white}>
        Benifit
      </Txt>
      <Txt x={606.8} y={281.7} size={17.84} weight={W.semibold} color={C.white}>
        Free Services
      </Txt>
      <Txt x={846.6} y={281.7} size={17.84} weight={W.semibold} color={C.white}>
        Premium Services
      </Txt>

      {ROWS.map((row, i) => (
        <Fragment key={row.label}>
          <Box x={TABLE.left} y={TABLE.firstRuleY + TABLE.pitch * i} w={TABLE.width} h={0.22} fill={C.rule} />
          <Txt x={140.5} y={TABLE.firstLabelY + TABLE.pitch * i} size={13.19} weight={W.light} color={C.navy}>
            {row.label}
          </Txt>

          {row.free ? (
            <Img src={`${ASSET}/tick-green.png`} alt="Included" x={654.62} y={320} w={TICK.w} h={TICK.h} />
          ) : (
            <Img
              src={`${ASSET}/cross-red.png`}
              alt="Not included"
              x={655.2}
              y={351.4 + TABLE.pitch * (i - 1)}
              w={CROSS.w}
              h={CROSS.h}
            />
          )}

          <Img
            src={`${ASSET}/tick-green.png`}
            alt="Included"
            x={'tickX' in row ? row.tickX : 917}
            y={320 + TABLE.pitch * i}
            w={TICK.w}
            h={TICK.h}
          />
          {'note' in row && row.note && (
            <Txt x={885.4} y={TABLE.firstLabelY + TABLE.pitch * i} size={13.19} weight={W.light} color={C.navy}>
              {row.note}
            </Txt>
          )}
        </Fragment>
      ))}
      <Box x={TABLE.left} y={TABLE.firstRuleY + TABLE.pitch * ROWS.length} w={TABLE.width} h={0.22} fill={C.rule} />

      <Colophon companyY={805.7} siteY={800.6} />
    </Sheet>
  );
}
