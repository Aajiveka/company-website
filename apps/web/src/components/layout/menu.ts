import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  FileDown,
  FileText,
  Gift,
  Heart,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  PenTool,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  Target,
  CalendarDays,
  Clock,
  TrendingUp,
  Building,
  Kanban,
  type LucideIcon,
} from 'lucide-react';
import { Role, type RoleId } from '@/types/roles';

export interface MenuItem {
  /** Translation key under the "common" namespace → sidebar.* */
  i18nKey: string;
  /** Primary route — required for leaf items; groups use this as the landing path. */
  to: string;
  icon: LucideIcon;
  /** Nested under-page links (shown as expandable submenu). */
  children?: MenuItem[];
}

/**
 * Role-gated sidebar menus. Labels are i18n keys resolved at render time
 * via `t(`sidebar.${item.i18nKey}`)`.
 *
 * Employer (Client) items that are "under" a main page are nested as children
 * so the sidebar stays short.
 */
const MENUS: Record<RoleId, MenuItem[]> = {
  [Role.Subscriber]: [
    { i18nKey: 'myProfile', to: '/candidate/profile', icon: LayoutDashboard },
    { i18nKey: 'cvManager', to: '/candidate/cv-manager', icon: FileText },
    { i18nKey: 'appliedJobs', to: '/candidate/applied-jobs', icon: Briefcase },
    { i18nKey: 'interviews', to: '/candidate/interviews', icon: CalendarCheck },
    { i18nKey: 'savedJobs', to: '/candidate/saved-jobs', icon: Heart },
    { i18nKey: 'resumeExport', to: '/candidate/resume', icon: FileDown },
    { i18nKey: 'jobAlerts', to: '/candidate/job-alerts', icon: Bell },
    { i18nKey: 'documents', to: '/candidate/documents', icon: Upload },
    { i18nKey: 'resumeBuilder', to: '/candidate/resume-builder', icon: PenTool },
    { i18nKey: 'assessments', to: '/candidate/assessments', icon: ClipboardCheck },
    { i18nKey: 'referrals', to: '/candidate/referrals', icon: Gift },
    { i18nKey: 'savedSearches', to: '/candidate/saved-searches', icon: Search },
    { i18nKey: 'skillGap', to: '/candidate/skill-gap', icon: Target },
    { i18nKey: 'interviewCalendar', to: '/candidate/interview-calendar', icon: CalendarDays },
    { i18nKey: 'activityTimeline', to: '/candidate/activity', icon: Clock },
    { i18nKey: 'careerPath', to: '/candidate/career-path', icon: TrendingUp },
    { i18nKey: 'compareCompanies', to: '/candidate/compare-companies', icon: Building },
    { i18nKey: 'applicationTracker', to: '/candidate/tracker', icon: Kanban },
    { i18nKey: 'messages', to: '/candidate/messages', icon: MessageSquare },
    { i18nKey: 'notificationSettings', to: '/candidate/notifications', icon: Bell },
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
  // Employer panel uses apps/web/src/employer/constants/menu.ts (EmployerLayout).
  [Role.Client]: [],
  [Role.Admin]: [
    { i18nKey: 'adminDashboard', to: '/admin', icon: BarChart3 },
    { i18nKey: 'userManagement', to: '/admin/users', icon: Users },
    { i18nKey: 'jobModeration', to: '/admin/jobs', icon: ShieldCheck },
    { i18nKey: 'blogCms', to: '/admin/blog', icon: PenTool },
    { i18nKey: 'companyProfile', to: '/company/profile', icon: Building2 },
    { i18nKey: 'candidates', to: '/recruitment/candidates', icon: Users },
    { i18nKey: 'manageJobs', to: '/company/jobs', icon: Briefcase },
    { i18nKey: 'applicants', to: '/company/applicants', icon: Users },
    { i18nKey: 'adminSettings', to: '/admin/settings', icon: Settings },
  ],
  [Role.Subscription]: [{ i18nKey: 'pricing', to: '/pricing', icon: FileText }],
};

export const getMenuForRole = (role: RoleId): MenuItem[] => MENUS[role] ?? [];

/** Flat list of all leaf + parent routes (for command palette / breadcrumbs helpers). */
export function flattenMenu(items: MenuItem[]): MenuItem[] {
  const out: MenuItem[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children?.length) out.push(...flattenMenu(item.children));
  }
  return out;
}
