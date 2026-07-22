import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';

const socials = [
  { href: 'https://www.facebook.com/profile.php?id=100092726993362', Icon: Facebook, label: 'Facebook' },
  { href: 'https://twitter.com/aajiveka', Icon: Twitter, label: 'Twitter' },
  { href: 'https://www.linkedin.com/company/aajiveka/', Icon: Linkedin, label: 'LinkedIn' },
  { href: 'https://www.youtube.com/@Aajiveka/about', Icon: Youtube, label: 'YouTube' },
  { href: 'https://www.instagram.com/aajiveka/', Icon: Instagram, label: 'Instagram' },
];

const columnA = [
  { label: 'About Us', to: '/about' },
  { label: 'Testimonial', to: '/testimonial' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Contact Us', to: '/contact' },
];
const columnB = [
  { label: 'Blog', to: '/blogs' },
  { label: 'Career with us', to: '/career' },
  { label: 'Services', to: '/resume' },
];
const columnC = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms and Conditions', to: '/terms' },
  { label: 'Subscription Benefits', to: '/subscription' },
];

/** Public footer — mirrors the FrontMaster.Master footer (bg #035A86). */
export function Footer() {
  return (
    <footer className="bg-primary-light py-10 text-white md:py-14">
      <div className="container">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <img src="/image/logo.svg" alt="Aajiveka" className="w-24 sm:w-32" />
            <h6 className="mt-4 font-normal">Follow us on :</h6>
            <ul className="mt-2 flex gap-3">
              {socials.map(({ href, Icon, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Footer navigation" className="contents">
            <FooterColumn links={columnA} />
            <FooterColumn links={columnB} />
            <FooterColumn links={columnC} />
          </nav>
        </div>
        <div className="mt-10 border-t border-white/15 pt-6 text-center text-sm text-white/80">
          © {new Date().getFullYear()} Aajiveka. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ links }: { links: { label: string; to: string }[] }) {
  return (
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l.label}>
          <Link to={l.to} className="text-white/90 transition hover:text-white">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
