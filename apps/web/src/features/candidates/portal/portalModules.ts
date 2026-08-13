import {
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  FolderClosed,
  Mail,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * The "My Modules" tiles in the portal sidebar, in Figma order (ModuleTiles, node 1:683).
 *
 * Every tile points at a route that already existed before the redesign, so the
 * redesign changes the presentation of these modules, not the URLs users have
 * bookmarked. `/candidate/account` is the one genuinely new route — the Figma
 * consolidates change-password and the privacy/danger-zone controls behind a
 * single tabbed Account Settings screen.
 */
export interface PortalModule {
  to: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
}

export const PORTAL_MODULES: PortalModule[] = [
  { to: '/candidate/interviews', label: 'Interviews', blurb: 'Upcoming, past & calendar', icon: CalendarDays },
  { to: '/candidate/documents', label: 'Documents', blurb: 'Resume, certs & more', icon: FolderClosed },
  { to: '/candidate/referrals', label: 'Refer a Friend', blurb: 'Invite & earn rewards', icon: Users },
  { to: '/candidate/account', label: 'Account Settings', blurb: 'Profile, security & privacy', icon: Settings },
  {
    to: '/candidate/tracker',
    label: 'Application Tracker',
    blurb: 'Kanban — all your apply jobs',
    icon: BriefcaseBusiness,
  },
  { to: '/candidate/resume-builder', label: 'Resume Builder', blurb: 'Build, score & export PDF', icon: FileText },
  { to: '/candidate/notifications', label: 'Email Preferences', blurb: 'Alerts & notification config', icon: Mail },
];

/** Top-level site navigation shown in the portal header (Figma node 1:778). */
export const PORTAL_NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/jobs', label: 'Jobs' },
  { to: '/search?tab=companies', label: 'Companies' },
  { to: '/pricing', label: 'Services' },
  { to: '/salary-insights', label: 'Insights' },
] as const;
