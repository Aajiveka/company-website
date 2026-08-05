import { Seo } from '@/components/Seo';

import './brochure.css';
import { AboutAajiveka } from './sheets/AboutAajiveka';
import { Cover } from './sheets/Cover';
import { HowItWorks } from './sheets/HowItWorks';
import { Institutions } from './sheets/Institutions';
import { Philosophy } from './sheets/Philosophy';
import { Premium } from './sheets/Premium';
import { RecruitmentIndustry } from './sheets/RecruitmentIndustry';
import { Services } from './sheets/Services';
import { WhatWeOffer } from './sheets/WhatWeOffer';
import { WhyChoose } from './sheets/WhyChoose';

/**
 * Home screen rebuilt from the Aajiveka company brochure, page for page.
 *
 * Every sheet is the PDF's own 1190.551 x 841.890 pt canvas with the original
 * coordinates, Montserrat weights, colours and extracted artwork; the whole
 * thing scales from that canvas rather than reflowing, so the proportions hold
 * at any width. See brochure.css for the unit system.
 */
export default function BrochureHomePage() {
  return (
    <main className="bro-doc">
      <Seo
        title="Aajiveka — Job at your door step"
        description="Aajiveka is India's next-gen job portal: advanced job search, an AI-powered resume builder, and personalised career guidance for job seekers and employers."
        path="/"
      />
      <Cover />
      <AboutAajiveka />
      <Philosophy />
      <HowItWorks />
      <Services />
      <WhyChoose />
      <RecruitmentIndustry />
      <Premium />
      <WhatWeOffer />
      <Institutions />
    </main>
  );
}
