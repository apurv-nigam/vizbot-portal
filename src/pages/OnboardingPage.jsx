import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { Loader2, Building2, UserCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useUser } from "@/auth/UserProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const { user, getAccessTokenSilently } = useAuth0();
  const { vizUser, pendingInvitations, setUser } = useUser();
  const navigate = useNavigate();

  const emailPrefix = user?.nickname || user?.email?.split("@")[0] || "";
  const [name, setName] = useState(vizUser?.name || emailPrefix);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showInvites, setShowInvites] = useState(pendingInvitations.length > 0);
  const [selectedInvite, setSelectedInvite] = useState(
    pendingInvitations.length === 1 ? pendingInvitations[0] : null
  );

  async function handleGetStarted() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      await apiRequest("/api/v1/users/me", { token, method: "PATCH", body: { name: name.trim() } });
      const orgData = await apiRequest("/api/v1/org/", { token, method: "POST", body: { name: `${name.trim()}'s Workspace` } });
      setUser({ ...vizUser, name: name.trim(), org_id: orgData.org_id, org_name: orgData.org_name || orgData.name, role: orgData.role || "admin" });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinOrg() {
    if (!name.trim() || !selectedInvite) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      await apiRequest("/api/v1/users/me", { token, method: "PATCH", body: { name: name.trim() } });
      const acceptData = await apiRequest(`/api/v1/invitations/${selectedInvite.id}/accept`, { token, method: "POST" });
      setUser({ ...vizUser, name: name.trim(), org_id: acceptData.org_id, org_name: acceptData.org_name, role: acceptData.role });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div
              className="w-[30px] h-[30px] rounded-lg flex items-center justify-center"
              style={{ background: "var(--color-accent)" }}
            >
              <span className="text-white font-extrabold text-sm">V</span>
            </div>
            <span className="text-xl font-bold text-text-primary tracking-[-0.5px]">Vizbot</span>
          </div>
        </div>

        <Card>
          <CardContent className="p-9">
            <h1 className="text-3xl font-bold text-text-primary tracking-[-0.3px] mb-1">
              Welcome to Vizbot
            </h1>
            <p className="text-lg text-text-secondary mb-7">
              {showInvites
                ? "You've been invited to join a team."
                : "Set up your account to get started."}
            </p>

            {/* Invitation cards */}
            {showInvites && pendingInvitations.length > 0 && (
              <div className="space-y-2.5 mb-6">
                {pendingInvitations.map((inv) => {
                  const isSelected = selectedInvite?.id === inv.id;
                  return (
                    <button
                      key={inv.id}
                      onClick={() => setSelectedInvite(inv)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "border-accent bg-accent-light/40"
                          : "border-border bg-white hover:border-border-hover"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-accent-light" : "bg-canvas"
                        }`}>
                          <Building2 size={18} className={isSelected ? "text-accent" : "text-text-muted"} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xl font-[620] tracking-[-0.15px] ${
                            isSelected ? "text-accent" : "text-text-primary"
                          }`}>
                            {inv.org_name}
                          </p>
                          <p className="text-base text-text-muted mt-0.5">
                            Role: <span className="capitalize">{inv.role}</span>
                            {inv.invited_by_name && <> &middot; Invited by {inv.invited_by_name}</>}
                          </p>
                        </div>
                        {isSelected && (
                          <UserCheck size={16} className="text-accent shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Name input */}
            <label className="block text-md font-semibold text-text-secondary mb-1.5">Your name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  showInvites && selectedInvite ? handleJoinOrg() : handleGetStarted();
                }
              }}
            />

            {error && <p className="text-base text-[#DC2626] mt-2">{error}</p>}

            {/* Primary action */}
            {showInvites && selectedInvite ? (
              <Button
                onClick={handleJoinOrg}
                disabled={loading || !name.trim()}
                className="w-full mt-6"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : `Join ${selectedInvite.org_name}`}
              </Button>
            ) : (
              <Button
                onClick={handleGetStarted}
                disabled={loading || !name.trim()}
                className="w-full mt-6"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : "Get Started"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Toggle link */}
        {pendingInvitations.length > 0 && (
          <p className="text-center mt-5">
            <button
              onClick={() => {
                setShowInvites(!showInvites);
                if (showInvites) setSelectedInvite(null);
                else if (pendingInvitations.length === 1) setSelectedInvite(pendingInvitations[0]);
              }}
              className="text-md font-medium text-text-muted hover:text-text-secondary transition-colors duration-200 cursor-pointer"
            >
              {showInvites
                ? "or create your own workspace instead"
                : "or join an existing team instead"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
