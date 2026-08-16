import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Code2, Globe, Mail, Pencil, Phone } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, CardBody, CardHeader } from './primitives';
import { PORTAL_MODULES } from '../portalModules';
import type { PortalProfile } from '../usePortalProfile';

/**
 * Left rail shared by every portal screen. The contact card (Figma 1:748) is always
 * on top; what follows depends on the screen — module screens show the "My Modules"
 * tile grid (Figma 1:683) while the profile page shows its at-a-glance cards. The
 * caller passes that lower half in rather than the rail guessing from the route.
 *
 * 320px wide on desktop; on tablet and below it stacks above the module content.
 */
export function PortalSidebar({ profile, children }: { profile: PortalProfile; children?: ReactNode }) {
  return (
    <aside className="w-full space-y-4 lg:w-80 lg:shrink-0">
      <ContactCard profile={profile} />
      {children ?? <ModuleTiles />}
    </aside>
  );
}

function ContactCard({ profile }: { profile: PortalProfile }) {
  const rows = [
    { icon: Mail, value: profile.email, placeholder: 'Email address', href: profile.email && `mailto:${profile.email}` },
    { icon: Phone, value: profile.phone, placeholder: 'Phone number', href: profile.phone && `tel:${profile.phone}` },
    {
      icon: Globe,
      value: profile.linkedIn,
      placeholder: 'LinkedIn profile',
      // The label is stored protocol-less for display, so the scheme goes back on the href.
      href: profile.linkedIn && `https://${profile.linkedIn}`,
    },
    {
      icon: Code2,
      value: profile.gitHub,
      placeholder: 'GitHub profile',
      href: profile.gitHub && `https://${profile.gitHub}`,
    },
  ];

  const anyMissing = rows.some((r) => !r.value);

  return (
    <Card id="contact">
      <CardHeader
        title="Contact Information"
        action={
          <Link
            to="/candidate/account"
            className="inline-flex items-center gap-1 text-xs font-semibold text-aj-blue hover:text-aj-blue-hover"
          >
            <Pencil className="size-3.5" aria-hidden />
            {anyMissing ? 'Add' : 'Edit'}
          </Link>
        }
      />
      <CardBody className="space-y-2.5">
        {rows.map(({ icon: Icon, value, placeholder, href }) => (
          <div key={placeholder} className="flex items-center gap-2.5 text-sm">
            <Icon className="size-4 shrink-0 text-aj-blue" aria-hidden />
            {value ? (
              <a
                href={href || undefined}
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noreferrer' : undefined}
                className="truncate text-slate-700 hover:text-aj-blue dark:text-gray-200"
              >
                {value}
              </a>
            ) : (
              <span className="italic text-slate-400">{placeholder}</span>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export function ModuleTiles() {
  const { pathname } = useLocation();

  return (
    <Card id="modules">
      <CardHeader title="My Modules" />
      <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
        {PORTAL_MODULES.map(({ to, label, blurb, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex flex-col gap-2 rounded-xl border p-3 transition-colors',
                active
                  ? 'border-aj-blue bg-blue-50 dark:bg-blue-950'
                  : 'border-aj-line-soft hover:border-aj-blue hover:bg-aj-surface-soft dark:border-gray-700 dark:hover:bg-gray-700',
              )}
            >
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg transition-colors',
                  active ? 'bg-aj-blue text-white' : 'bg-aj-canvas text-aj-blue dark:bg-gray-700',
                )}
              >
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span className="font-display text-[13px] font-bold leading-tight text-slate-800 dark:text-gray-100">
                {label}
              </span>
              <span className="text-[11px] leading-snug text-slate-500 dark:text-gray-400">{blurb}</span>
            </Link>
          );
        })}
      </CardBody>
    </Card>
  );
}
