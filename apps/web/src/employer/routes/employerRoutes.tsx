import type { RouteObject } from 'react-router-dom';
import { EmployerLayout } from '@/employer/layouts/EmployerLayout';
import {
  DashboardPage,
  CompleteProfilePage,
  JobListPage,
  AddJobPage,
  BulkImportPage,
  ApplicantListPage,
  ApplicantProfilePage,
  ComparePage,
  AnalyticsPage,
  BillingPage,
  MessagesPage,
  NotificationsPage,
  SettingsPage,
} from '@/employer/pages';

/** Replaces legacy /company/* client pages with the Employer Portal UI. */
export const employerRouteTree: RouteObject = {
  element: <EmployerLayout />,
  children: [
    { path: '/company', element: <DashboardPage /> },
    { path: '/company/profile', element: <CompleteProfilePage /> },
    { path: '/company/jobs', element: <JobListPage key="jobs-all" /> },
    { path: '/company/jobs/drafts', element: <JobListPage key="jobs-draft" /> },
    { path: '/company/jobs/archived', element: <JobListPage key="jobs-archived" /> },
    { path: '/company/post-job', element: <AddJobPage key="job-create" /> },
    { path: '/company/jobs/:id/edit', element: <AddJobPage key="job-edit" /> },
    { path: '/company/bulk-import', element: <BulkImportPage /> },
    { path: '/company/applicants', element: <ApplicantListPage /> },
    { path: '/company/applicants/shortlisted', element: <ApplicantListPage /> },
    { path: '/company/applicants/interviews', element: <ApplicantListPage /> },
    { path: '/company/applicants/hired', element: <ApplicantListPage /> },
    { path: '/company/applicants/rejected', element: <ApplicantListPage /> },
    { path: '/company/applicants/:id', element: <ApplicantProfilePage /> },
    { path: '/company/compare-candidates', element: <ComparePage /> },
    { path: '/company/analytics', element: <AnalyticsPage /> },
    { path: '/company/messages', element: <MessagesPage /> },
    { path: '/company/billing', element: <BillingPage /> },
    { path: '/company/notifications', element: <NotificationsPage /> },
    { path: '/company/settings', element: <SettingsPage /> },
  ],
};
