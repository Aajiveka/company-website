import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RouteErrorFallback, DashboardErrorFallback } from '@/components/ErrorFallback';
import { Loader } from '@/components/ui';
import { Role } from '@/types/roles';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import { employerRouteTree } from '@/employer/routes/employerRoutes';

// Route-level code splitting — each page is its own chunk.
const HomePage = lazy(() => import('@/features/home/HomePage'));
const BrochureHomePage = lazy(() => import('@/features/home/brochure/BrochureHomePage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));

// Prefetch critical route chunks on idle so they're ready when the user navigates.
const prefetchRoutes = () => {
  void import('@/features/home/HomePage');
  void import('@/features/jobs/pages/JobSearchPage');
  void import('@/features/auth/pages/LoginPage');
};
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(prefetchRoutes);
  } else {
    setTimeout(prefetchRoutes, 2000);
  }
}
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
// Candidate portal — the "Aajiveka UI" redesign. These screens render inside their own
// shell (header + profile banner + module rail) rather than DashboardLayout, which is what
// the design specifies and what lets the banner survive navigation between modules.
const CandidatePortalLayout = lazy(() => import('@/features/candidates/portal/CandidatePortalLayout'));
const ProfileOverviewPage = lazy(() => import('@/features/candidates/portal/pages/ProfileOverviewPage'));
const ProfileWizardPage = lazy(() => import('@/features/candidates/portal/pages/ProfileWizardPage'));
const PortalTrackerPage = lazy(() => import('@/features/candidates/portal/pages/ApplicationTrackerPage'));
const PortalInterviewsPage = lazy(() => import('@/features/candidates/portal/pages/InterviewsPage'));
const PortalDocumentsPage = lazy(() => import('@/features/candidates/portal/pages/DocumentsPage'));
const PortalReferPage = lazy(() => import('@/features/candidates/portal/pages/ReferPage'));
const PortalAccountPage = lazy(() => import('@/features/candidates/portal/pages/AccountSettingsPage'));
const PortalEmailPrefsPage = lazy(() => import('@/features/candidates/portal/pages/EmailPreferencesPage'));
const PortalResumeBuilderPage = lazy(() => import('@/features/candidates/portal/pages/ResumeBuilderPage'));

const CandidateProfilePage = lazy(() => import('@/features/candidates/pages/CandidateProfilePage'));
const CvManagerPage = lazy(() => import('@/features/candidates/pages/CvManagerPage'));
const AppliedJobsPage = lazy(() => import('@/features/candidates/pages/AppliedJobsPage'));
const SavedJobsPage = lazy(() => import('@/features/candidates/pages/SavedJobsPage'));
const ResumePreviewPage = lazy(() => import('@/features/candidates/pages/ResumePreviewPage'));
const JobAlertsPage = lazy(() => import('@/features/candidates/pages/JobAlertsPage'));
const ChangePasswordPage = lazy(() => import('@/features/candidates/pages/ChangePasswordPage'));
const CandidatesListPage = lazy(() => import('@/features/recruitment/pages/CandidatesListPage'));
const CandidateDetailsPage = lazy(() => import('@/features/recruitment/pages/CandidateDetailsPage'));
const QC1DashboardPage = lazy(() => import('@/features/recruitment/pages/QC1DashboardPage'));
const InterviewsPage = lazy(() => import('@/features/recruitment/pages/InterviewsPage'));
const DocumentReviewPage = lazy(() => import('@/features/recruitment/pages/DocumentReviewPage'));

// Public marketing pages
const AboutPage = lazy(() => import('@/features/public/pages/AboutPage'));
const ContactPage = lazy(() => import('@/features/public/pages/ContactPage'));
const CareerPage = lazy(() => import('@/features/public/pages/CareerPage'));
const PricingPage = lazy(() => import('@/features/public/pages/PricingPage'));
const SubscriptionPage = lazy(() => import('@/features/public/pages/SubscriptionPage'));
const ResumePage = lazy(() => import('@/features/public/pages/ResumePage'));
const TestimonialPage = lazy(() => import('@/features/public/pages/TestimonialPage'));
const LegalPage = lazy(() => import('@/features/public/pages/LegalPage'));
const BlogsPage = lazy(() => import('@/features/public/pages/BlogsPage'));
const BlogDetailPage = lazy(() => import('@/features/public/pages/BlogDetailPage'));
const HelpPage = lazy(() => import('@/features/public/pages/HelpPage'));
const CompanyReviewsPage = lazy(() => import('@/features/public/pages/CompanyReviewsPage'));

const JobSearchPage = lazy(() => import('@/features/jobs/pages/JobSearchPage'));
const JobDetailPage = lazy(() => import('@/features/jobs/pages/JobDetailPage'));
const SearchResultsPage = lazy(() => import('@/features/jobs/pages/SearchResultsPage'));

const PaymentReturnPage = lazy(() => import('@/features/payments/pages/PaymentReturnPage'));
const MembershipPage = lazy(() => import('@/features/payments/pages/MembershipPage'));

const PublicProfilePage = lazy(() => import('@/features/candidates/pages/PublicProfilePage'));
const CompanyPublicPage = lazy(() => import('@/features/clients/pages/CompanyPublicPage'));
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const NotificationsPage = lazy(() => import('@/features/candidates/pages/NotificationsPage'));
const SalaryInsightsPage = lazy(() => import('@/features/public/pages/SalaryInsightsPage'));
const AdminUsersPage = lazy(() => import('@/features/admin/pages/AdminUsersPage'));
const AdminJobsPage = lazy(() => import('@/features/admin/pages/AdminJobsPage'));
const AssessmentsListPage = lazy(() => import('@/features/candidates/pages/AssessmentsListPage'));
const SkillAssessmentPage = lazy(() => import('@/features/candidates/pages/SkillAssessmentPage'));
const BlogCmsPage = lazy(() => import('@/features/admin/pages/BlogCmsPage'));
const MessagingPage = lazy(() => import('@/features/messaging/MessagingPage'));
const SavedSearchesPage = lazy(() => import('@/features/candidates/pages/SavedSearchesPage'));
const SkillGapPage = lazy(() => import('@/features/candidates/pages/SkillGapPage'));
const InterviewCalendarPage = lazy(() => import('@/features/candidates/pages/InterviewCalendarPage'));
const ActivityTimelinePage = lazy(() => import('@/features/candidates/pages/ActivityTimelinePage'));
const CareerPathPage = lazy(() => import('@/features/candidates/pages/CareerPathPage'));
const CompanyComparisonPage = lazy(() => import('@/features/candidates/pages/CompanyComparisonPage'));
const DashboardHome = lazy(() => import('@/features/dashboard/DashboardHome'));
const AdminSettingsPage = lazy(() => import('@/features/admin/pages/AdminSettingsPage'));
const ReportsPage = lazy(() => import('@/features/admin/pages/ReportsPage'));
const NotFoundPage = lazy(() => import('@/features/misc/NotFoundPage'));

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<Loader />}>{node}</Suspense>;

export const router = createBrowserRouter([
  {
    element: <AnalyticsProvider />,
    children: [
      // Brochure home — a full-bleed, page-for-page rebuild of the printed
      // company brochure, so it deliberately renders without the site chrome.
      {
        path: '/brochure',
        element: withSuspense(<BrochureHomePage />),
        errorElement: <RouteErrorFallback />,
      },
      {
        element: <PublicLayout />,
        errorElement: <RouteErrorFallback />,
        children: [
          { path: '/', element: withSuspense(<HomePage />) },
          { path: '/login', element: withSuspense(<LoginPage />) },
          { path: '/register', element: withSuspense(<RegisterPage />) },
          { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
          { path: '/reset-password', element: withSuspense(<ResetPasswordPage />) },
          { path: '/jobs', element: withSuspense(<JobSearchPage />) },
          { path: '/jobs/:id', element: withSuspense(<JobDetailPage />) },
          { path: '/search', element: withSuspense(<SearchResultsPage />) },
          { path: '/candidates/:id', element: withSuspense(<PublicProfilePage />) },
          { path: '/companies/:id', element: withSuspense(<CompanyPublicPage />) },
          { path: '/companies/:id/reviews', element: withSuspense(<CompanyReviewsPage />) },
          { path: '/pricing', element: withSuspense(<PricingPage />) },
          { path: '/about', element: withSuspense(<AboutPage />) },
          { path: '/contact', element: withSuspense(<ContactPage />) },
          { path: '/help', element: withSuspense(<HelpPage />) },
          { path: '/blogs', element: withSuspense(<BlogsPage />) },
          { path: '/blogs/:slug', element: withSuspense(<BlogDetailPage />) },
          { path: '/career', element: withSuspense(<CareerPage />) },
          { path: '/testimonial', element: withSuspense(<TestimonialPage />) },
          { path: '/privacy', element: withSuspense(<LegalPage variant="privacy" />) },
          { path: '/terms', element: withSuspense(<LegalPage variant="terms" />) },
          { path: '/subscription', element: withSuspense(<SubscriptionPage />) },
          { path: '/resume', element: withSuspense(<ResumePage />) },
          { path: '/salary-insights', element: withSuspense(<SalaryInsightsPage />) },
          { path: '/payment/return', element: withSuspense(<PaymentReturnPage />) },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          // Candidate portal — the redesigned screens, in their own shell.
          {
            element: <ProtectedRoute allow={[Role.Subscriber]} />,
            children: [
              {
                element: <CandidatePortalLayout />,
                errorElement: <DashboardErrorFallback />,
                children: [
                  { path: '/candidate/profile', element: withSuspense(<ProfileOverviewPage />) },
                  { path: '/candidate/onboarding', element: withSuspense(<ProfileWizardPage />) },
                  { path: '/candidate/tracker', element: withSuspense(<PortalTrackerPage />) },
                  { path: '/candidate/interviews', element: withSuspense(<PortalInterviewsPage />) },
                  { path: '/candidate/documents', element: withSuspense(<PortalDocumentsPage />) },
                  { path: '/candidate/referrals', element: withSuspense(<PortalReferPage />) },
                  { path: '/candidate/account', element: withSuspense(<PortalAccountPage />) },
                  { path: '/candidate/notifications', element: withSuspense(<PortalEmailPrefsPage />) },
                  { path: '/candidate/resume-builder', element: withSuspense(<PortalResumeBuilderPage />) },
                ],
              },
            ],
          },
          {
            element: <DashboardLayout />,
            errorElement: <DashboardErrorFallback />,
            children: [
              // Candidate — screens the redesign does not cover, still on the dashboard shell.
              {
                element: <ProtectedRoute allow={[Role.Subscriber]} />,
                children: [
                  // The full section-by-section CV editor. The portal profile covers the
                  // sections the design specifies; this keeps the rest (IT skills, diversity,
                  // personal details, accomplishments) editable rather than dropping them.
                  { path: '/candidate/profile/advanced', element: withSuspense(<CandidateProfilePage />) },
                  { path: '/candidate/cv-manager', element: withSuspense(<CvManagerPage />) },
                  { path: '/candidate/applied-jobs', element: withSuspense(<AppliedJobsPage />) },
                  { path: '/candidate/saved-jobs', element: withSuspense(<SavedJobsPage />) },
                  { path: '/candidate/resume', element: withSuspense(<ResumePreviewPage />) },
                  { path: '/candidate/job-alerts', element: withSuspense(<JobAlertsPage />) },
                  { path: '/candidate/subscription', element: withSuspense(<MembershipPage />) },
                  { path: '/candidate/change-password', element: withSuspense(<ChangePasswordPage />) },
                  { path: '/candidate/all-notifications', element: withSuspense(<NotificationsPage />) },
                  { path: '/candidate/assessments', element: withSuspense(<AssessmentsListPage />) },
                  { path: '/candidate/assessments/:id', element: withSuspense(<SkillAssessmentPage />) },
                  { path: '/candidate/messages', element: withSuspense(<MessagingPage />) },
                  { path: '/candidate/saved-searches', element: withSuspense(<SavedSearchesPage />) },
                  { path: '/candidate/skill-gap', element: withSuspense(<SkillGapPage />) },
                  { path: '/candidate/interview-calendar', element: withSuspense(<InterviewCalendarPage />) },
                  { path: '/candidate/activity', element: withSuspense(<ActivityTimelinePage />) },
                  { path: '/candidate/career-path', element: withSuspense(<CareerPathPage />) },
                  { path: '/candidate/compare-companies', element: withSuspense(<CompanyComparisonPage />) },
                  { path: '/candidate/dashboard', element: withSuspense(<DashboardHome />) },
                ],
              },
              // Client / Admin company area moved to Employer Portal (see sibling route tree)
              // Admin
              {
                element: <ProtectedRoute allow={[Role.Admin]} />,
                children: [
                  { path: '/admin', element: withSuspense(<AdminDashboardPage />) },
                  { path: '/admin/users', element: withSuspense(<AdminUsersPage />) },
                  { path: '/admin/jobs', element: withSuspense(<AdminJobsPage />) },
                  { path: '/admin/blog', element: withSuspense(<BlogCmsPage />) },
                  { path: '/admin/settings', element: withSuspense(<AdminSettingsPage />) },
                  { path: '/admin/reports', element: withSuspense(<ReportsPage />) },
                ],
              },
              // QC / Recruitment
              {
                element: <ProtectedRoute allow={[Role.QC1, Role.QC2, Role.Admin]} />,
                children: [
                  { path: '/recruitment/candidates', element: withSuspense(<CandidatesListPage />) },
                  { path: '/recruitment/candidates/:id', element: withSuspense(<CandidateDetailsPage />) },
                  { path: '/recruitment/qc1', element: withSuspense(<QC1DashboardPage />) },
                  { path: '/recruitment/documents', element: withSuspense(<DocumentReviewPage />) },
                  { path: '/recruitment/interviews', element: withSuspense(<InterviewsPage />) },
                ],
              },
            ],
          },
        ],
      },
      // Employer Portal — dedicated layout (replaces legacy /company client pages)
      {
        element: <ProtectedRoute allow={[Role.Client, Role.Admin]} />,
        errorElement: <DashboardErrorFallback />,
        children: [employerRouteTree],
      },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]);
