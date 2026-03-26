import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus, Loader2, ChevronRight, ChevronDown, Search, Settings,
  X, UserPlus, UserMinus, Users,
} from "lucide-react";
import { useGroup, useGroups, useGroupSites, useSites, useAddGroupMember, useRemoveGroupMember, useUpdateGroup, useOrg, useSearchMembers } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { can, getMyGroupRole } from "@/lib/permissions";
import {
  getChildren, getDescendantIds, getBreadcrumbPath, isLeafGroup,
  SITE_STATUS_CONFIG, ROLE_CONFIG,
} from "@/lib/constants";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { CreateGroupModal } from "@/pages/GroupsPage";

function StatusBadge({ status }) {
  const cfg = SITE_STATUS_CONFIG[status] || SITE_STATUS_CONFIG.Active;
  return (
    <span className="inline-block text-[11px] font-semibold px-2.5 py-[3px] rounded-md capitalize" style={{ color: cfg.color, background: cfg.bg }}>
      {status}
    </span>
  );
}

// ── Add Member Modal ──
function AddMemberModal({ open, onClose, groupId, existingMemberIds }) {
  const addMember = useAddGroupMember(groupId);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("surveyor");
  const { data: searchResults = [], isLoading: searching } = useSearchMembers(search);

  const available = searchResults.filter((m) => !existingMemberIds.includes(m.user_id));

  function handleAdd(userId) {
    addMember.mutate(
      { user_id: userId, role },
      { onSuccess: () => { onClose(); setSearch(""); } }
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-[18px] font-semibold text-text-primary mb-1">Add Member</h3>
        <p className="text-[13px] text-text-secondary mb-4">Add an organization member to this group.</p>
        <div className="flex gap-2.5 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." className="pl-9" autoComplete="off" />
          </div>
          <div className="relative">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="appearance-none h-[42px] pl-3 pr-8 rounded-lg border-[1.5px] border-border bg-white text-[13px] cursor-pointer outline-none focus:border-accent">
              <option value="admin">Admin</option>
              <option value="surveyor">Surveyor</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>
        <div className="max-h-[280px] overflow-y-auto border border-border rounded-lg">
          {search.length < 2 ? (
            <p className="py-6 text-center text-[13px] text-text-muted">Type at least 2 characters to search</p>
          ) : searching ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={14} className="animate-spin text-text-muted" /></div>
          ) : available.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-text-muted">No matching members found</p>
          ) : (
            available.map((m) => (
              <button key={m.user_id} onClick={() => handleAdd(m.user_id)} disabled={addMember.isPending} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors cursor-pointer border-b border-canvas last:border-0">
                <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-accent-text">{(m.name || m.email)[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text-primary truncate">{m.name || m.email}</p>
                  {m.name && <p className="text-[12px] text-text-muted truncate">{m.email}</p>}
                </div>
                <UserPlus size={14} className="text-text-disabled shrink-0" />
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ──
export default function GroupDetailPage() {
  const navigate = useNavigate();
  const { vizUser } = useUser();
  const { id } = useParams();

  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: allGroups = [] } = useGroups();
  const { data: allSites = [] } = useSites();
  const { data: directSites = [] } = useGroupSites(id);
  const removeMember = useRemoveGroupMember(id);
  const updateGroup = useUpdateGroup(id);
  const { data: orgData } = useOrg();

  const myGroupRole = getMyGroupRole(group, vizUser);
  const canManage = can.manageGroupMembers(vizUser, myGroupRole);

  const [showCreate, setShowCreate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [siteSearch, setSiteSearch] = useState("");

  // Settings state
  const [editName, setEditName] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [editManager, setEditManager] = useState(null);

  if (groupLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={16} className="animate-spin text-text-muted" />
        </div>
      </AppShell>
    );
  }

  if (!group) {
    return (
      <AppShell>
        <div className="max-w-[600px] mx-auto text-center py-20">
          <p className="text-[14px] text-[#E24B4A] mb-4">Group not found</p>
          <Button variant="secondary" onClick={() => navigate("/groups")}>Back to Groups</Button>
        </div>
      </AppShell>
    );
  }

  const breadcrumb = getBreadcrumbPath(allGroups, id);
  const children = getChildren(allGroups, id);
  const isLeaf = isLeafGroup(allGroups, id);
  const members = group.members || [];
  const categories = orgData?.group_categories || [];

  const descIds = getDescendantIds(allGroups, id);
  const tableSites = isLeaf ? directSites : allSites.filter((s) => descIds.includes(s.group_id));
  const filteredSites = tableSites.filter((s) => {
    if (!siteSearch) return true;
    const q = siteSearch.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q);
  });

  const existingMemberIds = members.map((m) => m.user_id);
  const admins = members.filter((m) => m.role === "admin");

  return (
    <AppShell>
      <div className="max-w-[1100px] mx-auto px-6 lg:px-9 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-5 text-[13px]">
          <span className="text-accent font-medium cursor-pointer hover:underline" onClick={() => navigate("/groups")}>Groups</span>
          {breadcrumb.map((g, i) => (
            <span key={g.id} className="flex items-center gap-1.5">
              <span className="text-text-muted text-[11px]">›</span>
              {i === breadcrumb.length - 1 ? (
                <span className="text-text-primary font-semibold">{g.name}</span>
              ) : (
                <span className="text-accent font-medium cursor-pointer hover:underline" onClick={() => navigate(`/groups/${g.id}`)}>{g.name}</span>
              )}
            </span>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.5px]">{group.name}</h1>
              {group.category && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.04em] px-1.5 py-[2px] rounded bg-canvas text-text-secondary">{group.category}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[13px] text-text-secondary">
              {group.manager_name && (
                <span className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-accent-text">{group.manager_name[0].toUpperCase()}</span>
                  </div>
                  {group.manager_name} · Manager
                </span>
              )}
              <span>{tableSites.length} site{tableSites.length !== 1 ? "s" : ""}</span>
              <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
              {children.length > 0 && <span>{children.length} sub-group{children.length !== 1 ? "s" : ""}</span>}
            </div>
          </div>
          {canManage && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Add Sub-group
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3.5 mb-8">
          <div className="bg-white border border-border rounded-[14px] px-5 py-[18px]">
            <p className="text-[12px] text-text-secondary mb-1">Sites</p>
            <p className="text-[28px] font-semibold tracking-[-1px] leading-[1.1]">{tableSites.length}</p>
          </div>
          <div className="bg-white border border-border rounded-[14px] px-5 py-[18px]">
            <p className="text-[12px] text-text-secondary mb-1">Active</p>
            <p className="text-[28px] font-semibold tracking-[-1px] leading-[1.1]">{tableSites.filter((s) => s.status === "Active").length}</p>
          </div>
          <div className="bg-white border border-border rounded-[14px] px-5 py-[18px]">
            <p className="text-[12px] text-text-secondary mb-1">Members</p>
            <p className="text-[28px] font-semibold tracking-[-1px] leading-[1.1]">{members.length}</p>
          </div>
          <div className="bg-white border border-border rounded-[14px] px-5 py-[18px]">
            <p className="text-[12px] text-text-secondary mb-1">Sub-groups</p>
            <p className="text-[28px] font-semibold tracking-[-1px] leading-[1.1]">{children.length}</p>
          </div>
        </div>

        {/* Sub-groups */}
        {children.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[16px] font-semibold tracking-[-0.2px] mb-3">Sub-groups</h2>
            <div className="bg-white border border-border rounded-[14px] divide-y divide-canvas overflow-hidden">
              {children.map((child) => {
                const childDescIds = getDescendantIds(allGroups, child.id);
                const childSiteCount = allSites.filter((s) => childDescIds.includes(s.group_id)).length;
                return (
                  <div key={child.id} onClick={() => navigate(`/groups/${child.id}`)} className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-surface-hover transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-text-primary">{child.name}</p>
                        {child.category && <span className="text-[10px] font-semibold uppercase tracking-[0.04em] px-1.5 py-[2px] rounded bg-canvas text-text-secondary">{child.category}</span>}
                      </div>
                      <p className="text-[12px] text-text-muted mt-0.5">
                        {child.manager_name || "No manager"} · {childSiteCount} sites · {child.member_count || 0} members
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-text-disabled opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sites */}
        {tableSites.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[16px] font-semibold tracking-[-0.2px] mb-3">Sites</h2>
            <div className="bg-white border border-border rounded-[14px] overflow-hidden">
              <div className="flex items-center gap-2.5 px-[18px] py-3 border-b border-border">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input value={siteSearch} onChange={(e) => setSiteSearch(e.target.value)} placeholder="Search sites..." className="h-[34px] pl-[34px] pr-3 w-[200px] bg-canvas border border-border rounded-lg text-[13px] outline-none focus:border-accent transition-colors" />
                </div>
                <span className="text-[12px] text-text-muted ml-auto">{filteredSites.length}</span>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Site</th>
                    {!isLeaf && <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Group</th>}
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Technician</th>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">District</th>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Type</th>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map((site) => {
                    const siteGroup = site.group_id ? allGroups.find((g) => g.id === site.group_id) : null;
                    return (
                      <tr key={site.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-4 py-[11px] border-b border-canvas">
                          <span className="text-[13px] font-medium">{site.name}</span>
                          {site.code && <span className="ml-1.5 text-[11px] font-mono text-text-muted">{site.code}</span>}
                        </td>
                        {!isLeaf && <td className="px-4 py-[11px] border-b border-canvas text-[13px] text-accent font-medium">{siteGroup?.name || "—"}</td>}
                        <td className="px-4 py-[11px] border-b border-canvas text-[13px]">
                          {site.technician_name || <span className="text-text-disabled">—</span>}
                        </td>
                        <td className="px-4 py-[11px] border-b border-canvas text-[13px]">{site.district || "—"}</td>
                        <td className="px-4 py-[11px] border-b border-canvas text-[13px] text-text-secondary">{site.site_type || "—"}</td>
                        <td className="px-4 py-[11px] border-b border-canvas"><StatusBadge status={site.status || "Active"} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold tracking-[-0.2px]">Members</h2>
            {canManage && (
              <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowAddMember(true)}>
                <UserPlus size={13} /> Add Member
              </Button>
            )}
          </div>
          {members.length === 0 ? (
            <div className="bg-white border border-border rounded-[14px] p-8 text-center">
              <p className="text-[13px] text-text-muted">No members in this group yet.</p>
              {canManage && (
                <Button variant="secondary" size="sm" className="gap-1.5 mt-3" onClick={() => setShowAddMember(true)}>
                  <UserPlus size={13} /> Add Member
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white border border-border rounded-[14px] divide-y divide-canvas overflow-hidden">
              {members.map((m) => {
                const rc = ROLE_CONFIG[m.role] || ROLE_CONFIG.surveyor;
                const isManager = m.user_id === group.manager_id;
                return (
                  <div key={m.user_id || m.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-accent-text">{(m.name || m.email || "?")[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">{m.name || m.email}</p>
                      {m.name && <p className="text-[12px] text-text-muted truncate">{m.email}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isManager && (
                        <span className="text-[10px] font-semibold px-1.5 py-[2px] rounded bg-accent-light text-accent">Manager</span>
                      )}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: rc.color, background: rc.bg }}>
                        {rc.label}
                      </span>
                      {canManage && !isManager && (
                        <button onClick={() => setConfirmRemove(m)} className="p-1 rounded text-text-disabled hover:text-[#DC2626] transition-colors cursor-pointer" title="Remove from group">
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings (admin only) */}
        {canManage && (
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.2px] mb-3">Settings</h2>
            <div className="bg-white border border-border rounded-[14px] p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Group Name</label>
                <div className="flex gap-2">
                  <Input value={editName ?? group.name} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
                  <Button
                    size="sm"
                    disabled={updateGroup.isPending || !(editName && editName.trim() !== group.name)}
                    onClick={() => updateGroup.mutate({ name: editName.trim() }, { onSuccess: () => setEditName(null) })}
                  >
                    {updateGroup.isPending ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Category</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={editCategory ?? group.category ?? ""}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-[13px] cursor-pointer outline-none focus:border-accent"
                      >
                        <option value="">No category</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                    <Button
                      size="sm"
                      disabled={updateGroup.isPending || editCategory === null || (editCategory || "") === (group.category || "")}
                      onClick={() => updateGroup.mutate({ category: editCategory || null }, { onSuccess: () => setEditCategory(null) })}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Manager */}
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Manager</label>
                {admins.length === 0 ? (
                  <p className="text-[12px] text-text-muted">Add an admin member first, then assign them as manager.</p>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={editManager ?? group.manager_id ?? ""}
                        onChange={(e) => setEditManager(e.target.value)}
                        disabled={updateGroup.isPending}
                        className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-[13px] cursor-pointer outline-none focus:border-accent"
                      >
                        <option value="">No manager</option>
                        {admins.map((m) => (
                          <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                    <Button
                      size="sm"
                      disabled={updateGroup.isPending || editManager === null || (editManager || "") === (group.manager_id || "")}
                      onClick={() => updateGroup.mutate({ manager_id: editManager || null }, { onSuccess: () => setEditManager(null) })}
                    >
                      {updateGroup.isPending ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} parentId={id} parentName={group.name} />

      <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} groupId={id} existingMemberIds={existingMemberIds} />

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => { removeMember.mutate(confirmRemove.user_id, { onSuccess: () => setConfirmRemove(null) }); }}
        title="Remove Member"
        description={`Remove ${confirmRemove?.name || confirmRemove?.email || "this member"} from the group? They'll lose access to this group's sites and jobs.`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        loading={removeMember.isPending}
      />
    </AppShell>
  );
}
