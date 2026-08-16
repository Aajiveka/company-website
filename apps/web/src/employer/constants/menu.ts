import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  UploadCloud,
  List,
  FileEdit,
  Archive,
  Users,
  UserCheck,
  CalendarClock,
  BadgeCheck,
  UserX,
  GitCompare,
  BarChart3,
  MessageSquare,
  Receipt,
  Bell,
  Settings,
} from 'lucide-react';
import { employerPaths } from './paths';

export interface EmployerMenuChild {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  badgeKey?: string;
}

export interface EmployerMenuItem {
  id: string;
  label: string;
  to?: string;
  icon: LucideIcon;
  badgeKey?: string;
  children?: EmployerMenuChild[];
}

export const EMPLOYER_MENU: EmployerMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', to: employerPaths.dashboard, icon: LayoutDashboard },
  {
    id: 'jobs',
    label: 'Manage Jobs',
    to: employerPaths.manageJobs,
    icon: Briefcase,
    children: [
      { id: 'add-job', label: 'Add Job', to: employerPaths.addJob, icon: PlusCircle },
      { id: 'bulk', label: 'Bulk Import', to: employerPaths.bulkImport, icon: UploadCloud },
      { id: 'list', label: 'Job List', to: employerPaths.jobList, icon: List },
      { id: 'drafts', label: 'Draft Jobs', to: employerPaths.draftJobs, icon: FileEdit },
      { id: 'archived', label: 'Archived Jobs', to: employerPaths.archivedJobs, icon: Archive },
    ],
  },
  {
    id: 'applicants',
    label: 'Applicants',
    to: employerPaths.applicants,
    icon: Users,
    badgeKey: 'applicants',
    children: [
      { id: 'all', label: 'All Applicants', to: employerPaths.applicants, icon: Users },
      { id: 'shortlisted', label: 'Shortlisted', to: employerPaths.shortlisted, icon: UserCheck },
      { id: 'interview', label: 'Interview', to: employerPaths.interviews, icon: CalendarClock },
      { id: 'hired', label: 'Hired', to: employerPaths.hired, icon: BadgeCheck },
      { id: 'rejected', label: 'Rejected', to: employerPaths.rejected, icon: UserX },
    ],
  },
  { id: 'compare', label: 'Compare Candidates', to: employerPaths.compare, icon: GitCompare },
  { id: 'analytics', label: 'Analytics & Reports', to: employerPaths.analytics, icon: BarChart3 },
  { id: 'messages', label: 'Messages', to: employerPaths.messages, icon: MessageSquare, badgeKey: 'messages' },
  { id: 'billing', label: 'Billing & Invoices', to: employerPaths.billing, icon: Receipt },
  { id: 'notifications', label: 'Notifications', to: employerPaths.notifications, icon: Bell, badgeKey: 'notifications' },
  { id: 'settings', label: 'Settings', to: employerPaths.settings, icon: Settings },
];
