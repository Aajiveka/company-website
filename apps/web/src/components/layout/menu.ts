import {
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
  /** Translation key under the "common" namespace → sidebar.* */
  i18nKey: string;
  to: string;
  icon: LucideIcon;
}

/**
 * Role-gated sidebar menus. Labels are now i18n keys resolved at render time
 * via `t(`sidebar.${item.i18nKey}`)`.
 */
const MENUS: Record<RoleId, MenuItem[]> = {
  [Role.Subscriber]: [
    { i18nKey: 'myProfile', to: '/candidate/profile', icon: LayoutDashboard },
    { i18nKey: 'cvManager', to: '/candidate/cv-manager', icon: FileText },
    { i18nKey: 'appliedJobs', to: '/candidate/applied-jobs', icon: Briefcase },
    { i18nKey: 'jobAlerts', to: '/candidate/job-alerts', icon: Bell },
    { i18nKey: 'documents', to: '/candidate/documents', icon: Upload },
    { i18nKey: 'changePassword', to: '/candidate/change-password', icon: KeyRound },
  ],
  [Role.QC1]: [
    { i18nKey: 'qcDashboard', to: '/recruitment/qc1', icon: LayoutDashboard },
    { i18nKey: 'candidates', to: '/recruitment/candidates', icon: Users },
    { i18nKey: 'documents', to: '/recruitment/documents', icon: FileCheck2 },
    { i18nKey: 'interviews', to: '/recruitment/interviews', icon: CalendarClock },
  ],
  [Role.QC2]: [
    { i18nKey: 'candidates', to: '/recruitment/candidates', icon: Users },
    { i18nKey: 'documents', to: '/recruitment/documents', icon: FileCheck2 },
  ],
  [Role.Client]: [
    { i18nKey: 'companyProfile', to: '/company/profile', icon: Building2 },
    { i18nKey: 'manageJobs', to: '/company/jobs', icon: Briefcase },
    { i18nKey: 'postAJob', to: '/company/post-job', icon: FileText },
    { i18nKey: 'applicants', to: '/company/applicants', icon: Users },
  ],
  [Role.Admin]: [
    { i18nKey: 'companyProfile', to: '/company/profile', icon: Building2 },
    { i18nKey: 'candidates', to: '/recruitment/candidates', icon: Users },
    { i18nKey: 'manageJobs', to: '/company/jobs', icon: Briefcase },
  ],
  [Role.Subscription]: [{ i18nKey: 'pricing', to: '/pricing', icon: FileText }],
};

export const getMenuForRole = (role: RoleId): MenuItem[] => MENUS[role] ?? [];
