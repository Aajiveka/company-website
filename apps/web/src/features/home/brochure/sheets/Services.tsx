import { Fragment } from 'react';

import { Colophon, Masthead } from '../Chrome';
import { Box, Img, Para, Sheet, Txt } from '../primitives';
import { ASSET, C, W } from '../tokens';

/** The three "For Job Seekers" entries, each with its navy rule. */
const ITEMS = [
  {
    title: 'Advanced Job Search Engine',
    titleY: 431.6,
    bodyY: 455.5,
    ruleY: 427.6,
    ruleH: 68.8,
    body: [
      'Our platform offers a comprehensive job search feature that allows candidates to filter jobs ',
      'based on their preferences and apply for the ones that match their skills and qualifications.',
    ],
  },
  {
    title: 'Resume Builder',
    titleY: 527.8,
    bodyY: 551.8,
    ruleY: 523.8,
    ruleH: 68.9,
    body: [
      'We provide an easy-to-use AI-powered resume builder tool that helps candidates create professional ',
      'and compelling resumes that increase the chances of getting noticed by the employers. ',
    ],
  },
  {
    title: 'Career Advice',
    titleY: 624.8,
    bodyY: 648.8,
    ruleY: 620.1,
    ruleH: 85.1,
    body: [
      'By creating an account with Aajiveka, students can get best career advice without any hassle. We have a 24/7 ',
      'chatbot/ Costumer support team available on the portal that offers valuable career advice and guidance to ',
      'help job seekers navigate their career paths according to their skill set and make informed decisions.',
    ],
  },
] as const;

/** The centred navy copy under the photo — each line keeps its own indent. */
const CAPTION = [
  { x: 766.3, y: 559.7, text: 'By simply choosing the subscription plan based on monthly, ' },
  { x: 774.1, y: 577.1, text: 'quarterly, half-yearly, and annually, candidates can avail of ' },
  { x: 771.8, y: 594.6, text: 'premium resume writing and job searching features at our ' },
  { x: 947.7, y: 612.0, text: 'portal. ' },
  { x: 772.9, y: 646.8, text: 'Join us today and take the first step toward achieving your ' },
  { x: 927.5, y: 664.2, text: 'career goals!' },
] as const;

/** Brochure page 5 — Our Services. */
export function Services() {
  return (
    <Sheet label="Our services">
      <Masthead />

      <Txt x={33.5} y={192.7} size={36.43} weight={W.medium}>
        Our
      </Txt>
      <Txt x={33.6} y={229.6} size={51.91} weight={W.extrabold} color={C.navy}>
        SERVICES
      </Txt>

      <Txt x={28.7} y={302.1} size={13.24}>
        We offer a wide range of services to both job seekers and employers, including:
      </Txt>

      <Box x={33.4} y={349.6} w={210.2} h={44.4} fill={C.yellow} />
      <Txt x={51.3} y={359.8} size={21.51} weight={W.extrabold} color={C.navy}>
        For Job Seekers
      </Txt>

      {ITEMS.map((item) => (
        <Fragment key={item.title}>
          <Box x={36.1} y={item.ruleY} w={2.8} h={item.ruleH} fill={C.navy} />
          <Txt x={53.4} y={item.titleY} size={14.12} weight={W.bold} color={C.navy}>
            {item.title}
          </Txt>
          <Para x={53.3} y={item.bodyY} size={12.24} lead={17.7} weight={W.light} lines={item.body} />
        </Fragment>
      ))}

      <Img src={`${ASSET}/photo-services.jpg`} x={731.4} y={124} w={458.3} h={460.6} />

      {CAPTION.map((line) => (
        <Txt key={line.text} x={line.x} y={line.y} size={13.4} color={C.navy}>
          {line.text}
        </Txt>
      ))}

      <Colophon companyY={805.6} siteY={805.6} />
    </Sheet>
  );
}
