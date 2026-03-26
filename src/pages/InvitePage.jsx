import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/auth/UserProvider";
import { apiRequest } from "@/lib/api";
import { Loader2, AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const INVITE_CODE_KEY = "vizbot-invite-code";

function inviteErrorMessage(err) {
  const status = err.status;
  const msg = err.message?.toLowerCase() || "";
  if (status === 404 || msg.includes("not found")) return "This invitation was not found.";
  if (status === 409 || msg.includes("already")) return "This invitation has already been accepted.";
  if (status === 410 || msg.includes("expired")) return "This invitation has expired.";
  return err.message || "Could not load invitation details.";
}

export default function InvitePage() {
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const { setUser } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");

  const [invitation, setInvitation] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch invitation details (public, no auth)
  useEffect(() => {
    if (!code) { setFetching(false); return; }
    let cancelled = false;

    apiRequest(`/api/v1/invitations/${code}/details`)
      .then((data) => { if (!cancelled) setInvitation(data); })
      .catch((err) => {
        if (!cancelled) setError(inviteErrorMessage(err));
      })
      .finally(() => { if (!cancelled) setFetching(false); });

    return () => { cancelled = true; };
  }, [code]);

  // If logged in, accept immediately
  useEffect(() => {
    if (isLoading || !isAuthenticated || !code) return;
    let cancelled = false;

    async function acceptInvite() {
      setAccepting(true);
      try {
        const token = await getAccessTokenSilently();
        const data = await apiRequest(`/api/v1/invitations/${code}/accept`, { token, method: "POST" });
        if (cancelled) return;
        setUser(data);
        navigate("/dashboard", { replace: true });
      } catch (err) {
        if (!cancelled) setError(inviteErrorMessage(err));
      } finally {
        if (!cancelled) setAccepting(false);
      }
    }

    acceptInvite();
    return () => { cancelled = true; };
  }, [isAuthenticated, isLoading, code, getAccessTokenSilently, setUser, navigate]);

  function handleLogin() {
    if (code) sessionStorage.setItem(INVITE_CODE_KEY, code);
    loginWithRedirect({
      authorizationParams: {
        screen_hint: "login",
        ...(invitation?.email && { login_hint: invitation.email }),
      },
    });
  }

  function handleSignup() {
    if (code) sessionStorage.setItem(INVITE_CODE_KEY, code);
    loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
        ...(invitation?.email && { login_hint: invitation.email }),
      },
    });
  }

  // No code in URL
  if (!code) {
    return (
      <ErrorScreen
        title="Invalid invite link"
        message="This invitation link is missing a code."
        onBack={() => navigate("/")}
      />
    );
  }

  // Loading invitation details or Auth0 state
  if (fetching || isLoading) {
    return <SpinnerScreen text="Loading invitation..." />;
  }

  // Logged-in user: accepting in progress
  if (isAuthenticated && (accepting || !error)) {
    return <SpinnerScreen text="Accepting invitation..." />;
  }

  // Error (invalid, expired, or accept failed)
  if (error) {
    return (
      <ErrorScreen
        title="Invitation unavailable"
        message={error}
        onBack={() => navigate("/")}
      />
    );
  }

  // Not logged in, invitation loaded: show the two-button landing
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <Logo />

        <Card>
          <CardContent className="p-9">
            <h1 className="text-[22px] font-bold text-text-primary tracking-[-0.3px] mb-6 text-center">
              You've been invited to join
            </h1>

            {/* Invitation details card */}
            {invitation && (
              <div className="rounded-xl border border-border bg-surface-hover p-4 mb-7">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-accent-light flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] font-bold text-text-primary tracking-[-0.3px]">
                      {invitation.org_name}
                    </p>
                    <p className="text-[13px] text-text-secondary mt-0.5">
                      Role: <span className="capitalize font-medium">{invitation.role}</span>
                      {invitation.invited_by_name && (
                        <> &middot; Invited by {invitation.invited_by_name}</>
                      )}
                    </p>
                  </div>
                </div>
                {invitation.email && (
                  <p className="text-[12px] text-text-muted mt-3 pt-3 border-t border-border">
                    This invitation is for <span className="font-medium text-text-secondary font-mono">{invitation.email}</span>
                  </p>
                )}
              </div>
            )}

            {/* Two-button choice */}
            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className="w-full rounded-lg border-[1.5px] border-border bg-white px-5 py-3.5 text-left transition-all duration-200 hover:border-border-hover hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
              >
                <p className="text-[14px] font-semibold text-text-primary">
                  I already have a Vizbot account
                </p>
                <p className="text-[13px] text-text-muted mt-0.5">
                  Log in to accept
                </p>
              </button>

              <button
                onClick={handleSignup}
                className="w-full rounded-lg bg-accent px-5 py-3.5 text-left transition-all duration-200 hover:bg-accent-hover shadow-[0_1px_2px_rgba(91,95,199,0.3)] cursor-pointer"
              >
                <p className="text-[14px] font-semibold text-white">
                  I'm new to Vizbot
                </p>
                <p className="text-[13px] text-white/70 mt-0.5">
                  Create an account to join
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Logo() {
  return (
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
  );
}

function SpinnerScreen({ text }) {
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
        <p className="text-[13px] font-medium text-text-muted">{text}</p>
      </div>
    </div>
  );
}

function ErrorScreen({ title, message, onBack }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <Card>
          <CardContent className="p-9 text-center">
            <div className="h-10 w-10 rounded-full bg-[#FEF2F2] mx-auto mb-4 flex items-center justify-center">
              <AlertCircle size={18} className="text-[#DC2626]" />
            </div>
            <h1 className="text-[15px] font-[620] text-text-primary mb-1 tracking-[-0.15px]">{title}</h1>
            <p className="text-[14px] text-text-secondary mb-5 leading-relaxed">{message}</p>
            <Button variant="secondary" onClick={onBack}>Back to home</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
