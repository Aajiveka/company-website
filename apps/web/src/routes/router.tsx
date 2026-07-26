import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RouteErrorFallback, DashboardErrorFallback } from '@/components/ErrorFallback';
import { Loader } from '@/components/ui';
import { Role } from '@/types/roles';
import AnalyticsProvider from '@/components/AnalyticsProvider';

// Route-level code splitting — each page is its own chunk.
const HomePage = lazy(() => import('@/features/home/HomePage'));
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
const CandidateProfilePage = lazy(() => import('@/features/candidates/pages/CandidateProfilePage'));
const CvManagerPage = lazy(() => import('@/features/candidates/pages/CvManagerPage'));
const AppliedJobsPage = lazy(() => import('@/features/candidates/pages/AppliedJobsPage'));
const SavedJobsPage = lazy(() => import('@/features/candidates/pages/SavedJobsPage'));
const ResumePreviewPage = lazy(() => import('@/features/candidates/pages/ResumePreviewPage'));
const CandidateInterviewsPage = lazy(() => import('@/features/candidates/pages/InterviewsPage'));
const JobAlertsPage = lazy(() => import('@/features/candidates/pages/JobAlertsPage'));
const DocumentsPage = lazy(() => import('@/features/candidates/pages/DocumentsPage'));
const ChangePasswordPage = lazy(() => import('@/features/candidates/pages/ChangePasswordPage'));
const CompanyProfilePage = lazy(() => import('@/features/clients/pages/CompanyProfilePage'));
const ManageJobsPage = lazy(() => import('@/features/clients/pages/ManageJobsPage'));
const JobPostPage = lazy(() => import('@/features/clients/pages/JobPostPage'));
const ApplicantsPage = lazy(() => import('@/features/clients/pages/ApplicantsPage'));
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
const OnboardingPage = lazy(() => import('@/features/candidates/pages/OnboardingPage'));
const NotificationSettingsPage = lazy(() => import('@/features/candidates/pages/NotificationSettingsPage'));
const NotificationsPage = lazy(() => import('@/features/candidates/pages/NotificationsPage'));
const SalaryInsightsPage = lazy(() => import('@/features/public/pages/SalaryInsightsPage'));
const EmailTemplatesPage = lazy(() => import('@/features/clients/pages/EmailTemplatesPage'));
const AdminUsersPage = lazy(() => import('@/features/admin/pages/AdminUsersPage'));
const AdminJobsPage = lazy(() => import('@/features/admin/pages/AdminJobsPage'));
const ResumeBuilderPage = lazy(() => import('@/features/candidates/pages/ResumeBuilderPage'));
const AssessmentsListPage = lazy(() => import('@/features/candidates/pages/AssessmentsListPage'));
const SkillAssessmentPage = lazy(() => import('@/features/candidates/pages/SkillAssessmentPage'));
const ReferralPage = lazy(() => import('@/features/candidates/pages/ReferralPage'));
const BulkJobImportPage = lazy(() => import('@/features/clients/pages/BulkJobImportPage'));
const PipelineBoardPage = lazy(() => import('@/features/clients/pages/PipelineBoardPage'));
const EmployerAnalyticsPage = lazy(() => import('@/features/clients/pages/EmployerAnalyticsPage'));
const BlogCmsPage = lazy(() => import('@/features/admin/pages/BlogCmsPage'));
const MessagingPage = lazy(() => import('@/features/messaging/MessagingPage'));
const SavedSearchesPage = lazy(() => import('@/features/candidates/pages/SavedSearchesPage'));
const SkillGapPage = lazy(() => import('@/features/candidates/pages/SkillGapPage'));
const InterviewCalendarPage = lazy(() => import('@/features/candidates/pages/InterviewCalendarPage'));
const ActivityTimelinePage = lazy(() => import('@/features/candidates/pages/ActivityTimelinePage'));
const CareerPathPage = lazy(() => import('@/features/candidates/pages/CareerPathPage'));
const ReportExportPage = lazy(() => import('@/features/clients/pages/ReportExportPage'));
const CandidateSourcePage = lazy(() => import('@/features/clients/pages/CandidateSourcePage'));
const EmailCampaignPage = lazy(() => import('@/features/clients/pages/EmailCampaignPage'));
const ScreeningWorkflowPage = lazy(() => import('@/features/clients/pages/ScreeningWorkflowPage'));
const TemplateLibraryPage = lazy(() => import('@/features/clients/pages/TemplateLibraryPage'));
const EmployerBrandingPage = lazy(() => import('@/features/clients/pages/EmployerBrandingPage'));
const CompanyComparisonPage = lazy(() => import('@/features/candidates/pages/CompanyComparisonPage'));
const ApplicationTrackerPage = lazy(() => import('@/features/candidates/pages/ApplicationTrackerPage'));
const CandidateComparisonPage = lazy(() => import('@/features/clients/pages/CandidateComparisonPage'));
const DashboardHome = lazy(() => import('@/features/dashboard/DashboardHome'));
const AdminSettingsPage = lazy(() => import('@/features/admin/pages/AdminSettingsPage'));
const NotFoundPage = lazy(() => import('@/features/misc/NotFoundPage'));

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<Loader />}>{node}</Suspense>;

export const router = createBrowserRouter([
  {
    element: <AnalyticsProvider />,
    children: [
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
          {
            element: <DashboardLayout />,
            errorElement: <DashboardErrorFallback />,
            children: [
              // Candidate
              {
                element: <ProtectedRoute allow={[Role.Subscriber]} />,
                children: [
                  { path: '/candidate/profile', element: withSuspense(<CandidateProfilePage />) },
                  { path: '/candidate/cv-manager', element: withSuspense(<CvManagerPage />) },
                  { path: '/candidate/applied-jobs', element: withSuspense(<AppliedJobsPage />) },
                  { path: '/candidate/interviews', element: withSuspense(<CandidateInterviewsPage />) },
                  { path: '/candidate/saved-jobs', element: withSuspense(<SavedJobsPage />) },
                  { path: '/candidate/resume', element: withSuspense(<ResumePreviewPage />) },
                  { path: '/candidate/job-alerts', element: withSuspense(<JobAlertsPage />) },
                  { path: '/candidate/documents', element: withSuspense(<DocumentsPage />) },
                  { path: '/candidate/subscription', element: withSuspense(<MembershipPage />) },
                  { path: '/candidate/change-password', element: withSuspense(<ChangePasswordPage />) },
                  { path: '/candidate/onboarding', element: withSuspense(<OnboardingPage />) },
                  { path: '/candidate/notifications', element: withSuspense(<NotificationSettingsPage />) },
                  { path: '/candidate/all-notifications', element: withSuspense(<NotificationsPage />) },
                  { path: '/candidate/resume-builder', element: withSuspense(<ResumeBuilderPage />) },
                  { path: '/candidate/assessments', element: withSuspense(<AssessmentsListPage />) },
                  { path: '/candidate/assessments/:id', element: withSuspense(<SkillAssessmentPage />) },
                  { path: '/candidate/referrals', element: withSuspense(<ReferralPage />) },
                  { path: '/candidate/messages', element: withSuspense(<MessagingPage />) },
                  { path: '/candidate/saved-searches', element: withSuspense(<SavedSearchesPage />) },
                  { path: '/candidate/skill-gap', element: withSuspense(<SkillGapPage />) },
                  { path: '/candidate/interview-calendar', element: withSuspense(<InterviewCalendarPage />) },
                  { path: '/candidate/activity', element: withSuspense(<ActivityTimelinePage />) },
                  { path: '/candidate/career-path', element: withSuspense(<CareerPathPage />) },
                  { path: '/candidate/compare-companies', element: withSuspense(<CompanyComparisonPage />) },
                  { path: '/candidate/tracker', element: withSuspense(<ApplicationTrackerPage />) },
                  { path: '/candidate/dashboard', element: withSuspense(<DashboardHome />) },
                ],
              },
              // Client / Admin
              {
                element: <ProtectedRoute allow={[Role.Client, Role.Admin]} />,
                children: [
                  { path: '/company/profile', element: withSuspense(<CompanyProfilePage />) },
                  { path: '/company/jobs', element: withSuspense(<ManageJobsPage />) },
                  { path: '/company/post-job', element: withSuspense(<JobPostPage />) },
                  { path: '/company/jobs/:id/edit', element: withSuspense(<JobPostPage />) },
                  { path: '/company/applicants', element: withSuspense(<ApplicantsPage />) },
                  { path: '/company/email-templates', element: withSuspense(<EmailTemplatesPage />) },
                  { path: '/company/bulk-import', element: withSuspense(<BulkJobImportPage />) },
                  { path: '/company/pipeline', element: withSuspense(<PipelineBoardPage />) },
                  { path: '/company/analytics', element: withSuspense(<EmployerAnalyticsPage />) },
                  { path: '/company/messages', element: withSuspense(<MessagingPage />) },
                  { path: '/company/reports', element: withSuspense(<ReportExportPage />) },
                  { path: '/company/sourcing', element: withSuspense(<CandidateSourcePage />) },
                  { path: '/company/campaigns', element: withSuspense(<EmailCampaignPage />) },
                  { path: '/company/workflows', element: withSuspense(<ScreeningWorkflowPage />) },
                  { path: '/company/template-library', element: withSuspense(<TemplateLibraryPage />) },
                  { path: '/company/branding', element: withSuspense(<EmployerBrandingPage />) },
                  { path: '/company/compare-candidates', element: withSuspense(<CandidateComparisonPage />) },
                ],
              },
              // Admin
              {
                element: <ProtectedRoute allow={[Role.Admin]} />,
                children: [
                  { path: '/admin', element: withSuspense(<AdminDashboardPage />) },
                  { path: '/admin/users', element: withSuspense(<AdminUsersPage />) },
                  { path: '/admin/jobs', element: withSuspense(<AdminJobsPage />) },
                  { path: '/admin/blog', element: withSuspense(<BlogCmsPage />) },
                  { path: '/admin/settings', element: withSuspense(<AdminSettingsPage />) },
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
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]);
