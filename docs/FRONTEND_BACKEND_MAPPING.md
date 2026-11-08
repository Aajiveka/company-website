# Frontend ↔ Backend Mapping

> **Commit:** `8de48cf` · **Scope:** `apps/web/src` (React 18 + Vite + React Router + TanStack Query) mapped onto `apps/api/src/modules/**` (NestJS).
>
> **How to read this doc.** Web paths are relative to `apps/web/src/` unless they start with `apps/`. API paths omit the global `/api` prefix. "Backend" cells name the controller file and the service class it delegates to; full request/response contracts live in [API_DOCUMENTATION.md](API_DOCUMENTATION.md), roles in [ROLE_PERMISSION_MATRIX.md](ROLE_PERMISSION_MATRIX.md), the business flow in [COMPLETE_WORKFLOW.md](COMPLETE_WORKFLOW.md), and test coverage in [TESTING_AND_ISSUES.md](TESTING_AND_ISSUES.md). Folder layout is in [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md); see also [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md), [MODULE_DEPENDENCIES.md](MODULE_DEPENDENCIES.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [MASTER_SYSTEM_FLOW.md](MASTER_SYSTEM_FLOW.md).
>
> **Evidence.** Everything here was read in code (static analysis). Nothing was executed against a running system. Statements that were reasoned rather than read are tagged *(inferred)*. Behaviour that can only be confirmed by running the app is classed **Potential issue (needs runtime verification)**.

## Contents

1. [How the web talks to the API](#1-how-the-web-talks-to-the-api)
2. [Layout shells](#2-layout-shells)
3. [Route tables](#3-route-tables)
4. [Key forms and actions](#4-key-forms-and-actions)
5. [Dead or broken UI](#5-dead-or-broken-ui)
6. [Duplicate screens: legacy `/recruitment/*` vs `/q1` `/q2` `/q3`](#6-duplicate-screens-legacy-recruitment-vs-q1-q2-q3)
7. [Mobile responsiveness (static evidence only)](#7-mobile-responsiveness-static-evidence-only)

---

## 1. How the web talks to the API

### 1.1 Request path

```
Browser ──> api (axios, lib/axios.ts, baseURL = env.apiBaseUrl = '/api')
   dev:     Vite dev/preview server proxies /api → VITE_API_PROXY ?? http://127.0.0.1:4000   (apps/web/vite.config.ts:168-181)
   deploy:  nginx `location /api/ { proxy_pass http://api:4000; }`, SPA fallback try_files → /index.html (deploy/nginx.conf:11-12, 42-43)
   ──> NestJS: global JwtAuthGuard (Bearer header only) → RolesGuard (@Roles, method overrides class) → ThrottlerGuard → ValidationPipe
```

### 1.2 Client plumbing

| Piece | File | Behaviour (verified) |
|---|---|---|
| Env | `lib/env.ts` | `apiBaseUrl = VITE_API_BASE_URL ?? '/api'`; `useMocks = VITE_USE_MOCKS === '1'`; `oauthEnabled = VITE_OAUTH_ENABLED === '1'` |
| Axios instance | `lib/axios.ts` (`api`) | `timeout 30 s`, JSON. **Request:** adds `Authorization: Bearer <access>`; on non-GET adds `X-CSRF-Token` from `<meta name=csrf-token>` or cookie `XSRF-TOKEN` (the API issues but never validates it — see [API_DOCUMENTATION.md §1](API_DOCUMENTATION.md#1-cross-cutting-behaviour)). **Response:** 429 → wait `Retry-After` (default 1 s), retry once; 401 → one shared `refreshAccessToken()` (bare `axios.post('/api/auth/refresh', {refreshToken})`), store new tokens, replay; refresh failure → `tokenStorage.clear()` + `window.location.assign('/login')`; ≥500 → `captureError`. `getErrorMessage(err, fallback)` extracts the API `message`. No `paramsSerializer` (arrays go out as `key[]=a`). |
| Token storage | `lib/tokenStorage.ts` | Access token in a module variable (memory only, lost on reload). Refresh token in `localStorage['aaj.refresh']`. |
| Auth store | `features/auth/auth.store.ts` (Zustand) | `{user, isAuthenticated, isLoading}`. `setSession` stores both tokens; `updateUser(patch)`; `logout()` → `POST /auth/logout {refreshToken}` (errors swallowed) → clear tokens. `bootstrap()` (called once from `app/providers.tsx`): if a refresh token exists → `GET /auth/me` (401 → interceptor refresh → replay). `AuthUser = {userId, userName, fullName, email, roleId, isOnboarded?}`. **`logout()` does not clear the Query cache, offline queue or `aaj.lastOrderRef`.** |
| Query client | `lib/queryClient.ts` | `staleTime 60 s`, `retry 1`, `refetchOnWindowFocus false`. Central `queryKeys` + `invalidate*` helpers exist, but most feature hooks use inline keys (e.g. `['candidate','saved-jobs']`). `queryClient.clear()` is never called. |
| Providers | `main.tsx`, `app/providers.tsx` | `ErrorBoundary > AppProviders (QueryClientProvider + ToastProvider + ReactQueryDevtools) > App (RouterProvider + OfflineBanner + PWA prompts)`; `useOfflineSync()` at root (queue in `lib/offlineQueue.ts`, localStorage). `purgeLegacyApiCache()` deletes the old `api-cache` Cache Storage. |
| Route guard | `routes/ProtectedRoute.tsx` | `isLoading` → `FullPageLoader`; unauthenticated → `/login` with `state.from`; role not in `allow` → `ROLE_HOME[roleId]`; Subscriber with `!isOnboarded` on any path other than `/candidate/onboarding` → onboarding. |
| Role homes | `types/roles.ts:29-37` | Subscriber `/candidate/profile`, QC1 `/q1/dashboard`, QC2 `/q2/dashboard`, Client `/company`, Admin `/admin`, Subscription `/pricing`, Q3 `/q3/dashboard`. |
| Login doors | `features/auth/loginPortals.ts` | `/login?as=candidate|employer|qc1|qc2|q3|admin`. If the signed-in role does not belong to that door, `LoginPage` revokes the session (`/auth/logout`) and shows a "wrong portal" toast. |
| SSE | `features/notifications/notifications.api.ts` (`useNotificationStream`) | `fetch` streaming of `GET /notifications/stream` with the bearer header. The API store is in-memory and nothing creates notifications ([API_DOCUMENTATION.md §14](API_DOCUMENTATION.md#14-notifications--apinotifications)). |
| MSW mocks | `main.tsx:49-56`, `mocks/handlers.ts`, `mocks/data.ts` | Started **only** when `VITE_USE_MOCKS=1` (dynamic import, `onUnhandledRequest: 'bypass'`, failure swallowed). Off by default; the CI `e2e-mock` job sets it. Unmocked calls (saved jobs, referrals, payments, employer analytics/billing/rounds, notifications …) fall through to the real `/api`. |
| Analytics | `lib/analytics.ts`, `components/AnalyticsProvider` | DEV: console only. Prod: `sendBeacon(VITE_ANALYTICS_ENDPOINT)` only if set. Every route is a child of `<AnalyticsProvider/>` (`routes/router.tsx:161`). |

### 1.3 Files the browser downloads

The API authenticates **only** through the `Authorization` header (`apps/api/src/common/guards/jwt-auth.guard.ts:34-35`). A plain `<a href="/api/...">` or `window.open(...)` therefore sends no credentials and gets 401. The working pattern is "GET as blob through `api`, then object URL" (e.g. `features/recruitment/recruitment.api.ts:62-76`, `features/q3/q3.api.ts:265-271`, employer `useApplicantResumeBlob`, admin `features/admin/components/ExportButton.tsx`). Exceptions are listed in §5.

---

## 2. Layout shells

| Shell | File | Used by (routes) | Notes |
|---|---|---|---|
| none (full bleed) | — | `/brochure` | Static brochure rebuild |
| `PublicLayout` | `components/layout/PublicLayout.tsx` | `/`, `/login`, `/register`, `/register/employer`, `/forgot-password`, `/reset-password`, `/search`, `/candidates/:id`, `/companies/:id`, `/companies/:id/reviews`, `/pricing`, `/about`, `/contact`, `/help`, `/blogs`, `/blogs/:slug`, `/career`, `/testimonial`, `/privacy`, `/terms`, `/subscription`, `/resume`, `/student`, `/salary-insights`, `/payment/return` | Public `Navbar` (no signed-in state) + footer; mounts `CommandPalette` |
| `JobsLayout` | `features/jobs/components/JobsLayout.tsx` | `/jobs`, `/jobs/:id` (public); `/candidate/applications`, `/candidate/saved-jobs`, `/jobs/:id/apply` (Subscriber) | Renders `PublicLayout` for anonymous / non-candidate users and `CandidateChrome` (portal `PortalHeader`, via `usePortalProfile`) for Subscribers |
| `CandidatePortalLayout` | `features/candidates/portal/CandidatePortalLayout.tsx` | `/candidate/profile`, `/candidate/onboarding`, `/candidate/tracker`, `/candidate/interviews`, `/candidate/documents`, `/candidate/referrals`, `/candidate/account`, `/candidate/notifications`, `/candidate/all-notifications`, `/candidate/resume-builder` | `PortalHeader` + `ProfileHero` + `PortalSidebar` (`ContactCard`, `ProfileAsideCards`, `ModuleTiles`) |
| `DashboardLayout` (legacy) | `components/layout/DashboardLayout.tsx` | `/candidate/subscription`; all `/recruitment/*` | Shared `Sidebar` driven by `components/layout/menu.ts`, breadcrumbs, `CommandPalette` |
| `Q1Shell` | `features/q1/components/Q1Shell.tsx` | all `/q1/*` (each page renders the shell itself) | Sidebar badges (`GET /q1/nav-counts`), SLA card, `NotificationBell`, quick search |
| `Q2Shell` | `features/q2/components/Q2Shell.tsx` | all `/q2/*` (rendered per page) | Collapsible sidebar (`aajiveka.q2.sidebarCollapsed`), SLA card (`/q2/nav-counts`, `/q2/sla`) |
| `Q3Layout` + `Q3Shell` | `features/q3/components/Q3Layout.tsx` (route element, toast context), `Q3Shell.tsx` (rendered per page) | all `/q3/*` | `GET /q3/nav-counts` |
| `AdminShell` | `features/admin/components/AdminShell.tsx` | all `/admin/*` (rendered per page; 13/13 pages) | Collapsible sidebar, modal mobile drawer |
| `EmployerLayout` | `employer/layouts/EmployerLayout.tsx` (+ `employer/components/Header/EmployerHeader.tsx`, `Sidebar/EmployerSidebar.tsx`) | all `/company/*` | Forces light mode; sidebar badge from `GET /clients/me/applicants?page=1&pageSize=1`; `messages`/`notifications` badges hard-coded `0` |
| `AuthShell` | `features/auth/components/AuthShell.tsx` | wraps auth page content inside `PublicLayout` | — |

The Q1/Q2/Q3/Admin groups sit outside `DashboardLayout` on purpose (router comments, `routes/router.tsx:255-332`): `DashboardLayout` would stack a second breadcrumb row.

---

## 3. Route tables

Sources: `routes/router.tsx`, `employer/routes/employerRoutes.tsx`. Guard legend: **Public** = no guard; **Auth** = generic `<ProtectedRoute/>`; role lists are the `allow` prop. `*` → `features/misc/NotFoundPage`.

Backend abbreviations: `auth.ctl → AuthService` means `apps/api/src/modules/auth/auth.controller.ts` → `auth.service.ts`. Same pattern for every module.

### 3.1 Public & auth

| Route | Guard | Page component | Key components / hooks | API calls | Backend |
|---|---|---|---|---|---|
| `/` | Public | `features/home/HomePage.tsx` | `JobSearchBar` (`useJobFilters`) | GET `/jobs/filters` *(JobSearchBar on home: inferred)* | `jobs.ctl → JobsService` |
| `/brochure` | Public | `features/home/brochure/BrochureHomePage.tsx` | static sheets, `brochure/tracking.ts` | none | — |
| `/login` | Public | `features/auth/pages/LoginPage.tsx` | `SocialLoginButtons`, `AuthShell`, `loginPortals.ts` | POST `/auth/login`; POST `/auth/logout` on wrong portal | `auth.ctl → AuthService` |
| `/register` | Public | `features/auth/pages/RegisterPage.tsx` | `OtpVerification` | POST `/auth/register`, `/auth/verify-otp`, `/auth/resend-otp` | `auth.ctl → AuthService` + `OtpService` (Redis) |
| `/register/employer` | Public | `features/auth/pages/EmployerRegisterPage.tsx` | — | POST `/auth/register-employer` | `auth.ctl → AuthService` |
| `/forgot-password` | Public | `features/auth/pages/ForgotPasswordPage.tsx` | — | POST `/auth/forgot-password {userName}` | `auth.ctl → AuthService` |
| `/reset-password?token=` | Public | `features/auth/pages/ResetPasswordPage.tsx` | — | POST `/auth/reset-password` | `auth.ctl → AuthService` |
| `/search` | Public | `features/jobs/pages/SearchResultsPage.tsx` | tabs jobs/companies/candidates | GET `/search` — **no such route** | none (404) |
| `/candidates/:id` | Public | `features/candidates/pages/PublicProfilePage.tsx` | — | GET `/candidates/:id/profile` — **no such route** | none (404) |
| `/companies/:id` | Public | `features/clients/pages/CompanyPublicPage.tsx` | `features/public/components/CompanyReviews.tsx` | GET `/clients/:id/public`; reviews widget GET/POST `/clients/:id/reviews` — **no such route** | `employers.ctl → EmployersService` (public card); reviews: none |
| `/companies/:id/reviews` | Public | `features/public/pages/CompanyReviewsPage.tsx` | review form | GET/POST `/companies/:id/reviews` — **no such route** | none (404) |
| `/salary-insights` | Public | `features/public/pages/SalaryInsightsPage.tsx` | — | GET `/jobs/salary-insights` — captured by `GET /jobs/:id` + `ParseIntPipe` → 400 | `jobs.ctl` (wrong handler) |
| `/pricing`, `/subscription`, `/resume` | Public | `features/public/pages/PricingPage.tsx`, `SubscriptionPage.tsx`, `ResumePage.tsx` | `PricingPlans` (`usePlans`) → `SubscribeButton` → `RazorpayCheckout`; `PlanComparison` (static) | GET `/payments/plans`; on subscribe see §3.4 | `payments.ctl → PaymentsService` |
| `/about`, `/contact`, `/help`, `/career`, `/testimonial`, `/privacy`, `/terms` | Public | `features/public/pages/{About,Contact,Help,Career,Testimonial}Page.tsx`, `LegalPage.tsx` (variant) | static data files | none (Contact submit is simulated, §5) | — |
| `/blogs`, `/blogs/:slug` | Public | `features/public/pages/BlogsPage.tsx`, `BlogDetailPage.tsx` | `features/public/blogs.data.ts` (hard-coded) | none | — (admin CMS has no public read route) |
| `/student` | Public | `features/public/pages/StudentGuidePage.tsx` | — | link to `/api/site-docs/aajivika-book` (hard-coded `/api`) | `site-documents.ctl` |
| `*` | Public | `features/misc/NotFoundPage.tsx` | — | none | — |

### 3.2 Jobs

| Route | Guard | Page component | Key components / hooks | API calls | Backend |
|---|---|---|---|---|---|
| `/jobs` | Public (`JobsLayout`) | `features/jobs/pages/JobSearchPage.tsx` | `JobResultCard`, `useInfinitePublicJobs`, client-side `matchScore`; Subscriber only: `useCvEditProfile({enabled})`, `useSavedJobIds`, `useSaveJob`, `useUnsaveJob` | GET `/jobs?designation&employmentTypes[]&workModes[]&locations[]&minExp&maxExp&sortBy&page&pageSize`; Subscriber: GET `/candidates/me/cv-edit`, `/candidates/me/saved-job-ids`, POST/DELETE `/candidates/me/saved-jobs/:jobId` | `jobs.ctl → JobsService`; `candidates.ctl → CandidatesService` |
| `/jobs/:id` | Public (`JobsLayout`) | `features/jobs/pages/JobDetailPage.tsx` | `MatchBadge`, `useJob` | GET `/jobs/:id`; Subscriber: cv-edit, saved-job-ids, save/unsave | same |
| `/jobs/:id/apply` | Auth → Subscriber (`JobsLayout`) | `features/jobs/pages/JobApplyPage.tsx` | `useJob`, `useCandidateProfile`, `useCvEditProfile`, `useApplyToJob`, `useUploadResume` | GET `/jobs/:id`, `/candidates/me`, `/candidates/me/cv-edit`; POST `/jobs/:id/apply`; POST `/files/resume` | `jobs.ctl → JobsService` (apply transaction in `JobApplicationsService`, per API doc); `files.ctl → StorageService` |

Hooks in `features/jobs/jobs.api.ts` with no live caller found: `useFullTextJobSearch` (GET `/jobs/search`), `useJobSuggestions` (GET `/jobs/suggestions`) *(inferred from grep of live pages)*.

### 3.3 Candidate portal

All rows: guard **Auth → Subscriber** (+ onboarding redirect). Hooks: `features/candidates/candidate.api.ts` unless noted (`portal.api.ts` = `features/candidates/portal/portal.api.ts`; `recruitment.api.ts` = `features/recruitment/recruitment.api.ts`; `notifications.api.ts` = `features/notifications/notifications.api.ts`). Backend for every `/candidates/me/*` call: `candidates.ctl → CandidatesService`.

| Route | Layout | Page component | Key components / hooks | API calls | Backend (other than CandidatesService) |
|---|---|---|---|---|---|
| `/candidate/applications` | `JobsLayout` | `features/candidates/portal/pages/ApplicationsPage.tsx` | `useAppliedJobs` (refetch 60 s); per row `InterviewSlotPicker` (`useInterviewRounds`, `useSelectSlot`) and `OfferResponseCard` (`useOffer`, `useRespondToOffer`) from `recruitment.api.ts` | GET `/candidates/me/applied-jobs`; per application GET `/recruitment/interview-rounds/:mapId`, GET `/recruitment/offers/:mapId`; POST `/recruitment/interview-rounds/:roundId/select-slot {slotId}`; POST `/recruitment/offers/:id/respond {accept}` | `recruitment.ctl → MappingAccessService` (ownership) → `InterviewRoundService` / `OfferLetterService` |
| `/candidate/saved-jobs` | `JobsLayout` | `portal/pages/SavedJobsPage.tsx` | `useSavedJobs`, `useUnsaveJob` | GET `/candidates/me/saved-jobs`; DELETE `/candidates/me/saved-jobs/:jobId` | — |
| `/candidate/profile` | Portal | `portal/pages/ProfileOverviewPage.tsx` | `useCvEditProfile`, `useCvMasters`, `useDashboard`; `ProfileHero` (photo modal, `useDownloadResume`) | GET `/candidates/me`, `/candidates/me/cv-edit`, `/candidates/me/cv-masters`, `/candidates/me/dashboard`; GET `/files/resume` (blob); POST `/files/avatar` | `files.ctl` |
| `/candidate/onboarding?step=` | Portal | `portal/pages/ProfileWizardPage.tsx` + `portal/wizard/*Step.tsx` | see §4.2 | PUT section endpoints; POST `/candidates/me/complete-onboarding` | `files.ctl` (resume step) |
| `/candidate/tracker` | Portal | `portal/pages/ApplicationTrackerPage.tsx` | `useAppliedJobs` | GET `/candidates/me/applied-jobs` | — |
| `/candidate/interviews` | Portal | `portal/pages/InterviewsPage.tsx` | `useAppliedJobs`; "Add to Calendar" = Google Calendar URL | GET `/candidates/me/applied-jobs` | — |
| `/candidate/documents` | Portal | `portal/pages/DocumentsPage.tsx` | `useCandidateDocuments`, `useUploadCandidateDocument` | GET `/candidates/me/documents`; POST multipart `/candidates/me/documents/:documentTypeId` | — |
| `/candidate/referrals` | Portal | `portal/pages/ReferPage.tsx` | `useReferrals`, `useCreateReferral` (`portal.api.ts`) | GET/POST `/candidates/me/referrals` | — |
| `/candidate/account?tab=` | Portal | `portal/pages/AccountSettingsPage.tsx` | `useCandidateProfile`, `useCvEditProfile`, `useUpdatePersonal`, `useUploadAvatar`, `useChangePassword`; `usePrivacySettings`, `useUpdatePrivacy`, `useRequestDataExport`, `useRequestAccountDeletion` (`portal.api.ts`) | PUT `/candidates/me/personal`; POST `/files/avatar`; POST `/candidates/me/change-password`; GET/PUT `/candidates/me/privacy`; POST `/candidates/me/export`; POST `/candidates/me/delete-account` | `files.ctl` |
| `/candidate/notifications` | Portal | `portal/pages/EmailPreferencesPage.tsx` | `useNotificationPrefs`, `useUpdateNotificationPrefs` | GET/PUT `/candidates/me/notification-prefs` | — |
| `/candidate/all-notifications` | Portal | `features/candidates/pages/NotificationsPage.tsx` | `useNotifications` (infinite), `useMarkRead`, `useMarkAllRead`, `useDeleteNotification`, `useNotificationStream` (`notifications.api.ts`) | GET `/notifications?page&type&unread`; PATCH `/notifications/:id/read`, `/notifications/read-all`; DELETE `/notifications/:id`; GET `/notifications/stream` (SSE) | `notifications.ctl → NotificationsService`, `SseNotificationsService` |
| `/candidate/resume-builder` | Portal | `portal/pages/ResumeBuilderPage.tsx` | `useCvEditProfile`, `useCvMasters`; html2canvas + jsPDF in browser | GET cv-edit, cv-masters only | — |
| `/candidate/subscription` | `DashboardLayout` | `features/payments/pages/MembershipPage.tsx` | `useSubscription`, `usePaymentHistory`, `PricingPlans` | see §3.4 | `payments.ctl → PaymentsService` |

Commented-out candidate routes (page files still exist; `routes/router.tsx:57-62, 141-152, 373-389`): `/candidate/profile/advanced`, `/cv-manager`, `/applied-jobs`, `/resume`, `/job-alerts`, `/change-password`, `/assessments(/:id)`, `/messages`, `/saved-searches`, `/skill-gap`, `/interview-calendar`, `/activity`, `/career-path`, `/compare-companies`, `/dashboard`.

### 3.4 Payments

Hooks: `features/payments/payments.api.ts`. Backend: `payments.ctl → PaymentsService` (+ `RazorpayService`).

| Route / entry point | Guard | Component | Hooks | API calls | Notes |
|---|---|---|---|---|---|
| `/pricing`, `/subscription`, `/resume`, `/candidate/subscription` | Public (first three), Subscriber (last) | `features/public/components/PricingPlans.tsx` → `features/payments/components/SubscribeButton.tsx` → `RazorpayCheckout` | `usePlans`, `useCreateRazorpayOrder`, `useVerifyPayment` | GET `/payments/plans`; POST `/payments/create-order {planId}`; POST `/payments/verify {razorpayOrderId, razorpayPaymentId, razorpaySignature}` | Guest → toast + `/login` with `from`. Non-Subscriber roles get 403 from create-order. Loads `checkout.razorpay.com` script. Stores `aaj.lastOrderRef` in localStorage |
| `/candidate/subscription` | Subscriber | `features/payments/pages/MembershipPage.tsx` | `useSubscription`, `usePaymentHistory` | GET `/payments/subscription`, GET `/payments/history` | — |
| `/payment/return?ref=` | Public (polls only when authenticated) | `features/payments/pages/PaymentReturnPage.tsx` | `useOrder`, `useVerifyPayment` | GET `/payments/orders/:orderRef` every 2 s up to 60 s; POST `/payments/verify` if `razorpay_*` query params are present | BillDesk `useCreateOrder` (POST `/payments/orders`) exists; settlement has no API route ([API_DOCUMENTATION.md §12](API_DOCUMENTATION.md#12-payments--apipayments)) |
| Gate on apply | Subscriber | `JobApplyPage.tsx` | `useApplyToJob` | POST `/jobs/:id/apply` → 403 without subscription | UI redirects to `/candidate/subscription?returnTo=/jobs/:id/apply` |

### 3.5 Employer portal

Guard for the whole tree: `ProtectedRoute allow={[Role.Client, Role.Admin]}` (`routes/router.tsx:438-442`), sitting **outside** the generic `<ProtectedRoute/>` group (still redirects unauthenticated users to `/login`). Layout `EmployerLayout`. Hooks: `employer/services/employer.api.ts`. Backend: `employers.ctl` (`@Controller('clients')`, `@Roles(Client, Admin)`) → `EmployersService`, unless noted. Page files under `employer/pages/`.

| Route | Page component | Key components / hooks | API calls | Backend (other) |
|---|---|---|---|---|
| (layout) | `employer/layouts/EmployerLayout.tsx` | `EmployerHeader`, `EmployerSidebar`, `useApplicants` | GET `/clients/me/applicants?page=1&pageSize=1` | — |
| `/company` | `Dashboard/DashboardPage.tsx` | `useCompanyAnalytics`, `useApplicants` ×3 | GET `/clients/me/analytics`; GET `/clients/me/applicants` (pageSize 6; status=Interview; status=OnHold) | — |
| `/company/profile` | `CompleteProfile/CompleteProfilePage.tsx` | `useCompanyProfile`, `useCompanyMasters`, `useUpdateCompanyProfile`, `useUploadCompanyLogo` | GET `/clients/me`, GET `/clients/masters`, PATCH `/clients/me`, POST `/clients/me/logo`; `<img src="/api/clients/:id/logo">` (hard-coded `/api`) | — |
| `/company/jobs`, `/company/jobs/drafts`, `/company/jobs/archived` | `ManageJobs/JobList/JobListPage.tsx` (status from path) + `JobViewModal.tsx` | `useCompanyJobs`, `useCompanyJob`, `useSetJobStatus`, `useArchiveJob`, `useUnarchiveJob`, `useDeleteJob` | GET `/clients/me/jobs?page&pageSize&q&city&status`; GET `/clients/me/jobs/:id`; POST `.../:id/status`, `.../:id/archive`, `.../:id/activate`; DELETE `/clients/me/jobs/:id` | — |
| `/company/post-job`, `/company/jobs/:id/edit` | `ManageJobs/AddJob/AddJobPage.tsx` + `JobPreviewModal.tsx` | `useCompanyMasters`, `useCompanyJob`, `usePostJob`, `useUpdateJob` | GET `/clients/masters`; GET `/clients/me/jobs/:id`; POST `/clients/me/jobs[?draft=true]`; PATCH `/clients/me/jobs/:id[?draft=]` | — |
| `/company/bulk-import` | `ManageJobs/BulkImport/BulkImportPage.tsx` | `useUploadBulkJobs`; template built client-side (`downloadJobImportTemplate`) | POST `/clients/me/jobs/bulk-upload?commit=false|true` (multipart CSV) | — |
| `/company/applicants`, `/company/applicants/shortlisted`, `/interviews`, `/hired`, `/rejected` | `Applicants/ApplicantList/ApplicantListPage.tsx` (status from path) | `useCompanyJobs`, `useApplicants`, `useDecideApplicant`, `useUndoApplicantDecision`; `employer/components/Tables/DataTable.tsx` | GET `/clients/me/jobs?pageSize=100`; GET `/clients/me/applicants?page&pageSize&status&q&jobId&city&minExp&maxNotice`; POST `.../applicants/:id/decision`, `.../decision/undo`; interview icon → `/company/applicants/:id?schedule=1` | — |
| `/company/applicants/:id` | `Applicants/ApplicantProfile/ApplicantProfilePage.tsx` + `InterviewProcessPanel.tsx`, `ScheduleInterviewForm.tsx`, `RequestDocumentsForm.tsx`, `ApplicantDocumentsPanel.tsx` | `useApplicant`/`useApplicantDetails`, `useApplicantResumeBlob`, `useApplicantNotes`, `useSaveApplicantNote`, `useDecideApplicant`, `useUndoApplicantDecision`, `useApplicantInterviewRounds`, `useScheduleInterview`, `useRecordInterviewResult`, `useApplicantDocuments`, `useReviewApplicantDocument`, `useRequestableDocumentTypes`, `useRequestApplicantDocuments`; `useOffer`, `useCreateOffer`, `useSendOffer` (`recruitment.api.ts`) | GET `/clients/me/applicants/:id`; GET `.../resume?inline=1` and `.../resume` (blobs); GET/PUT `.../notes`; POST `.../decision`, `.../decision/undo`; GET/POST `.../interview-rounds`; POST `.../interview-rounds/:roundId/result`; GET `.../documents`; POST `.../documents/review`; GET `/clients/me/document-types`; POST `.../document-request`; GET `/recruitment/offers/:mapId`, POST `/recruitment/offers`, `/recruitment/offers/:id/send`, `/recruitment/offers/:id/mark-joined` | `EmployersService` → `InterviewRoundService.submitResult` (result); `recruitment.ctl → MappingAccessService → OfferLetterService` (offers) |
| `/company/compare-candidates` | `CompareCandidates/ComparePage.tsx` (max 4) | `useApplicants`, `useApplicant`, `useDecideApplicant` | GET `/clients/me/applicants?pageSize=100`; GET `/clients/me/applicants/:id` per selection; POST decision | — |
| `/company/analytics` | `Analytics/AnalyticsPage.tsx` | `useCompanyAnalytics` | GET `/clients/me/analytics`; GET `/clients/me/analytics/export` (CSV blob); summary CSV built client-side | — |
| `/company/billing` | `Billing/BillingPage.tsx` | `useCompanyBilling` | GET `/clients/me/billing`; GET `/clients/me/billing/export` | — |
| `/company/messages` | `Messages/MessagesPage.tsx` | — | none ("coming soon") | — |
| `/company/notifications` | `Notifications/NotificationsPage.tsx` | — | none ("No notifications yet") | — |
| `/company/settings` | `Settings/SettingsPage.tsx` | — | none (static, links to profile) | — |

Admin can enter this tree and has `/company/profile`, `/company/jobs`, `/company/applicants` in its legacy sidebar menu (`components/layout/menu.ts:95-105`), but the API returns 404 on every `/clients/me/*` route for a login with no linked company ([API_DOCUMENTATION.md §6](API_DOCUMENTATION.md#6-employers--apiclients)).

Employer hooks defined but imported nowhere: `useDeactivateJob` (POST `/clients/me/jobs/:id/deactivate`), `useBulkDecideApplicants`, `useDuplicateJob` (POST `/clients/me/jobs/:jobId/duplicate`). API routes with no web caller: GET/PATCH `/clients/me/branding`, POST `/clients/me/interviews/generate-link`, GET `/exports/applicants`.

### 3.6 Q1 screening (`/q1/*`)

Guard: Auth → `[QC1, Admin]` (`routes/router.tsx:263`). Shell `Q1Shell`. Hooks: `features/q1/q1.api.ts`; every mutation invalidates `['q1']`. Backend: `q1.ctl` (`@Roles(QC1, Admin)`) → `Q1Service` (analytics → `Q1AnalyticsService`).

| Route | Page component | Key components / hooks | API calls |
|---|---|---|---|
| `/q1` | redirect → `/q1/dashboard` | — | — |
| `/q1/dashboard` | `features/q1/pages/Q1DashboardPage.tsx` | `CandidateQueue` (tabs), stat cards; `useQ1Stats`, `useQ1Queue` | GET `/q1/stats`; GET `/q1/candidates?tab&search&priority&experience&cvOnly&page&pageSize` |
| `/q1/candidates` | `Q1CandidatesPage.tsx` | `CandidateQueue showTabs`, seeded from `?search=` | GET `/q1/candidates` |
| `/q1/candidates/:id` | `Q1CandidateProfilePage.tsx` | `ScreeningRail`, `ContactCandidateModal`, `UpdateStatusModal`; `useQ1Profile` | GET `/q1/candidates/:id` (**side effect: New → Screening**); PATCH `.../checklist`, `.../checklist/all`; POST `.../verify`, `.../contact`, `.../status`, `.../request-update`, `.../request-cv`; `window.open('/api/recruitment/candidates/:id/resume')` (broken, §5) |
| `/q1/follow-ups`, `/q1/no-response`, `/q1/verified`, `/q1/not-interested` | `Q1FollowUpsPage.tsx`, `Q1NoResponsePage.tsx`, `Q1VerifiedPage.tsx`, `Q1NotInterestedPage.tsx` | `CandidateQueue` pinned to a tab | GET `/q1/candidates?tab=…` |
| `/q1/analytics` | `Q1AnalyticsPage.tsx` | `useQ1Analytics` | GET `/q1/analytics` → `Q1AnalyticsService` |
| (shell) | `features/q1/components/Q1Shell.tsx` | `useQ1NavCounts`, `components/layout/NotificationBell` | GET `/q1/nav-counts` |

`useQ1ContactLog` (GET `/q1/candidates/:id/contact-log`) is defined but rendered nowhere.

### 3.7 Q2 matching (`/q2/*`)

Guard: Auth → `[QC2, Admin]` (`routes/router.tsx:285`). Shell `Q2Shell`. Hooks: `features/q2/q2.api.ts`; mutations invalidate `['q2']` except the criterion toggle (writes into cache). Backend: `q2.ctl` (`@Roles(QC2, Admin)`) → `Q2Service` (analytics → `Q2AnalyticsService`).

| Route | Page component | Key components | API calls |
|---|---|---|---|
| `/q2` | redirect → `/q2/dashboard` | — | — |
| `/q2/dashboard` | `features/q2/pages/Q2DashboardPage.tsx` | stat cards, `EmployerJobsTable` | GET `/q2/stats`; GET `/q2/jobs?search` |
| `/q2/jobs` | `Q2EmployerJobsPage.tsx` | `EmployerJobsTable` (300 ms debounce) | GET `/q2/jobs` |
| `/q2/jobs/:jobId` | `Q2JobApplicantsPage.tsx` | ranked list, "Relevant only" toggle | GET `/q2/jobs/:jobId?relevantOnly` |
| `/q2/applicants` | `Q2AllApplicantsPage.tsx` | `ApplicantsTable` bucket=queue | GET `/q2/applicants?tab&bucket&search&page&pageSize` |
| `/q2/forwarded` | `Q2ForwardedPage.tsx` | `ApplicantsTable` bucket=forwarded | GET `/q2/applicants?bucket=forwarded` |
| `/q2/sent-back` | `Q2SentBackPage.tsx` | `ApplicantsTable` bucket=sentBack | GET `/q2/applicants?bucket=sentBack` |
| `/q2/applications/:mapId` | `Q2ApplicantDetailPage.tsx` | candidate panel, JD panel, criteria checkboxes, 3 decision buttons | GET `/q2/applications/:mapId`; PATCH `.../criteria`; POST `.../forward`, `.../send-back`, `.../reject`; `<a href="/api/recruitment/candidates/:subscriberId/resume">` (broken, §5) |
| `/q2/analytics` | `Q2AnalyticsPage.tsx` | — | GET `/q2/analytics` → `Q2AnalyticsService` |
| (shell) | `features/q2/components/Q2Shell.tsx` | — | GET `/q2/nav-counts`, GET `/q2/sla` |

Q2 has no "map candidate to job" action; it reviews applications that already exist (candidate apply, or legacy `POST /recruitment/candidates/:id/assign-job`).

### 3.8 Q3 hiring operations (`/q3/*`)

Guard: Auth → `[Q3, Admin]`, wrapped in `Q3Layout` (`routes/router.tsx:305-309`). Hooks: `features/q3/q3.api.ts`; writes invalidate `['q3']` (meeting-link excepted). Backend: `q3.ctl` (`@Roles(Q3, Admin)`) → one of four services; the route → service pairing below was read from `apps/api/src/modules/q3/q3.controller.ts`.

| Route | Page component | Key components | API calls → service |
|---|---|---|---|
| `/q3` | redirect → `/q3/dashboard` | — | — |
| `/q3/dashboard` | `features/q3/pages/Q3DashboardPage.tsx` | pipeline table + stage tabs, `ExportReport` (jsPDF on demand, `q3-report.ts`) | GET `/q3/dashboard`, `/q3/pipeline`, `/q3/report?quarter` → `Q3ReadService`; POST `/q3/applications/:mapId/contact`, `/q3/rounds/:r/decision-mail`, `/q3/applications/:mapId/nudge` → `Q3InterviewsService` |
| `/q3/referred` | `Q3ReferredCvsPage.tsx` | batch picker, `CvRow`, `ReturnToQ2Modal` | GET `/q3/referrals`; POST `/q3/referrals/forward`, `/q3/referrals/return` → `Q3ReferralsService` |
| `/q3/company-review` | `Q3CompanyReviewPage.tsx` | `ShortlistPanel`, `RoundSetupModal`, `RemindExpiringButton` | GET `/q3/company-review?tab`, `/q3/applications/:mapId/shortlist`; PUT `.../round-setup`; POST `/q3/company-review/remind-expiring` → `Q3ReferralsService` |
| `/q3/scheduling`, `/q3/scheduling/:mapId` | `Q3SchedulingPage.tsx` | `QueueSwitcher`, stepper, slot list, `ConfirmCard`, contact-log form | GET `/q3/queues/scheduling` → `Q3ReadService`; GET `.../scheduling`; POST `/q3/rounds/:r/slots/:s/availability`, `/q3/rounds/:r/request-slots`, `/q3/meeting-link` (Jitsi), `/q3/rounds/:r/confirm`, `.../contact` → `Q3InterviewsService` |
| `/q3/interviews` | `Q3InterviewsPage.tsx` | week view (refetch 60 s) | GET `/q3/interviews?week`; POST `/q3/rounds/:r/remind|checklist|reschedule|conducted|request-slots`, `.../contact` → `Q3InterviewsService` |
| `/q3/decisions`, `/q3/decisions/:mapId` | `Q3RoundsPage.tsx` | `RecordDecisionModal` | GET `/q3/queues/decisions` → `Q3ReadService`; GET `.../rounds`; POST `/q3/rounds/:r/decision`, `.../nudge` → `Q3InterviewsService` |
| `/q3/documents[/:mapId]`, `/q3/offers[/:mapId]` | `Q3DocumentsPage.tsx` (mode from pathname) | `DocumentRow`, `DocumentPreviewModal`, `SendBackModal`, `GenerateOfferModal`, approve/join confirm modals | GET `/q3/queues/documents|offers` → `Q3ReadService`; GET `.../documents`; POST `/q3/documents/:id/verify|send-back`; GET `/q3/documents/:id/file?preview` (blob, auth OK); POST `.../documents/request|forward|approve`, `.../offer`, `.../joined` → `Q3DocumentsService` |
| `/q3/returned` | `Q3ReturnedPage.tsx` | tabs, `ReturnMailModal` | GET `/q3/returned?tab`, `/q3/returned/:referralId/mail`; POST `.../resend` → `Q3ReferralsService` |
| (shell) | `features/q3/components/Q3Shell.tsx` | — | GET `/q3/nav-counts` → `Q3ReadService` |

### 3.9 Legacy `/recruitment/*`

All inside `DashboardLayout`. Hooks: `features/recruitment/recruitment.api.ts`. Backend: `recruitment.ctl` (class `@Roles(QC1, QC2, Admin)`, method `@Roles` replaces it) → `RecruitmentService` unless noted. Page files under `features/recruitment/pages/`.

| Route | Guard | Page component | API calls | Backend (other) |
|---|---|---|---|---|
| `/recruitment/candidates` | QC1, QC2, Admin | `CandidatesListPage.tsx` | GET `/recruitment/candidates?search&status&page&pageSize` | — |
| `/recruitment/candidates/:id` | QC1, QC2, Admin | `CandidateDetailsPage.tsx` | GET `/recruitment/candidates/:id`; POST `.../decision`; GET `/recruitment/jobs`; POST `.../assign-job`; GET `/recruitment/document-types`; POST `.../documents`; GET `.../resume` (blob, OK); POST `/recruitment/referrals`; POST `/recruitment/applications/:id/score` | `CvReferralService` (referrals); `ScoringService` (score) |
| `/recruitment/documents` | QC1, QC2, Admin | `DocumentReviewPage.tsx` | GET `/recruitment/documents`; GET `/recruitment/documents/:id/file` (blob); POST `/recruitment/documents/review` | — |
| `/recruitment/interviews` | QC1, QC2, Admin | `InterviewsPage.tsx` | GET `/recruitment/interviews`, `/interviews/eligible`, `/interview-modes`; POST `/recruitment/interviews`, `/recruitment/interviews/:id/status` | — |
| `/recruitment/qc1` | QC1, Admin | `QC1DashboardPage.tsx` | GET `/recruitment/qc1/stats` | — |
| `/recruitment/referrals` | QC2, Admin | `ReferralsPage.tsx` | GET `/recruitment/referrals` | `CvReferralService` |
| `/recruitment/q3` | Q3, Admin | `Q3DashboardPage.tsx` + `InterviewRoundsPanel` | GET `/recruitment/referrals`; POST `/recruitment/referrals/forward`; GET `/recruitment/interview-rounds/:mapId`, `/interview-modes`; POST `/recruitment/interview-rounds`, `.../:roundId/result` | `CvReferralService`; `MappingAccessService` → `InterviewRoundService` |
| `/recruitment/q3/candidates` | Q3, Admin | `CandidatesListPage.tsx` | GET `/recruitment/candidates` → **403 for Q3** | — |
| `/recruitment/q3/interviews` | Q3, Admin | `InterviewsPage.tsx` | GET `/recruitment/interviews`, `/interviews/eligible` → **403 for Q3** | — |
| `/recruitment/q3/documents` | Q3, Admin | `DocumentReviewPage.tsx` | GET `/recruitment/documents` → **403 for Q3** | — |

Unused recruitment hooks: `useAddRoundSlots` (POST `/recruitment/interview-rounds/:id/slots`), `useCompanyReviewReferral` (POST `/recruitment/referrals/:id/company-review`). `PATCH /recruitment/pipeline/:id` has no web caller.

### 3.10 Admin (`/admin/*`)

Guard: Auth → `[Admin]` (`routes/router.tsx:334`). Shell `AdminShell`. Hooks: `features/admin/admin.api.ts` (mutations invalidate `['admin']`); Settings and Blog use inline `useQuery`/`useMutation`. Backend: `admin.ctl` (`@Roles(Admin)`) → `AdminService` (+ `staff-account.ts`); exports → `exports.ctl`. Page files under `features/admin/pages/`.

| Route | Page component | Key components | API calls |
|---|---|---|---|
| `/admin` | `AdminDashboardPage.tsx` | stat cards, activity feed | GET `/admin/stats` |
| `/admin/users` | `AdminUsersPage.tsx` | `CreateStaffModal`, `ExportButton` | GET `/admin/users?page&q&roleId&isActive`; POST `/admin/users`; POST `/admin/users/bulk-update`; GET `/exports/users?format=csv` |
| `/admin/users/:userId` | `AdminUserDetailPage.tsx` | `ConfirmDialog`, `SetPasswordNotice` | GET `/admin/users/:id`; PATCH `/admin/users/:id {isActive|roleId}`; POST `.../password-reset` |
| `/admin/employer-approvals` | `AdminEmployerApprovalsPage.tsx` | `ReviewModal` | GET `/admin/employer-registrations?status`; GET `/clients/masters` (`employers.ctl`); POST `/admin/employer-registrations/:id/review` |
| `/admin/companies` | `AdminCompaniesPage.tsx` | — | GET `/admin/companies?page&q` |
| `/admin/jobs` | `AdminJobsPage.tsx` | bulk bar, `ExportButton` | GET `/admin/jobs?page&q&status&clientId`; POST `/admin/jobs/:id/status` (one) or `/admin/jobs/bulk-moderate` (several, chosen in `admin.api.ts:193-199`); GET `/exports/jobs` |
| `/admin/jobs/:jobId` | `AdminJobDetailPage.tsx` | — | GET `/admin/jobs/:id`; POST `.../status` |
| `/admin/applications` | `AdminApplicationsPage.tsx` | `ExportButton` | GET `/admin/applications?page&q&statusId&stage&jobId`; GET `/exports/applications` |
| `/admin/applications/:mapId` | `AdminApplicationDetailPage.tsx` | `NextStepLink` (deep link to Q1/Q2/Q3 owner) | GET `/admin/applications/:id` (read-only) |
| `/admin/blog` | `BlogCmsPage.tsx` | editor | GET/POST `/admin/blog-posts`; PATCH/DELETE `/admin/blog-posts/:id` |
| `/admin/settings` | `AdminSettingsPage.tsx` | form | GET/PATCH `/admin/settings` (stored, not enforced) |
| `/admin/reports` | `ReportsPage.tsx` | `ExportButton` | GET `/admin/stats`; GET `/exports/users|jobs|applications|payments?format=csv&from&to` |
| `/admin/audit` | `AdminAuditLogPage.tsx` | — | GET `/admin/audit-logs?page&action&entity&userId` |

`POST /admin/users/bulk-delete` has no admin UI.

---

## 4. Key forms and actions

Column "Wired?": **yes** = calls a real endpoint and handles the result; **no-op** = nothing reaches the server; **broken** = reaches the server but cannot succeed or mis-reports.

### 4.1 Auth

| Action | Component | Validation | API | Success | Failure | Wired? |
|---|---|---|---|---|---|---|
| Login | `features/auth/pages/LoginPage.tsx` | zod `loginSchema` (userName, password min 1; `auth.types.ts:22-26`) | POST `/auth/login` | wrong door → revoke + toast; else `setSession`, toast, `navigate(from ?? ROLE_HOME)` | toast with API message | yes |
| Register candidate | `RegisterPage.tsx` | zod `registerSchema`: fullName 2-100, email, ISO2 country, mobile 4-15 digits (IN `^[6-9]\d{9}$`), password 8-72 | POST `/auth/register` | stores challenge, toast "OTP sent" (non-prod shows `devCode`) | toast API message | yes |
| OTP verify / resend | `features/auth/components/OtpVerification.tsx` | 6 digits, auto-submit, countdown | POST `/auth/verify-otp`, `/auth/resend-otp` | `setSession` → `/candidate/onboarding` | inline aria-live error; 429 uses `retryAfterSeconds` | yes |
| Register employer | `EmployerRegisterPage.tsx` | RHF only: companyName, emailCompany required + regex | POST `/auth/register-employer` (blank fields sent as `''`) | "under review" screen | toast API message | **broken** when HR email is left blank (`''` fails `@IsOptional() @IsEmail()`) |
| Forgot password | `ForgotPasswordPage.tsx` | zod userName min 1 | POST `/auth/forgot-password` | success Alert | **no onError, no error UI** | yes (silent on failure) |
| Reset password | `ResetPasswordPage.tsx` | zod token, password ≥8, confirm match | POST `/auth/reset-password` | toast + `/login` | generic toast (token errors not distinguished) | yes |
| Social login | `features/auth/components/SocialLoginButtons.tsx` | — | `window.location.href='/auth/google|linkedin'` | — | — | no-op: disabled unless `VITE_OAUTH_ENABLED=1`; no API route exists |
| Logout | `ProfilePanel.tsx`, `EmployerHeader.tsx`, `DashboardLayout.tsx` | — | POST `/auth/logout` | tokens cleared; route guard redirects | errors swallowed | yes (cache not cleared, §5) |

### 4.2 Candidate

| Action | Component | Validation | API | Success | Failure | Wired? |
|---|---|---|---|---|---|---|
| Wizard: Personal | `portal/wizard/PersonalStep.tsx` | zod: fullName ≥2, mobile ≥10 chars, optional email/LinkedIn URL, experience unless fresher | PUT `/candidates/me/personal`, `/headline`, `/professional`, `/accomplishments` (only changed parts) | invalidates `['candidate','cv-edit']`, `['candidate','profile','me']`; next step | inline "Could not save" | yes (blank gender sent as `'M'`) |
| Wizard: Summary / Experience / Projects | `SummaryStep.tsx`, `ExperienceStep.tsx`, `ProjectsStep.tsx` | company / title required | PUT `/summary`; PUT/DELETE `/employment`, `/projects` | next step | inline | yes |
| Wizard: Education | `EducationStep.tsx` | zod `educationDraftSchema` (`wizard/validation.ts:32-78`) | GET `/candidates/me/institutes` (250 ms debounce); PUT/DELETE `/education` | next step | per-field | yes |
| Wizard: Skills / Preferences | `SkillsStep.tsx`, `PreferencesStep.tsx` | non-empty entries | PUT `/key-skills`, PUT/DELETE `/languages`, `/it-skills`; PUT `/career-profile`, `/professional` | next step | inline | yes |
| Wizard: Resume | `ResumeStep.tsx` | PDF only, ≤5 MB (client) | POST `/files/resume` (progress) | invalidates profile | 413 → "too large" | yes |
| Complete onboarding | `portal/pages/ProfileWizardPage.tsx` | — | POST `/candidates/me/complete-onboarding` | `updateUser({isOnboarded:true})`, toast, `/candidate/profile` | navigates to `/candidate/profile` anyway → guard bounces back to wizard, no message | yes (failure path loops — *runtime verification needed*) |
| Profile photo | `ProfileHero` → `features/candidates/components/ProfilePhotoUpload.tsx`; Account personal tab | size check | POST `/files/avatar` | invalidate, toast | toast | yes |
| Resume builder | `portal/pages/ResumeBuilderPage.tsx` | — | none (html2canvas + jsPDF) | downloads PDF | toast | yes (client-only, raster PDF) |
| Home search bar | `features/jobs/components/JobSearchBar.tsx` | — | navigates `/jobs?designation=…&location=…` | — | — | **broken**: `JobSearchPage` reads `q`, keyword dropped |
| Job search filters | `JobSearchPage.tsx` | — | GET `/jobs` with array params | results | `ErrorState` + retry | yes; arrays may 400 (§5, potential) |
| Save / unsave job | `JobSearchPage`, `JobDetailPage`, `SavedJobsPage` | — | POST/DELETE `/candidates/me/saved-jobs/:jobId` | invalidates `['candidate','saved-jobs']`, `['candidate','saved-job-ids']` | silent | yes |
| Apply | `features/jobs/pages/JobApplyPage.tsx` | hand-rolled required fields + email regex | POST `/jobs/:id/apply`; POST `/files/resume` | "done" stage with reference; invalidates `['candidate','applied-jobs']`, `['candidate','dashboard']` | 403 → `/candidate/subscription?returnTo=…`; **any 400 → "already applied"** | yes (400 mislabelled) |
| Pick interview slot | `portal/components/InterviewSlotPicker.tsx` | — | POST `/recruitment/interview-rounds/:roundId/select-slot` | toast; invalidates `['recruitment','interview-rounds']` | toast | yes |
| Accept / decline offer | `portal/components/OfferResponseCard.tsx` | — | POST `/recruitment/offers/:id/respond {accept}` | toast; invalidates `['recruitment','offers']` | toast | yes |
| Upload document | `portal/pages/DocumentsPage.tsx` | `.pdf,.jpg,.png`; disabled if no `documentTypeId` | POST `/candidates/me/documents/:documentTypeId` | toast; invalidates `['candidate','documents']` | 413 / generic inline | yes |
| Refer a friend | `portal/pages/ReferPage.tsx` | name + email required | POST `/candidates/me/referrals` | toast "Invite sent"; invalidates `['candidate','referrals']` | toast | **partly**: no email is sent; `/register?ref=` is never read |
| Personal info | `AccountSettingsPage.tsx` (PersonalInfoTab) | none | PUT `/candidates/me/personal` | toast | toast | yes (gender default `'M'`) |
| Change password | AccountSettings SecurityTab | new ≥8, confirm | POST `/candidates/me/change-password` | toast, reset | any 400 → "current password not correct" | yes |
| Privacy / email prefs | PrivacyTab; `EmailPreferencesPage.tsx` | — | GET/PUT `/candidates/me/privacy`, `/notification-prefs` | toast | toast | yes, but stored values are read by no API code |
| Data export | DangerZoneTab | — | POST `/candidates/me/export` (202) | toast "we will email you" | toast | **no-op downstream**: API only stamps a date |
| Delete account | DangerZoneTab + `ConfirmDialog` | confirm | POST `/candidates/me/delete-account` | toast, `logout()`, `/` | toast | yes (deactivates login) |
| Buy membership | `PricingPlans` → `SubscribeButton` → `RazorpayCheckout` | guest → `/login` | POST `/payments/create-order`, `/payments/verify` | invalidates `['payments','subscription']`, toast, `returnTo` or `/payment/return` | toast; cancel silent | yes |
| Payment return | `PaymentReturnPage.tsx` | — | GET `/payments/orders/:ref` poll; POST `/payments/verify` fallback | invalidate subscription, clear `aaj.lastOrderRef` | timed-out state | yes |
| Withdraw application / request reschedule | — | — | none | — | — | **Missing implementation** (no UI, no candidate API) |

### 4.3 Employer

| Action | Component | Validation | API | Success | Failure | Wired? |
|---|---|---|---|---|---|---|
| Post / edit job (publish or draft) | `employer/pages/ManageJobs/AddJob/AddJobPage.tsx` | hand-rolled: publish needs position, type, mode, minExp, city, education, industry, department, ≥1 skill, description; CTC and rounds ranges; scrolls to first error | POST `/clients/me/jobs[?draft=true]`, PATCH `/clients/me/jobs/:id[?draft=]` | navigate to list/drafts; invalidates `['employer','jobs']` | banner with API message | yes |
| Close / activate / archive / unarchive / delete job | `JobListPage.tsx` (+ `ConfirmDialog` for delete/archive) | — | POST `.../status`, `.../archive`, `.../activate`; DELETE | invalidates `['employer','jobs']` | `actionError` banner | yes |
| Bulk import | `BulkImportPage.tsx` | `.csv` | POST `/clients/me/jobs/bulk-upload?commit=false` then `true` | commit invalidates jobs | shows axios generic message, not API message | yes (poor error text) |
| Applicant decision / undo | `ApplicantListPage`, `ApplicantProfilePage`, `ComparePage` (+ `utils/decisionConfirm.ts`) | confirm | POST `.../decision {Shortlisted|Hired|Rejected}`, `.../decision/undo` | invalidates `['employer','applicants']`, `['employer','analytics']`, `['employer','billing']` (+ rounds on undo) | banner | yes |
| Schedule interview | `ScheduleInterviewForm.tsx` | HR + interviewer name/email, optional guest pair, venue for face-to-face, 3 distinct future slots | POST `.../interview-rounds` | invalidates applicants/analytics/rounds | inline | yes |
| Record round result | `InterviewProcessPanel.tsx` | — | POST `.../interview-rounds/:roundId/result` | invalidates pipeline + billing | inline | yes |
| Notes | `ApplicantProfilePage.tsx` | non-empty | PUT `.../notes {note}` | invalidates notes | banner | yes |
| Request / review documents | `RequestDocumentsForm.tsx`, `ApplicantDocumentsPanel.tsx` | ≥1 name | POST `.../document-request`, `.../documents/review` | invalidates docs | inline | yes |
| Offer create / send / mark joined | `ApplicantProfilePage.tsx` | salary required | POST `/recruitment/offers`, `.../send`, `.../mark-joined` | refetch offer | banner | yes |
| Company profile + logo | `CompleteProfile/CompleteProfilePage.tsx` | none (`noValidate`, `*` markers only) | PATCH `/clients/me`; POST `/clients/me/logo` | inline "saved" | inline API message | yes |
| Analytics / billing CSV | `AnalyticsPage.tsx`, `BillingPage.tsx` | — | GET `.../analytics/export`, `.../billing/export` (blob) | download | — | yes |
| Team, change password, messages, notifications | `SettingsPage`, `MessagesPage`, `NotificationsPage` | — | none | — | — | **Missing implementation** |

### 4.4 Q1 / Q2 / Q3 staff

| Action | Component | Validation / confirm | API | Success | Failure | Wired? |
|---|---|---|---|---|---|---|
| Q1 checklist toggle / select all | `features/q1/components/ScreeningRail.tsx` | — | PATCH `/q1/candidates/:id/checklist`, `/checklist/all` | invalidates `['q1']` | toast with server message | yes |
| Q1 Mark verified | `ScreeningRail.tsx` (only at 100% completeness) | — | POST `.../verify` | toast + invalidate | toast | yes |
| Q1 Contact candidate | `ContactCandidateModal.tsx` | modal | POST `.../contact {channel, reason, internalNote}` | toast, then opens `UpdateStatusModal` | toast | yes (logs only; nothing is sent) |
| Q1 Update status | `UpdateStatusModal.tsx` | date not past, attempts 0-99, reason required | POST `.../status` | toast + invalidate | toast | yes; reachable only after a contact |
| Q1 Request update / request CV | `ScreeningRail.tsx`, `Q1CandidateProfilePage.tsx` | — | POST `.../request-update`, `.../request-cv` | toast | toast | yes |
| Q1 View / download CV (4 buttons) | `Q1CandidateProfilePage.tsx:138,144,277,284` | — | `window.open('/api/recruitment/candidates/:id/resume')` | — | — | **broken** (401, no bearer) |
| Q2 Toggle criterion | `Q2ApplicantDetailPage.tsx:92-97` | — | PATCH `.../criteria` | `setQueryData` | toast | yes |
| Q2 Forward / Send back / Reject | `Q2ApplicantDetailPage.tsx:172-198` | **no confirmation, no reason** | POST `.../forward|send-back|reject` with `{}` | toast + invalidate `['q2']` | fixed-text toast | yes (final decisions without confirm) |
| Q2 Preview resume | `Q2ApplicantDetailPage.tsx:288-296` | — | `<a href="/api/recruitment/candidates/:id/resume">` | — | — | **broken** (401) |
| Q3 Forward / return CVs | `Q3ReferredCvsPage.tsx`, `ReturnToQ2Modal.tsx` | return: reason required | POST `/q3/referrals/forward`, `/return` | toast; forward navigates to `/q3/company-review` | toast | yes |
| Q3 Round setup | `RoundSetupModal.tsx` | modal form | PUT `.../round-setup` | toast | toast | yes (no "company rejected" option) |
| Q3 Confirm slot & send invites | `Q3SchedulingPage.tsx:629-656` | slot required; http(s) link for virtual; ≥1 recipient | POST `/q3/rounds/:r/confirm` | toast "Invites sent" | toast | yes |
| Q3 Call / Email candidate | `Q3SchedulingPage.tsx:150-178` | — | Call: POST `.../contact` then `tel:`; Email: `mailto:` only | toast | — | Call yes (logged before call); Email client-only, not logged |
| Q3 Interview-day actions | `Q3InterviewsPage.tsx:727-758` | none (reschedule unconfirmed) | POST `/q3/rounds/:r/remind|checklist|reschedule|conducted` | toast; navigation to scheduling/decisions | toast | yes |
| Q3 Record decision | `RecordDecisionModal.tsx` | modal | POST `/q3/rounds/:r/decision` | toast; Selected → `/q3/documents/:mapId` | toast | yes |
| Q3 Documents verify / send back / forward / approve | `Q3DocumentsPage.tsx`, `SendBackModal` | send-back comment; approve confirm | POST `/q3/documents/:id/verify|send-back`, `.../documents/forward|approve` | toast | toast | yes |
| Q3 Generate offer / mark joined | `GenerateOfferModal.tsx`, `Q3DocumentsPage.tsx` | modal / confirm | POST `.../offer`, `.../joined` | toast | toast | yes (no resend/revise/withdraw) |
| Q3 Export report | `Q3DashboardPage.tsx:294-341`, `q3-report.ts` | — | GET `/q3/report?quarter` → jsPDF | download | toast | yes |

### 4.5 Legacy recruitment and admin

| Action | Component | Validation / confirm | API | Success | Failure | Wired? |
|---|---|---|---|---|---|---|
| Candidate decision | `features/recruitment/pages/CandidateDetailsPage.tsx` | reason modal (except Approve) | POST `/recruitment/candidates/:id/decision` | toast + invalidate | toast | yes |
| Assign job | same | modal | POST `.../assign-job` | toast | toast | yes, but **no query invalidation** (`useAssignJob`) |
| Refer to Q3 / score | same | — | POST `/recruitment/referrals`; POST `/recruitment/applications/:id/score` | toast / breakdown modal | toast | yes |
| Schedule interview | `InterviewsPage.tsx` | RHF + zod modal | POST `/recruitment/interviews` | toast + invalidate | toast | yes |
| Complete / cancel interview | `InterviewsPage.tsx:58-62` | **no confirm** | POST `/recruitment/interviews/:id/status` | toast | **no onError (silent)** | yes (silent failures) |
| Round create / result | `InterviewRoundsPanel.tsx` | — | POST `/recruitment/interview-rounds`, `.../result` | toast | toast | yes (`next` never sent) |
| Approve / reject employer | `features/admin/pages/AdminEmployerApprovalsPage.tsx` | two-step modal; approval needs city | POST `/admin/employer-registrations/:id/review` | toast; invalidate `['admin']` | toast (409 on repeat) | yes |
| Activate / deactivate / change role / reset password | `AdminUserDetailPage.tsx` | `ConfirmDialog`; self disabled; staff roles only | PATCH `/admin/users/:id`; POST `.../password-reset` | toast / `SetPasswordNotice` | toast | yes |
| Bulk user update / create staff | `AdminUsersPage.tsx` | `ConfirmDialog` / RHF | POST `/admin/users/bulk-update`, `/admin/users` | toast / `SetPasswordNotice` | toast / inline | yes |
| Close / reopen job | `AdminJobsPage.tsx`, `AdminJobDetailPage.tsx` | `ConfirmDialog` | POST `/admin/jobs/:id/status`, `/bulk-moderate` | toast | toast | yes |
| Save settings | `AdminSettingsPage.tsx` | none (empty number → 0) | PATCH `/admin/settings` (whole form) | toast + invalidate | toast | yes, but settings are not enforced; may save defaults if GET failed (potential) |
| Blog create / edit / publish / delete | `BlogCmsPage.tsx` | `ConfirmDialog` on delete | POST/PATCH/DELETE `/admin/blog-posts` | toast; invalidate `['admin','blog-posts']` | toast | yes (posts never shown publicly) |
| CSV exports | `features/admin/components/ExportButton.tsx` | — | GET `/exports/*?format=csv&from&to` (blob) | download | toast "Export failed" | yes |

---

## 5. Dead or broken UI

### 5.1 Confirmed issues

| # | Issue | Evidence (file) |
|---|---|---|
| C1 | Q1 and Q2 CV view/download open `/api/recruitment/candidates/:id/resume` by top-level navigation → 401 "Missing bearer token" | `features/q1/pages/Q1CandidateProfilePage.tsx:138,144,277,284`; `features/q2/pages/Q2ApplicantDetailPage.tsx:288-296`; `apps/api/src/common/guards/jwt-auth.guard.ts:34-35` |
| C2 | Legacy Q3 screens 403: `/recruitment/q3/candidates`, `/interviews`, `/documents` call endpoints restricted to QC1/QC2/Admin; they are the Q3 sidebar links in `DashboardLayout`. Interviews page ignores `isError` and shows "no interviews" | `routes/router.tsx:428-430`; `components/layout/menu.ts:107-111`; `apps/api/src/modules/recruitment/recruitment.controller.ts:36` |
| C3 | Public pages call endpoints that do not exist: `/search`, `/candidates/:id/profile` (target of every candidate's "Share Profile" in `ProfileHero.tsx`), `/clients/:id/reviews` (widget on `/companies/:id`), `/companies/:id/reviews`, `/jobs/salary-insights` (400) | §3.1; [API_DOCUMENTATION.md §18](API_DOCUMENTATION.md#18-frontend-calls-with-no-backend-route) |
| C4 | Home search keyword dropped: `JobSearchBar` writes `?designation=`, `JobSearchPage` reads `q` | `features/jobs/components/JobSearchBar.tsx:23`; `features/jobs/pages/JobSearchPage.tsx:56` |
| C5 | Contact form shows success but sends nothing (`setTimeout` 600 ms) | `features/public/pages/ContactPage.tsx:29-33` |
| C6 | Resume "View" link is `<a href="/files/resume">` (no `/api`, no bearer) → SPA 404; neighbouring Download works | `features/candidates/portal/components/ProfileAsideCards.tsx:150-156` |
| C7 | Employer registration fails with blank HR email (`''` vs `@IsOptional() @IsEmail()`) | `features/auth/pages/EmployerRegisterPage.tsx:35-45,121-125`; `apps/api/src/modules/auth/dto/auth.dto.ts:177-180` |
| C8 | Forgot password has no failure feedback | `features/auth/pages/ForgotPasswordPage.tsx:21` |
| C9 | Job apply reports every 400 as "already applied" | `features/jobs/pages/JobApplyPage.tsx:126-129` |
| C10 | Bulk import shows axios' generic message instead of the API message | `employer/pages/ManageJobs/BulkImport/BulkImportPage.tsx:62` |
| C11 | Dead links: CommandPalette → `/candidate/settings` (unregistered; also shows candidate/employer items to every role); PWA shortcut → `/candidate/applied-jobs` (commented out); CareerPage canonical `/careers` vs route `/career`; `MobileBottomNav` (unmounted) → `/candidate/messages`; `DashboardStats` (orphan) → `/candidate/applied-jobs` | `components/CommandPalette.tsx:52-64`; `apps/web/vite.config.ts:79`; `features/public/pages/CareerPage.tsx:22` |
| C12 | Employer header bell always shows a red unread dot and opens a static page; sidebar badges hard-coded `0` | `employer/components/Header/EmployerHeader.tsx:96-98`; `employer/layouts/EmployerLayout.tsx:71` |
| C13 | Portal unread badge counts only SSE events since header mount; never loads stored notifications | `hooks/useRealtimeNotifications.ts` |
| C14 | Referral "Invite sent" toast but no email/SMS; `ref` query param never read by `RegisterPage` | `features/candidates/portal/pages/ReferPage.tsx:42,61-64` |
| C15 | Logout leaves the React Query cache, offline queue and `aaj.lastOrderRef` intact (client-side navigation) | `features/auth/auth.store.ts:35-41`; `lib/queryClient.ts` |
| C16 | Wizard and Account settings default blank gender to `'M'` | `portal/wizard/PersonalStep.tsx:116`; `portal/pages/AccountSettingsPage.tsx:113` |
| C17 | Q2 Forward / Send back / Reject: final decisions with no confirmation and no reason (API accepts `note`) | `features/q2/pages/Q2ApplicantDetailPage.tsx:172-198`; `features/q2/q2.api.ts:122-144` |
| C18 | Legacy `InterviewsPage` Complete/Cancel: no confirm, no `onError`; `QC1DashboardPage` and legacy `Q3DashboardPage` have no error branch (skeleton forever) | `features/recruitment/pages/InterviewsPage.tsx:58-62`; `QC1DashboardPage.tsx:17,38`; `recruitment/pages/Q3DashboardPage.tsx:21` |
| C19 | `useAssignJob` has no invalidation | `features/recruitment/recruitment.api.ts:105-110` |

### 5.2 Potential issues (needs runtime verification)

| # | Issue | Evidence |
|---|---|---|
| P1 | Job search array filters sent as `employmentTypes[]=…` (no `paramsSerializer`) may be rejected by `forbidNonWhitelisted` under Express 5's simple query parser; E2E mocks hide it | `lib/axios.ts`; `apps/api/src/main.ts:36-41`; `apps/api/src/modules/jobs/dto/jobs.dto.ts:61-78` |
| P2 | Onboarding completion failure loops back to step 1 without a message | `features/candidates/portal/pages/ProfileWizardPage.tsx:75` |
| P3 | Hard-coded `/api` prefixes bypass `env.apiBaseUrl` (logo `<img>`, Student book link) | `employer/pages/CompleteProfile/CompleteProfilePage.tsx` (~l.166); `features/public/pages/StudentGuidePage.tsx:13` |
| P4 | N+1 load: `ApplicationsPage` issues 2 extra GETs per application, and polls every 60 s | `features/candidates/portal/pages/ApplicationsPage.tsx` |
| P5 | Employer filter dropdowns load only 100 jobs/applicants | `ApplicantListPage.tsx:82`; `ComparePage.tsx:248` |
| P6 | Admin inside `/company/*` gets 404s from `/clients/me/*` | `components/layout/menu.ts:95-105` |
| P7 | `AdminSettingsPage` can PATCH defaults if the initial GET failed; empty numbers become 0 | `features/admin/pages/AdminSettingsPage.tsx:130-155,297,323-335` |
| P8 | `GET /q1/candidates/:id` mutates state (New → Screening) on any refetch or admin peek | `apps/api/src/modules/q1/q1.controller.ts:51-55` |
| P9 | Legacy photo fallback `/files/no-image.png` may not exist | `features/recruitment/pages/CandidateDetailsPage.tsx:170` |
| P10 | Q1/Q2 topbar quick search pushes one history entry per keystroke | `Q1Shell.tsx:190-196`; `Q2Shell.tsx:261-264` |
| P11 | Refresh token in localStorage is readable by any XSS | `lib/tokenStorage.ts:18-21` |

### 5.3 Missing implementation

| Area | What is missing | Evidence |
|---|---|---|
| Candidate | Withdraw application; request interview reschedule (only Q3 has an endpoint) | no UI, no candidate API |
| Candidate | Editors for diversity, personal details, accomplishments other than LinkedIn, GitHub link — only editor `/candidate/profile/advanced` is commented out | `routes/router.tsx:370-373` |
| Candidate | Data export processor, account purge job; consumers of privacy and email preferences | [API_DOCUMENTATION.md §3](API_DOCUMENTATION.md#3-candidates--apicandidates) |
| Employer | Messaging, notifications, settings/team, employer change password, job duplicate (`useDuplicateJob` unused), bulk applicant actions (`useBulkDecideApplicants` unused), branding | §3.5 |
| Public | Public blog from CMS, company reviews, salary insights, global search, public candidate profile, OAuth | §3.1 |
| Q1 | Contact-log UI (`useQ1ContactLog` unused); direct "Update status" entry | `features/q1/q1.api.ts:58`; `ContactCandidateModal.tsx:52-58` |
| Q3 | Record a company rejection from Company Review; offer resend/revise/withdraw ("Declined"/"Expired" are disabled dead ends) | `Q3CompanyReviewPage.tsx`; `Q3DocumentsPage.tsx:770-773` |
| Admin | Bulk delete UI (`POST /admin/users/bulk-delete`) | `admin.controller.ts:80` |

### 5.4 Orphan code and mocked / hard-coded data (Improvement recommendation)

| Item | Path | Note |
|---|---|---|
| Orphan components (imported by nothing) | `features/jobs/components/{SaveJobButton (wrong endpoint), CompareDrawer, AdvancedSearchModal, ApplicationQuestionnaire}.tsx`; `features/candidates/components/{ResumeImport, JobRecommendations, DashboardStats, ProfileCompletionMeter, SavedSearches, DashboardWidgets}.tsx`; `features/dashboard/DashboardHome.tsx`; `features/clients/components/*` (AnalyticsDashboard, ApplicantNotesModal, BulkEmailUpload → non-existent `/clients/me/campaigns/bulk`, EmployerDashboardStats, JobQuestionsEditor, ScheduleInterviewModal, VideoInterviewSetup); `components/PushNotificationPrompt.tsx` (non-existent `/notifications/subscribe`); `components/layout/MobileBottomNav.tsx`; `features/messaging/MessagingPage.tsx` (non-existent `/messaging/*`); `features/dev/ComponentShowcase.tsx`; `features/misc/ErrorPage.tsx`; `components/NotificationBell.tsx` (shells use `components/layout/NotificationBell`); AnimatedCounter, KeyboardShortcutsHelp, OptimizedImage, PageSkeleton, QueryErrorBoundary, WhatsAppShare *(grep-based, inferred)* | Remove or wire up |
| Commented-out pages still in tree | `features/candidates/pages/{CandidateProfile, CvManager, AppliedJobs, ResumePreview, JobAlerts, ChangePassword, AssessmentsList, SkillAssessment, SavedSearches, SkillGap, InterviewCalendar, ActivityTimeline, CareerPath, CompanyComparison}Page.tsx` — several call non-existent endpoints (`/candidates/me/assessments`, `/skill-gap`, `/career-path`, `/interviews/calendar`, PATCH saved-searches) | Unreachable |
| Deprecated re-exports | `features/clients/client.api.ts`, `client.types.ts` | — |
| Aspirational types | `types/api.ts` (used only by `test-utils/apiMocks.ts`; shapes differ from the API) | — |
| Hard-coded data | `features/public/blogs.data.ts`, `pricing.data.ts`, `services.data.ts`, PlanComparison, testimonials, About/Help/Legal; profile "Profile Views" tile fixed "—" (`ProfileOverviewPage.tsx:269`); "Last 30 days" caption *(dashboard endpoint not date-filtered — inferred)* | `PricingPlans` itself is live |
| Disabled placeholders | Google/LinkedIn login; Account 2FA and Connected Accounts toggles | — |
| MSW fixtures | `mocks/handlers.ts` (713 lines), `mocks/data.ts` (1201 lines) — dev/CI only | Only with `VITE_USE_MOCKS=1` |

---

## 6. Duplicate screens: legacy `/recruitment/*` vs `/q1` `/q2` `/q3`

**Canonical staff UI: `/q1/*`, `/q2/*`, `/q3/*` and `/admin/*`** (each role's `ROLE_HOME` points there). `/recruitment/*` is legacy; router comments say it is "untouched and still reachable" (`routes/router.tsx:261, 282, 303`).

| Function | Canonical | Legacy duplicate | Still linked from |
|---|---|---|---|
| QC1 dashboard / queue | `/q1/dashboard`, `/q1/candidates` | `/recruitment/qc1`, `/recruitment/candidates` | QC1 legacy menu links `/q1/dashboard`, `/q1/candidates` **and** `/recruitment/documents`, `/recruitment/interviews` (`menu.ts:82-86`) |
| Candidate review / decision | `/q1/candidates/:id` (screening state in `tblSubscriberScreening`) | `/recruitment/candidates/:id` (registration decision) | QC2 legacy menu `/recruitment/candidates` (`menu.ts:88-91`). Two state models, not reconciled in the UI *(inferred)* |
| Refer to Q3 | `/q2/applications/:mapId` → POST `/q2/applications/:mapId/forward` | `CandidateDetailsPage` "Refer to Q3" → POST `/recruitment/referrals` | Both reachable; same referral pipeline *(inferred)* |
| Q2 referral tracking | `/q2/forwarded` | `/recruitment/referrals` | QC2 legacy menu `/recruitment/referrals`; **the QC2 legacy menu has no `/q2` link** |
| Q3 dashboard / forwarding | `/q3/dashboard`, `/q3/referred` | `/recruitment/q3` (forward + `InterviewRoundsPanel`) | Q3 legacy menu (`menu.ts:107-111`) links only `/recruitment/q3/*`, three of which 403 (C2); **no `/q3` link** |
| Interview rounds / results | `/q3/scheduling`, `/q3/interviews`, `/q3/decisions` | `InterviewRoundsPanel` and `/recruitment/interviews` (single-interview model) | QC1 legacy menu `/recruitment/interviews` |
| Document review | `/q3/documents` (per application) | `/recruitment/documents`, `/recruitment/q3/documents` | QC1, QC2, Q3 legacy menus |
| Offer / joined | `/q3/offers` (POST `/q3/.../offer`, `/joined`) | `/recruitment/offers*` (used by the employer portal, not by a legacy staff page) | employer `ApplicantProfilePage` |

The legacy menu is shown only inside `DashboardLayout`; the new shells have their own sidebars. A staff user who lands on any `/recruitment/*` page sees the legacy menu.

---

## 7. Mobile responsiveness (static evidence only)

> Read from Tailwind classes and handlers. **Needs runtime verification** on real devices; only the admin shell and Q2 have automated viewport checks (see [TESTING_AND_ISSUES.md](TESTING_AND_ISSUES.md)).

| Shell / area | Navigation below breakpoint | Tables / content | Gaps seen in code |
|---|---|---|---|
| Public `Navbar` (`components/layout/Navbar.tsx:97-117`) | Below `md`, all links collapse into one "Menu" dropdown; desktop pills `hidden md:block` | — | No signed-in state in the navbar *(inferred)* |
| Candidate `PortalHeader` | Links `hidden lg:flex`; hamburger `lg:hidden` toggles a disclosure list; wordmark `sr-only` below 374 px | Portal stacks sidebar over content below `lg` (`flex-col lg:flex-row`, sidebar `w-full lg:w-80`); `ModuleTiles` `grid-cols-2 sm:grid-cols-3 lg:grid-cols-2`; wizard `StepDots` hidden below `sm` | `MobileBottomNav` exists but is not mounted |
| `DashboardLayout` (legacy) | Hamburger `lg:hidden`; `Sidebar` fixed drawer `max-w-[85vw]`, overlay; closes on navigation (`DashboardLayout.tsx:67`) | Shared `components/ui/Table.tsx` `min-w-[640px]` + horizontal scroll; Membership history `overflow-x-auto` | — |
| `EmployerLayout` | `EmployerSidebar` fixed drawer (`-translate-x-full` / `lg:translate-x-0`), overlay, closes on route change and Escape (`EmployerLayout.tsx:24-34`); collapse persisted in `aaj.employer.sidebar.collapsed` | `employer/components/Tables/DataTable.tsx:34` `overflow-x-auto` + column-visibility menu (no card view) | Few breakpoint classes on employer pages; dense tables likely scroll sideways *(inferred)* |
| `Q1Shell` | Sidebar `hidden lg:block`; hamburger drawer with backdrop, closes on link/popstate | `CandidateQueue` switches to stacked cards below `md` | Quick search hidden below `md`; drawer lacks Escape, focus trap, scroll lock |
| `Q2Shell` | Same drawer; desktop collapse toggle persisted | `ApplicantsTable` / `EmployerJobsTable` `overflow-x-auto` + `min-w-[58rem]`/`[54rem]` | Quick search hidden below `md` |
| `Q3Shell` | Drawer closes on pathname change | Tables with `min-w` 714–1126 px inside `overflow-x-auto` (`Q3ReturnedPage.tsx:109`, `Q3ReferredCvsPage.tsx:197`, `Q3DocumentsPage.tsx:234,338`, `Q3DashboardPage.tsx:199`, `Q3InterviewsPage.tsx:380`, `Q3CompanyReviewPage.tsx:111`) | Search hidden below `md`; no Escape on drawer; cramped on phones |
| `AdminShell` | `role=dialog aria-modal` drawer with Escape, body scroll lock, closes on route change; desktop collapse persisted | Admin `DataTable` (`features/admin/components/primitives.tsx:147-253`) renders a card list below `md` | Best of the shells |
