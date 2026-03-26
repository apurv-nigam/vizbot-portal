import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { Check, AlertCircle, Loader2, Clock, Mail, UserPlus, X, ChevronDown, ChevronRight, Users } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useUser } from "@/auth/UserProvider";
import { useGroups, useOrg, useUpdateOrg } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { ORG_ROLE_CONFIG, ROLE_CONFIG } from "@/lib/constants";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Toast({ type, message, onDismiss }) {
  const isSuccess = type === "success";
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[13px] font-medium shadow-[0_8px_30px_rgba(0,0,0,0.1)] animate-[slideIn_0.2s_ease-out] ${
      isSuccess ? "bg-white border-border text-text-primary" : "bg-white border-[#FECACA] text-[#DC2626]"
    }`}>
      {isSuccess ? <Check size={14} className="text-[#16A34A] shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
      {message}
      <button onClick={onDismiss} className="ml-2 text-text-muted hover:text-text-secondary cursor-pointer">&times;</button>
    </div>
  );
}

function RoleBadge({ role, config }) {
  const cfg = config || ORG_ROLE_CONFIG;
  const rc = cfg[role] || { label: role, color: "var(--color-text-secondary)", bg: "var(--color-canvas)" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize" style={{ color: rc.color, background: rc.bg }}>
      {rc.label}
    </span>
  );
}

const INVITE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

function InviteModal({ onClose, onSuccess }) {
  const { getAccessTokenSilently } = useAuth0();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleSend() {
    if (!email.trim()) return;
    setSending(true);
    try {
      const token = await getAccessTokenSilently();
      await apiRequest("/api/v1/org/invite", { token, method: "POST", body: { email: email.trim(), role } });
      setFeedback({ type: "success", message: `Invitation sent to ${email.trim()}` });
      setEmail("");
      setTimeout(() => { onClose(); onSuccess?.(); }, 1500);
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/30 z-50 animate-[fadeInOverlay_0.15s_ease-out]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div className="bg-white rounded-[14px] border border-border shadow-[0_8px_30px_rgba(0,0,0,0.1)] w-full max-w-[420px] pointer-events-auto animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            <h2 className="text-[18px] font-semibold text-text-primary">Invite member</h2>
            <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-canvas cursor-pointer"><X size={16} /></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Email address</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" onKeyDown={(e) => e.key === "Enter" && handleSend()} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Role</label>
              <div className="relative">
                <select value={role} onChange={(e) => setRole(e.target.value)} className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-[14px] cursor-pointer outline-none focus:border-accent">
                  {INVITE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
            {feedback && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium ${
                feedback.type === "success" ? "bg-[#ECFDF5] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]"
              }`}>
                {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                {feedback.message}
              </div>
            )}
            <Button onClick={handleSend} disabled={sending || !email.trim()} className="w-full">
              {sending ? <Loader2 size={14} className="animate-spin" /> : "Send Invite"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  const { user, getAccessTokenSilently } = useAuth0();
  const { vizUser, setUser } = useUser();
  const navigate = useNavigate();

  const { data: groups = [] } = useGroups();
  const { data: org } = useOrg();
  const updateOrg = useUpdateOrg();

  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);

  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      try {
        const token = await getAccessTokenSilently();
        const data = await apiRequest("/api/v1/users/me", { token });
        if (cancelled) return;
        setName(data.name || "");
        setWorkspaceName(data.org_name || vizUser?.org_name || "");
        setUser({ ...vizUser, ...data });
      } catch {
        setName(vizUser?.name || user?.name || "");
        setWorkspaceName(vizUser?.org_name || "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProfile();
    return () => { cancelled = true; };
  }, []);

  async function fetchOrgMembers() {
    if (!can.inviteToOrg(vizUser)) { setOrgLoading(false); return; }
    try {
      const token = await getAccessTokenSilently();
      const [membersData, invitesData] = await Promise.all([
        apiRequest("/api/v1/org/members", { token }),
        apiRequest("/api/v1/org/invitations", { token }),
      ]);
      setMembers(membersData);
      setPendingInvites(invitesData);
    } catch {}
    finally { setOrgLoading(false); }
  }

  useEffect(() => {
    if (!vizUser?.org_id) { setOrgLoading(false); return; }
    fetchOrgMembers();
  }, [vizUser?.org_id]);

  function showToast(type, message) {
    setToast({ type, message });
    if (type === "success") setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveName() {
    if (!name.trim()) return;
    setSaving("name");
    try {
      const token = await getAccessTokenSilently();
      await apiRequest("/api/v1/users/me", { token, method: "PATCH", body: { name: name.trim() } });
      setUser({ ...vizUser, name: name.trim() });
      showToast("success", "Display name updated");
    } catch (err) { showToast("error", err.message); }
    finally { setSaving(null); }
  }

  async function handleSaveWorkspace() {
    if (!workspaceName.trim()) return;
    setSaving("workspace");
    try {
      const token = await getAccessTokenSilently();
      await apiRequest("/api/v1/org/", { token, method: "PATCH", body: { name: workspaceName.trim() } });
      setUser({ ...vizUser, org_name: workspaceName.trim() });
      showToast("success", "Workspace name updated");
    } catch (err) { showToast("error", err.message); }
    finally { setSaving(null); }
  }

  const initial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";
  // vizUser.role is refreshed from GET /users/me which now includes role
  const orgRole = vizUser?.role;
  const myGroups = groups.filter((g) => g.my_role);

  return (
    <AppShell>
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      <div className="max-w-[600px] mx-auto px-6 lg:px-9 py-6">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.5px]">Settings</h1>
          <p className="text-[13px] text-text-secondary mt-1">Manage your account and workspace.</p>
        </div>

        <div className="space-y-4">
          {/* Account */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-[13px] font-semibold text-text-primary mb-4">Account</h2>
              <div className="flex items-center gap-3.5">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold text-[15px]">{initial}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-text-primary truncate">{user?.email}</p>
                    <RoleBadge role={orgRole} />
                  </div>
                  <p className="text-[12px] text-text-muted mt-0.5">Managed by Auth0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display name */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-[13px] font-semibold text-text-primary mb-1">Display name</h2>
              <p className="text-[12px] text-text-muted mb-3">How you appear to others.</p>
              <div className="flex items-center gap-3">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" onKeyDown={(e) => e.key === "Enter" && handleSaveName()} className="flex-1" />
                <Button onClick={handleSaveName} disabled={saving === "name" || !name.trim()} className="shrink-0">
                  {saving === "name" ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* My Groups */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-[13px] font-semibold text-text-primary mb-1">My Groups</h2>
              <p className="text-[12px] text-text-muted mb-3">Groups you're a member of and your role in each.</p>
              {myGroups.length === 0 ? (
                <p className="text-[13px] text-text-muted py-3 text-center">You're not part of any groups yet.</p>
              ) : (
                <div className="space-y-1">
                  {myGroups.map((g) => {
                    const rc = ROLE_CONFIG[g.my_role] || ROLE_CONFIG.surveyor;
                    return (
                      <div
                        key={g.id}
                        onClick={() => navigate(`/groups/${g.id}`)}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-canvas cursor-pointer transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
                          <Users size={14} className="text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-text-primary truncate">{g.name}</p>
                          <p className="text-[11px] text-text-muted">{g.site_count || 0} sites · {g.member_count || 0} members</p>
                        </div>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ color: rc.color, background: rc.bg }}>
                          {rc.label}
                        </span>
                        <ChevronRight size={14} className="text-text-disabled opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workspace (admin/owner only) */}
          {can.inviteToOrg(vizUser) && (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-[13px] font-semibold text-text-primary mb-1">Workspace</h2>
                <p className="text-[12px] text-text-muted mb-3">Your organization's name.</p>
                <div className="flex items-center gap-3">
                  <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Workspace name" onKeyDown={(e) => e.key === "Enter" && handleSaveWorkspace()} className="flex-1" />
                  <Button onClick={handleSaveWorkspace} disabled={saving === "workspace" || !workspaceName.trim()} className="shrink-0">
                    {saving === "workspace" ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Group Categories (admin/owner only) */}
          {can.inviteToOrg(vizUser) && org && (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-[13px] font-semibold text-text-primary mb-1">Group Categories</h2>
                <p className="text-[12px] text-text-muted mb-3">Labels for organizing groups (e.g. Circle, Zone, Cluster). These appear as a dropdown when creating groups.</p>
                {(org.group_categories || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {org.group_categories.map((cat) => (
                      <span key={cat} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-canvas text-[13px] font-medium text-text-primary">
                        {cat}
                        <button
                          onClick={() => {
                            const updated = org.group_categories.filter((c) => c !== cat);
                            updateOrg.mutate({ group_categories: updated }, {
                              onError: (err) => showToast("error", err.message),
                            });
                          }}
                          disabled={updateOrg.isPending}
                          className="p-0.5 rounded text-text-muted hover:text-[#DC2626] cursor-pointer transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Region"
                    className="flex-1"
                    maxLength={30}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCategory.trim()) {
                        const current = org.group_categories || [];
                        if (current.includes(newCategory.trim())) { showToast("error", "Category already exists"); return; }
                        if (current.length >= 10) { showToast("error", "Maximum 10 categories"); return; }
                        updateOrg.mutate({ group_categories: [...current, newCategory.trim()] }, {
                          onSuccess: () => setNewCategory(""),
                          onError: (err) => showToast("error", err.message),
                        });
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!newCategory.trim() || updateOrg.isPending}
                    onClick={() => {
                      const current = org.group_categories || [];
                      if (current.includes(newCategory.trim())) { showToast("error", "Category already exists"); return; }
                      if (current.length >= 10) { showToast("error", "Maximum 10 categories"); return; }
                      updateOrg.mutate({ group_categories: [...current, newCategory.trim()] }, {
                        onSuccess: () => setNewCategory(""),
                        onError: (err) => showToast("error", err.message),
                      });
                    }}
                  >
                    {updateOrg.isPending ? <Loader2 size={14} className="animate-spin" /> : "Add"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organization Members (admin/owner only) */}
          {can.inviteToOrg(vizUser) && vizUser?.org_id && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[13px] font-semibold text-text-primary">Organization Members</h2>
                    {!orgLoading && <span className="text-[12px] text-text-muted">{members.length}</span>}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5 h-7 text-[12px]">
                    <UserPlus size={12} /> Invite
                  </Button>
                </div>

                {orgLoading ? (
                  <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-text-muted" /></div>
                ) : members.length === 0 ? (
                  <p className="text-[13px] text-text-muted py-4 text-center">No members found.</p>
                ) : (
                  <div className="space-y-0.5">
                    {members.map((m) => (
                      <div key={m.user_id} className="flex items-start gap-3 py-2.5 px-1 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[11px] font-bold text-accent-text">{(m.name || m.email || "?")[0].toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-text-primary truncate">{m.name || m.email}</p>
                            <RoleBadge role={m.role} />
                          </div>
                          <p className="text-[11px] text-text-muted truncate">{m.email}</p>
                          {m.groups && m.groups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {m.groups.map((g) => (
                                <span
                                  key={g.group_id}
                                  onClick={(e) => { e.stopPropagation(); navigate(`/groups/${g.group_id}`); }}
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-canvas text-text-secondary cursor-pointer hover:bg-border transition-colors"
                                >
                                  {g.group_name} <span className="text-text-muted">({g.role})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending invitations */}
                {pendingInvites.length > 0 && (
                  <>
                    <div className="h-px bg-border my-4" />
                    <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.6px] mb-3">Pending invitations</h3>
                    <div className="space-y-0.5">
                      {pendingInvites.map((inv) => (
                        <div key={inv.id} className="flex items-center gap-3 py-2 px-1 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center shrink-0">
                            <Mail size={14} className="text-text-muted" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-medium text-text-secondary truncate">{inv.email}</p>
                              <RoleBadge role={inv.role} />
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock size={10} className="text-text-disabled" />
                              <p className="text-[11px] text-text-muted">
                                Invited by {inv.invited_by_name} &middot; Expires {new Date(inv.expires_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onSuccess={() => fetchOrgMembers()} />}
    </AppShell>
  );
}
