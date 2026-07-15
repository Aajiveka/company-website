import {
  BadgeCheck,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  FileCheck2,
  FileText,
  KeyRound,
  LayoutDashboard,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Role, type RoleId } from '@/types/roles';

export interface MenuItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

/**
 * Role-gated sidebar menus. In the reference these come from
 * `spMakeTreeMenu` / `tblSecMenuHierarchyRoles`; here they are declared
 * per role and can later be hydrated from the API's /menu endpoint.
 */
const MENUS: Record<RoleId, MenuItem[]> = {
  [Role.Subscriber]: [
    { label: 'My Profile', to: '/candidate/profile', icon: LayoutDashboard },
    { label: 'CV Manager', to: '/candidate/cv-manager', icon: FileText },
    { label: 'Applied Jobs', to: '/candidate/applied-jobs', icon: Briefcase },
    { label: 'Job Alerts', to: '/candidate/job-alerts', icon: Bell },
    { label: 'Documents', to: '/candidate/documents', icon: Upload },
    { label: 'Membership', to: '/candidate/subscription', icon: BadgeCheck },
    { label: 'Change Password', to: '/candidate/change-password', icon: KeyRound },
  ],
  [Role.QC1]: [
    { label: 'QC Dashboard', to: '/recruitment/qc1', icon: LayoutDashboard },
    { label: 'Candidates', to: '/recruitment/candidates', icon: Users },
    { label: 'Documents', to: '/recruitment/documents', icon: FileCheck2 },
    { label: 'Interviews', to: '/recruitment/interviews', icon: CalendarClock },
  ],
  [Role.QC2]: [
    { label: 'Candidates', to: '/recruitment/candidates', icon: Users },
    { label: 'Documents', to: '/recruitment/documents', icon: FileCheck2 },
  ],
  [Role.Client]: [
    { label: 'Company Profile', to: '/company/profile', icon: Building2 },
    { label: 'Manage Jobs', to: '/company/jobs', icon: Briefcase },
    { label: 'Post a Job', to: '/company/post-job', icon: FileText },
    { label: 'Applicants', to: '/company/applicants', icon: Users },
  ],
  [Role.Admin]: [
    { label: 'Company Profile', to: '/company/profile', icon: Building2 },
    { label: 'Candidates', to: '/recruitment/candidates', icon: Users },
    { label: 'Manage Jobs', to: '/company/jobs', icon: Briefcase },
  ],
  [Role.Subscription]: [{ label: 'Pricing', to: '/pricing', icon: FileText }],
};

export const getMenuForRole = (role: RoleId): MenuItem[] => MENUS[role] ?? [];
