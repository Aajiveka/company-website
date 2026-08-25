import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CircleCheckBig,
  FileText,
  FolderClosed,
  Mail,
  Search,
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

/**
 * Top-level navigation in the portal header.
 *
 * The August design replaced the marketing links (Companies / Services / Insights) with the
 * candidate's own working set — the three places they return to between visits — and gave
 * each one an icon. `match` is the path prefix that lights the item up, which is not always
 * the same as `to` (Jobs stays active while reading a job or filling in its apply form).
 */
export interface PortalNavItem {
  to: string;
  /** Path prefix that lights the item up. */
  match: string;
  label: string;
  icon: LucideIcon;
}

// The public marketing home is deliberately absent: the header logo already links to it, and
// a signed-in candidate's working set is what belongs in this bar.
export const PORTAL_NAV: PortalNavItem[] = [
  { to: '/jobs', match: '/jobs', label: 'Jobs', icon: Search },
  { to: '/candidate/applications', match: '/candidate/applications', label: 'Applications', icon: CircleCheckBig },
  { to: '/candidate/saved-jobs', match: '/candidate/saved-jobs', label: 'Saved Jobs', icon: Bookmark },
];
