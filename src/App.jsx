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
import DashboardPage from "@/pages/DashboardPage";
import OnboardingPage from "@/pages/OnboardingPage";
import ProfilePage from "@/pages/ProfilePage";
import SitesPage from "@/pages/SitesPage";
import GroupsPage from "@/pages/GroupsPage";
import GroupDetailPage from "@/pages/GroupDetailPage";
import CreateWorkflowPage from "@/pages/CreateWorkflowPage";
import WorkflowDetailPage from "@/pages/WorkflowDetailPage";
import WorkflowBuilderPage from "@/pages/WorkflowBuilderPage";
import CreateJobPage from "@/pages/CreateJobPage";
import JobDetailPage from "@/pages/JobDetailPage";
import JobsPage from "@/pages/JobsPage";
import WorkflowsPage from "@/pages/WorkflowsPage";
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
            <Route path="/dashboard" element={<Guarded><DashboardPage /></Guarded>} />
            <Route path="/profile" element={<Guarded><ProfilePage /></Guarded>} />

            {/* Sites */}
            <Route path="/sites" element={<Guarded><SitesPage /></Guarded>} />

            {/* Groups (hierarchy) */}
            <Route path="/groups" element={<Guarded><GroupsPage /></Guarded>} />
            <Route path="/groups/:id" element={<Guarded><GroupDetailPage /></Guarded>} />

            {/* Workflows (new routes) */}
            <Route path="/workflows" element={<Guarded><WorkflowsPage /></Guarded>} />
            <Route path="/workflows/new" element={<Guarded><CreateWorkflowPage /></Guarded>} />
            <Route path="/workflows/:id" element={<Guarded><WorkflowDetailPage /></Guarded>} />
            <Route path="/workflows/:id/builder" element={<Guarded><WorkflowBuilderPage /></Guarded>} />
            <Route path="/workflows/:id/viewer" element={<Guarded><Suspense fallback={<LazyFallback />}><ViewerPage /></Suspense></Guarded>} />

            {/* Jobs (flat) */}
            <Route path="/jobs" element={<Guarded><JobsPage /></Guarded>} />
            <Route path="/jobs/new" element={<Guarded><CreateJobPage /></Guarded>} />
            <Route path="/jobs/:jobId" element={<Guarded><JobDetailPage /></Guarded>} />

            {/* Legacy redirects */}
            <Route path="/projects" element={<Navigate to="/workflows" replace />} />
            <Route path="/projects/new" element={<Navigate to="/workflows/new" replace />} />
            <Route path="/projects/:id" element={<Guarded><WorkflowDetailPage /></Guarded>} />
            <Route path="/projects/:id/workflow" element={<Guarded><WorkflowBuilderPage /></Guarded>} />
            <Route path="/projects/:id/viewer" element={<Guarded><Suspense fallback={<LazyFallback />}><ViewerPage /></Suspense></Guarded>} />
            <Route path="/projects/:id/jobs/new" element={<Guarded><CreateJobPage /></Guarded>} />
            <Route path="/projects/:id/jobs/:jobId" element={<Guarded><JobDetailPage /></Guarded>} />
            <Route path="/teams" element={<Navigate to="/groups" replace />} />
            <Route path="/teams/:id" element={<Navigate to="/groups" replace />} />
          </Routes>
        </UserProvider>
        </QueryClientProvider>
      </Auth0ProviderWithNavigate>
    </BrowserRouter>
  );
}
