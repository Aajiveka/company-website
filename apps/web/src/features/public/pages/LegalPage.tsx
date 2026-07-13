interface Section {
  heading: string;
  body: string[];
}

const PRIVACY: Section[] = [
  {
    heading: 'Introduction',
    body: [
      'Aajiveka ("we", "us") is committed to protecting the privacy of every candidate and employer who uses our platform. This Privacy Policy explains what information we collect, how we use it, and the choices you have.',
    ],
  },
  {
    heading: 'Information We Collect',
    body: [
      'We collect information you provide directly — such as your name, contact details, resume, education and work history — as well as usage data generated while you interact with the platform.',
    ],
  },
  {
    heading: 'How We Use Your Information',
    body: [
      'Your information is used to match you with relevant job opportunities, communicate about applications and interviews, and improve the platform. We never sell candidate databases to corporates or third parties.',
    ],
  },
  {
    heading: 'Data Security',
    body: [
      'We employ robust encryption and secure servers to protect your data. Access is restricted to authorized personnel and governed by role-based access controls.',
    ],
  },
  {
    heading: 'Your Rights',
    body: [
      'You may access, update or request deletion of your personal information at any time by contacting info@aajiveka.com.',
    ],
  },
];

const TERMS: Section[] = [
  {
    heading: 'Acceptance of Terms',
    body: [
      'By accessing or using the Aajiveka platform, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.',
    ],
  },
  {
    heading: 'Use of the Platform',
    body: [
      'You agree to provide accurate information, keep your account credentials secure, and use the platform only for lawful recruitment and job-search purposes.',
    ],
  },
  {
    heading: 'Subscriptions and Payments',
    body: [
      'Paid plans are billed as described on the Pricing page. Payments are processed securely through our payment partner. Fees are non-refundable except where required by law.',
    ],
  },
  {
    heading: 'Intellectual Property',
    body: [
      'All content, trademarks and software on the platform are the property of Aajiveka and may not be reproduced without permission.',
    ],
  },
  {
    heading: 'Limitation of Liability',
    body: [
      'Aajiveka is not liable for hiring decisions or the accuracy of information provided by employers or candidates. The platform is provided on an "as is" basis.',
    ],
  },
];

/** Shared legal/content layout for Privacy Policy and Terms & Conditions. */
export default function LegalPage({ variant }: { variant: 'privacy' | 'terms' }) {
  const isPrivacy = variant === 'privacy';
  const sections = isPrivacy ? PRIVACY : TERMS;

  return (
    <section className="pt-28 pb-16">
      <div className="container max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-navy">
          {isPrivacy ? 'Privacy Policy' : 'Terms and Conditions'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: July 2026</p>
        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-xl">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-2 text-gray-600">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
