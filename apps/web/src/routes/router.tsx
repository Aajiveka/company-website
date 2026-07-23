import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RouteErrorFallback, DashboardErrorFallback } from '@/components/ErrorFallback';
import { Loader } from '@/components/ui';
import { Role } from '@/types/roles';

// Route-level code splitting — each page is its own chunk.
const HomePage = lazy(() => import('@/features/home/HomePage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const CandidateProfilePage = lazy(() => import('@/features/candidates/pages/CandidateProfilePage'));
const CvManagerPage = lazy(() => import('@/features/candidates/pages/CvManagerPage'));
const AppliedJobsPage = lazy(() => import('@/features/candidates/pages/AppliedJobsPage'));
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

const JobSearchPage = lazy(() => import('@/features/jobs/pages/JobSearchPage'));
const JobDetailPage = lazy(() => import('@/features/jobs/pages/JobDetailPage'));

const PaymentReturnPage = lazy(() => import('@/features/payments/pages/PaymentReturnPage'));
const MembershipPage = lazy(() => import('@/features/payments/pages/MembershipPage'));

const NotFoundPage = lazy(() => import('@/features/misc/NotFoundPage'));

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<Loader />}>{node}</Suspense>;

export const router = createBrowserRouter([
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
      { path: '/pricing', element: withSuspense(<PricingPage />) },
      { path: '/about', element: withSuspense(<AboutPage />) },
      { path: '/contact', element: withSuspense(<ContactPage />) },
      { path: '/blogs', element: withSuspense(<BlogsPage />) },
      { path: '/blogs/:slug', element: withSuspense(<BlogDetailPage />) },
      { path: '/career', element: withSuspense(<CareerPage />) },
      { path: '/testimonial', element: withSuspense(<TestimonialPage />) },
      { path: '/privacy', element: withSuspense(<LegalPage variant="privacy" />) },
      { path: '/terms', element: withSuspense(<LegalPage variant="terms" />) },
      { path: '/subscription', element: withSuspense(<SubscriptionPage />) },
      { path: '/resume', element: withSuspense(<ResumePage />) },
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
              { path: '/candidate/job-alerts', element: withSuspense(<JobAlertsPage />) },
              { path: '/candidate/documents', element: withSuspense(<DocumentsPage />) },
              { path: '/candidate/subscription', element: withSuspense(<MembershipPage />) },
              { path: '/candidate/change-password', element: withSuspense(<ChangePasswordPage />) },
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
]);
