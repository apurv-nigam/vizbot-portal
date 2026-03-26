import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/auth/UserProvider";
import { apiRequest } from "@/lib/api";
import { Loader2, AlertCircle, Mail, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const INVITE_CODE_KEY = "vizbot-invite-code";

export default function CallbackPage() {
  const { isAuthenticated, isLoading, error, user, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const { setUser } = useUser();
  const navigate = useNavigate();
  const [syncError, setSyncError] = useState(null);
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;

    async function syncUser() {
      try {
        const token = await getAccessTokenSilently();
        const data = await apiRequest("/api/v1/auth/sync", { token, method: "POST" });
        if (cancelled) return;

        // Check for stored invite code from /invite route
        const storedCode = sessionStorage.getItem(INVITE_CODE_KEY);
        if (storedCode) {
          sessionStorage.removeItem(INVITE_CODE_KEY);
          try {
            const acceptData = await apiRequest(`/api/v1/invitations/${storedCode}/accept`, { token, method: "POST" });
            setUser({ ...data, ...acceptData, org_id: acceptData.org_id, org_name: acceptData.org_name, role: acceptData.role });
            navigate("/dashboard", { replace: true });
            return;
          } catch {
            // Invite code invalid/expired — continue with normal flow
          }
        }

        setUser(data);

        if (data.org_id) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        if (err.status === 403 && err.message?.toLowerCase().includes("email_not_verified")) {
          setEmailUnverified(true);
        } else {
          setSyncError(err.message);
        }
      }
    }

    syncUser();
    return () => { cancelled = true; };
  }, [isAuthenticated, isLoading, getAccessTokenSilently, setUser, navigate]);

  async function handleResendVerification() {
    setResending(true);
    try {
      const token = await getAccessTokenSilently();
      await apiRequest("/api/v1/auth/resend-verification", { token, method: "POST" });
      setResent(true);
    } catch {
      // Silently fail — user can still check inbox or refresh
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  // Email verification required
  if (emailUnverified) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="w-full max-w-[420px]">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2.5">
              <div
                className="w-[30px] h-[30px] rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-accent)" }}
              >
                <span className="text-white font-extrabold text-sm">V</span>
              </div>
              <span className="text-[17px] font-bold text-text-primary tracking-[-0.5px]">Vizbot</span>
            </div>
          </div>
          <Card>
            <CardContent className="p-9 text-center">
              <div className="h-12 w-12 rounded-xl bg-accent-light mx-auto mb-5 flex items-center justify-center">
                <Mail size={22} className="text-accent" />
              </div>
              <h1 className="text-[18px] font-bold text-text-primary mb-2 tracking-[-0.3px]">Verify your email</h1>
              <p className="text-[14px] text-text-secondary leading-relaxed mb-1">
                We sent a verification email to
              </p>
              <p className="text-[14px] font-semibold text-text-primary mb-5 font-mono">
                {user?.email}
              </p>
              <p className="text-[13px] text-text-muted leading-relaxed mb-7">
                Click the link in the email to verify your account, then come back and refresh this page.
              </p>
              <Button onClick={() => loginWithRedirect()} className="w-full gap-2">
                <RefreshCw size={14} />
                I've verified my email
              </Button>
              <button
                onClick={handleResendVerification}
                disabled={resending || resent}
                className="block w-full text-center mt-3 text-[13px] font-medium text-text-muted hover:text-text-secondary transition-colors duration-200 cursor-pointer disabled:cursor-default disabled:text-text-disabled"
              >
                {resent ? "Verification email sent" : resending ? "Sending..." : "Resend verification email"}
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Generic error
  if (error || syncError) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2.5">
              <div
                className="w-[30px] h-[30px] rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-accent)" }}
              >
                <span className="text-white font-extrabold text-sm">V</span>
              </div>
              <span className="text-[17px] font-bold text-text-primary tracking-[-0.5px]">Vizbot</span>
            </div>
          </div>
          <Card>
            <CardContent className="p-9 text-center">
              <div className="h-10 w-10 rounded-full bg-[#FEF2F2] mx-auto mb-4 flex items-center justify-center">
                <AlertCircle size={18} className="text-[#DC2626]" />
              </div>
              <h1 className="text-[15px] font-[620] text-text-primary mb-1 tracking-[-0.15px]">Something went wrong</h1>
              <p className="text-[14px] text-text-secondary mb-5 leading-relaxed">{error?.message || syncError}</p>
              <Button variant="secondary" onClick={() => window.location.replace("/")}>Back to home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center"
          style={{ background: "var(--color-accent)" }}
        >
          <span className="text-white font-extrabold text-sm">V</span>
        </div>
        <Loader2 size={16} className="animate-spin text-text-muted" />
        <p className="text-[13px] font-medium text-text-muted">Signing you in...</p>
      </div>
    </div>
  );
}
