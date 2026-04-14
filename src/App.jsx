import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Auth0ProviderWithNavigate from "@/auth/Auth0ProviderWithNavigate";
import { UserProvider } from "@/auth/UserProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

import LandingPage from "@/pages/LandingPage";
import CallbackPage from "@/pages/CallbackPage";
import InvitePage from "@/pages/InvitePage";
import OnboardingPage from "@/pages/OnboardingPage";
import ProfilePage from "@/pages/ProfilePage";
import ProjectPickerPage from "@/pages/ProjectPickerPage";
import CreateWorkflowPage from "@/pages/CreateWorkflowPage";
import WorkflowDetailPage from "@/pages/WorkflowDetailPage";
import WorkflowBuilderPage from "@/pages/WorkflowBuilderPage";
import WorkflowsPage from "@/pages/WorkflowsPage";
import CreateJobPage from "@/pages/CreateJobPage";
import JobDetailPage from "@/pages/JobDetailPage";
import ProjectOverviewPage from "@/pages/project/ProjectOverviewPage";
import ProjectSitesPage from "@/pages/project/ProjectSitesPage";
import SiteDetailPage from "@/pages/project/SiteDetailPage";
import ProjectJobsPage from "@/pages/project/ProjectJobsPage";
import ProjectSettingsPage from "@/pages/project/ProjectSettingsPage";
import AuthGuard from "@/auth/AuthGuard";

const ViewerPage = lazy(() => import("@/pages/ViewerPage"));
const ViewerTestPage = lazy(() => import("@/pages/ViewerTestPage"));

function LazyFallback() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <Loader2 size={16} className="animate-spin text-text-muted" />
    </div>
  );
}

function Guarded({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Auth0ProviderWithNavigate>
        <QueryClientProvider client={queryClient}>
        <UserProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/callback" element={<CallbackPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/viewer-test" element={<Suspense fallback={<LazyFallback />}><ViewerTestPage /></Suspense>} />

            {/* Auth */}
            <Route path="/onboarding" element={<Guarded><OnboardingPage /></Guarded>} />
            <Route path="/profile" element={<Guarded><ProfilePage /></Guarded>} />

            {/* Project picker (new home screen) */}
            <Route path="/projects" element={<Guarded><ProjectPickerPage /></Guarded>} />
            <Route path="/dashboard" element={<Navigate to="/projects" replace />} />

            {/* Project-scoped views */}
            <Route path="/projects/:id" element={<Guarded><ProjectOverviewPage /></Guarded>} />
            <Route path="/projects/:id/sites" element={<Guarded><ProjectSitesPage /></Guarded>} />
            <Route path="/projects/:id/sites/:siteId" element={<Guarded><SiteDetailPage /></Guarded>} />
            <Route path="/projects/:id/jobs" element={<Guarded><ProjectJobsPage /></Guarded>} />
            <Route path="/projects/:id/groups" element={<Guarded><ProjectSettingsPage /></Guarded>} />
            <Route path="/projects/:id/members" element={<Guarded><ProjectSettingsPage /></Guarded>} />
            <Route path="/projects/:id/settings" element={<Guarded><ProjectSettingsPage /></Guarded>} />
            <Route path="/projects/:id/workflows" element={<Guarded><WorkflowsPage /></Guarded>} />
            <Route path="/projects/:id/workflows/new" element={<Guarded><CreateWorkflowPage /></Guarded>} />
            <Route path="/projects/:id/workflows/:wid" element={<Guarded><WorkflowDetailPage /></Guarded>} />
            <Route path="/projects/:id/workflows/:wid/builder" element={<Guarded><WorkflowBuilderPage /></Guarded>} />

            {/* Legacy org-level workflow routes → redirect to projects */}
            <Route path="/workflows" element={<Navigate to="/projects" replace />} />
            <Route path="/workflows/*" element={<Navigate to="/projects" replace />} />
            <Route path="/sites" element={<Navigate to="/projects" replace />} />
            <Route path="/groups" element={<Navigate to="/projects" replace />} />
            <Route path="/groups/:id" element={<Navigate to="/projects" replace />} />

            {/* Jobs inside projects */}
            <Route path="/projects/:id/jobs/new" element={<Guarded><CreateJobPage /></Guarded>} />
            <Route path="/projects/:id/jobs/:jobId" element={<Guarded><JobDetailPage /></Guarded>} />

            {/* Legacy flat job routes */}
            <Route path="/jobs" element={<Navigate to="/projects" replace />} />
            <Route path="/jobs/new" element={<Navigate to="/projects" replace />} />
            <Route path="/jobs/:jobId" element={<Guarded><JobDetailPage /></Guarded>} />

            {/* Legacy redirects */}
            <Route path="/teams" element={<Navigate to="/projects" replace />} />
            <Route path="/teams/:id" element={<Navigate to="/projects" replace />} />
          </Routes>
        </UserProvider>
        </QueryClientProvider>
      </Auth0ProviderWithNavigate>
    </BrowserRouter>
  );
}
