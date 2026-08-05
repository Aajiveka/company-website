import { Fragment } from 'react';

import { Colophon, Masthead } from '../Chrome';
import { Box, Para, Sheet, Txt } from '../primitives';
import { C, W } from '../tokens';

/**
 * Five feature columns inside the grey band.
 *
 * Note on column 1: the source PDF stacks "At Aajiveka, we believe in" and
 * "providing personalized assistance" at the same y, which prints as an
 * unreadable overlap and leaves a hole further down. The lines are set here on
 * the column's own 16.12 pt leading, so the copy reads correctly and still ends
 * on "best possible way." at exactly the y the PDF puts it.
 */
const COLUMNS = [
  {
    bulletX: 33.7,
    titleX: 47.9,
    bodyX: 49.3,
    title: ['Personalized AI', 'Assistance'],
    body: [
      'At Aajiveka, we believe in ',
      'providing personalized assistance ',
      'to each and every candidate. ',
      'Unlike just getting your reviews or ',
      'just onboarding the candidates on ',
      'the recruitment portal, we ',
      'assigned dedicated AI-powered ',
      'assistants to candidates to help ',
      'them create impressive resumes ',
      'for free. This ensures that ',
      'candidates are able to showcase ',
      'their skills and experience in the ',
      'best possible way.',
    ],
  },
  {
    bulletX: 265.6,
    titleX: 282.1,
    bodyX: 281.2,
    title: ['Skill-Based Job', 'Matching'],
    body: [
      'Our recruitment process is ',
      'focused on matching the skills of ',
      'the candidates with the job ',
      'requirements. To make this ',
      'process simpler and quicker, we ',
      'allow candidates to apply various ',
      'filters and quickly narrow down ',
      'the potential job options that are ',
      'best suited to their skills and ',
      'experience.',
    ],
  },
  {
    bulletX: 497.4,
    titleX: 512.1,
    bodyX: 513.0,
    title: ['Privacy and', 'Security'],
    body: [
      'At Aajiveka, we understand that ',
      'privacy and security are the top ',
      'concerns for candidates, therefore ',
      "we do not sell candidates' ",
      'databases to corporates and big ',
      'firms. Also, we take all security ',
      'measures to ensure that the ',
      'information is kept secure and ',
      'confidential.',
    ],
  },
  {
    bulletX: 729.3,
    titleX: 744.2,
    bodyX: 744.9,
    title: ['Easy to Get', 'Started'],
    body: [
      'Getting started with Aajiveka is ',
      'simple and easy. Candidates can ',
      'sign up for our app and start ',
      'applying for jobs right away by ',
      'uploading a resume and ',
      'documents. ',
    ],
  },
  {
    bulletX: 961.2,
    titleX: 976.1,
    bodyX: 976.7,
    title: ['Comprehensive', 'Support'],
    body: [
      'Our AI-powered support team is ',
      'available around the clock to ',
      'provide comprehensive support to ',
      'candidates. So at Aajiveka, you ',
      "don't have to wait for the ",
      'counselors to pick up your call. ',
      'Just enter our portal and our ',
      'chatbot is available to answer all ',
      'questions including providing ',
      'guidance, suggesting career ',
      'options, writing resumes, offering ',
      'feedback, career courses, and ',
      'more.',
    ],
  },
] as const;

const INTRO = [
  'At Aajiveka, we take pride in being at the forefront of the recruitment industry, providing cutting-edge solutions to both candidates and companies. With a mission to create a seamless and ecient hiring process, we have ',
  'built a reputation for excellence that sets us apart from the competition. Here are the key features that make Aajiveka stand above in the industry:',
] as const;

const OUTRO = [
  'With our cutting-edge technology, comprehensive job search services, and commitment to customer-centricity and inclusivity, we are setting a new standard for the job search process in India. ',
  "So if you're looking to take your career to the next level, or find the best talent for your organization, look no further than Aajiveka. Join our platform today and discover your future!",
] as const;

/** Brochure page 7 — What Makes Us Best In the Recruitment Industry. */
export function RecruitmentIndustry() {
  return (
    <Sheet label="What makes us best in the recruitment industry">
      <Masthead titleY={20.3} cinY={21.5} tollFreeY={40.5} illustrationY={13.7} badgeY={13.1} />

      <Box x={0} y={348.6} w={1190.551} h={288.8} fill={C.band} />

      <Txt x={33.8} y={163.6} size={34.12} weight={W.medium}>
        What Makes Us Best In the
      </Txt>
      <Txt x={33.1} y={198.2} size={48.62} weight={W.extrabold} color={C.navy}>
        RECRUITMENT INDUSTRY?
      </Txt>

      <Para x={33.1} y={271.6} size={9.92} lead={16.2} lines={INTRO} />

      {COLUMNS.map((col) => (
        <Fragment key={col.titleX}>
          <Txt x={col.bulletX} y={365.9} size={15.83} weight={W.bold} color={C.navy}>
            •
          </Txt>
          <Txt x={col.titleX} y={367} size={15.83} weight={W.bold} color={C.navy}>
            {col.title[0]}
          </Txt>
          <Txt x={col.titleX} y={386.3} size={15.83} weight={W.bold} color={C.navy}>
            {col.title[1]}
          </Txt>
          <Para x={col.bodyX} y={416} size={9.92} lead={16.12} lines={col.body} />
        </Fragment>
      ))}

      <Para x={33.7} y={654.2} size={9.92} lead={16.1} lines={OUTRO} />

      <Colophon companyY={805.9} siteY={805.9} barY={789.5} />
    </Sheet>
  );
}
