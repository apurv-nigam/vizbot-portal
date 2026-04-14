import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, ChevronDown, ChevronRight, Plus, UserPlus, UserMinus, Search, AlertTriangle, Trash2 } from "lucide-react";
import { useGroup, useGroups, useSites, useJobs, useWorkflows, useUpdateGroup, useOrg, useCreateGroup, useAddGroupMember, useRemoveGroupMember, useDeleteGroup, useSearchMembers } from "@/lib/queries";
import { useAuth0 } from "@auth0/auth0-react";
import { apiRequest } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/auth/UserProvider";
import { can, getMyGroupRole } from "@/lib/permissions";
import { getChildren, getDescendantIds } from "@/lib/constants";
import ProjectShell from "@/components/ProjectShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmDialog } from "@/components/ui/modal";

// ── Add Member Modal ──
// sourceMembers: if provided, pick from this list (for child groups picking from project members).
//   Role is inherited from the project — no role picker shown.
// If not provided, search all org members (for adding to the project itself) with role picker.
function AddMemberModal({ open, onClose, groupId, existingMemberIds, sourceMembers }) {
  const addMember = useAddGroupMember(groupId);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("surveyor");
  const { data: searchResults = [], isLoading: searching } = useSearchMembers(sourceMembers ? undefined : search);

  const isLocalMode = !!sourceMembers;
  const pool = sourceMembers || searchResults;
  const available = pool.filter((m) => {
    if (existingMemberIds.includes(m.user_id)) return false;
    if (!search) return isLocalMode;
    const q = search.toLowerCase();
    return (m.name || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
  });

  const description = isLocalMode ? "Add a project member to this group." : "Add a member to this project.";
  const emptyHint = isLocalMode
    ? "No project members available. Add members to the project first."
    : "No matching members";

  function handleAdd(m) {
    // In local mode, inherit the member's project role; otherwise use the selected role
    const memberRole = isLocalMode ? m.role : role;
    addMember.mutate({ user_id: m.user_id, role: memberRole }, { onSuccess: () => { onClose(); setSearch(""); } });
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-2xl font-semibold text-text-primary mb-1">Add Member</h3>
        <p className="text-md text-text-secondary mb-4">{description}</p>
        <div className="flex gap-2.5 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." className="pl-9" autoComplete="off" />
          </div>
          {!isLocalMode && (
            <div className="relative">
              <select value={role} onChange={(e) => setRole(e.target.value)} className="appearance-none h-[42px] pl-3 pr-8 rounded-lg border-[1.5px] border-border bg-white text-md cursor-pointer outline-none focus:border-accent">
                <option value="admin">Admin</option>
                <option value="surveyor">Surveyor</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          )}
        </div>
        <div className="max-h-[280px] overflow-y-auto border border-border rounded-lg">
          {!isLocalMode && search.length < 2 ? (
            <p className="py-6 text-center text-md text-text-muted">Type at least 2 characters</p>
          ) : !isLocalMode && searching ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={14} className="animate-spin text-text-muted" /></div>
          ) : available.length === 0 ? (
            <p className="py-6 text-center text-md text-text-muted">{emptyHint}</p>
          ) : (
            available.map((m) => (
              <button key={m.user_id} onClick={() => handleAdd(m)} disabled={addMember.isPending} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors cursor-pointer border-b border-canvas last:border-0">
                <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-accent-text">{(m.name || m.email)[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-md font-medium text-text-primary truncate">{m.name || m.email}</p>
                  {m.name && <p className="text-base text-text-muted truncate">{m.email}</p>}
                </div>
                {isLocalMode && (
                  <span className="text-xs font-medium text-text-muted shrink-0">{m.role === "admin" ? "Admin" : "Surveyor"}</span>
                )}
                <UserPlus size={14} className="text-text-disabled shrink-0" />
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end mt-4"><Button variant="secondary" size="sm" onClick={onClose}>Close</Button></div>
      </div>
    </Modal>
  );
}

// ── Create Group Modal ──
function CreateGroupModal({ open, onClose, parentId, parentName }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const createGroup = useCreateGroup();
  const { data: org } = useOrg();
  const categories = (org?.group_categories || []).filter((c) => c !== "Project");

  function handleCreate() {
    if (!name.trim()) return;
    createGroup.mutate(
      { name: name.trim(), parent_id: parentId || null, category: category || null },
      { onSuccess: () => { onClose(); setName(""); setCategory(""); } }
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-2xl font-semibold text-text-primary mb-1">Add Group</h3>
        <p className="text-md text-text-secondary mb-5">Create a group under {parentName}.</p>
        <div className="space-y-3.5 mb-5">
          <div>
            <label className="block text-base font-semibold text-text-secondary mb-1.5">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maharashtra" />
          </div>
          {categories.length > 0 && (
            <div>
              <label className="block text-base font-semibold text-text-secondary mb-1.5">Category</label>
              <div className="relative">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-md cursor-pointer outline-none focus:border-accent">
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={createGroup.isPending}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={createGroup.isPending || !name.trim()}>
            {createGroup.isPending ? <Loader2 size={14} className="animate-spin" /> : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Expandable Group Row ──
function ExpandableGroupRow({ group, allGroups, allSites, categories, projectId, projectMembers, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const [editName, setEditName] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [editManager, setEditManager] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: groupDetail } = useGroup(expanded ? group.id : undefined);
  const updateChild = useUpdateGroup(group.id);
  const removeChildMember = useRemoveGroupMember(group.id);
  const deleteGroup = useDeleteGroup(group.id);

  const childMembers = groupDetail?.members || [];
  const projectAdmins = projectMembers.filter((m) => m.role === "admin");
  const childGroups = getChildren(allGroups, group.id);
  const descIds = getDescendantIds(allGroups, group.id);
  const siteCount = allSites.filter((s) => descIds.includes(s.group_id)).length;

  return (
    <div>
      {/* Header row */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer text-left">
        <span className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}>
          <ChevronRight size={13} className="text-text-muted" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-md font-medium text-text-primary">{group.name}</p>
            {group.category && <span className="text-2xs font-semibold uppercase tracking-[0.04em] px-1 py-[1px] rounded bg-canvas text-text-muted">{group.category}</span>}
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            {group.manager_name || "No manager"} · {siteCount} site{siteCount !== 1 ? "s" : ""} · {group.member_count || 0} member{group.member_count !== 1 ? "s" : ""}
          </p>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 ml-7 space-y-4 border-t border-canvas">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-1">Name</label>
            <div className="flex gap-2">
              <Input value={editName ?? group.name} onChange={(e) => setEditName(e.target.value)} className="flex-1 !h-[34px] !text-md" />
              <Button size="sm" disabled={updateChild.isPending || !(editName && editName.trim() !== group.name)} onClick={() => updateChild.mutate({ name: editName.trim() }, { onSuccess: () => setEditName(null) })}>Save</Button>
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1">Category</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select value={editCategory ?? group.category ?? ""} onChange={(e) => setEditCategory(e.target.value)} className="appearance-none w-full h-[34px] pl-3 pr-7 rounded-lg border border-border bg-white text-md cursor-pointer outline-none focus:border-accent">
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
                <Button size="sm" disabled={updateChild.isPending || editCategory === null || (editCategory || "") === (group.category || "")} onClick={() => updateChild.mutate({ category: editCategory || null }, { onSuccess: () => setEditCategory(null) })}>Save</Button>
              </div>
            </div>
          )}

          {/* Manager — only project admins can be group managers */}
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-1">Manager</label>
            {projectAdmins.length === 0 ? (
              <p className="text-sm text-text-muted">No project admins available.</p>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select value={editManager ?? group.manager_id ?? ""} onChange={(e) => setEditManager(e.target.value)} className="appearance-none w-full h-[34px] pl-3 pr-7 rounded-lg border border-border bg-white text-md cursor-pointer outline-none focus:border-accent">
                    <option value="">No manager</option>
                    {projectAdmins.map((m) => <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
                <Button size="sm" disabled={updateChild.isPending || editManager === null || (editManager || "") === (group.manager_id || "")} onClick={() => updateChild.mutate({ manager_id: editManager || null }, { onSuccess: () => setEditManager(null) })}>Save</Button>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-text-muted">Members ({childMembers.length})</label>
              <button onClick={() => setShowAddMember(true)} className="flex items-center gap-1 text-sm font-medium text-accent hover:underline cursor-pointer">
                <UserPlus size={11} /> Add
              </button>
            </div>
            {childMembers.length === 0 ? (
              <p className="text-sm text-text-muted">No members.</p>
            ) : (
              <div className="border border-border rounded-lg divide-y divide-canvas overflow-hidden">
                {childMembers.map((m) => {
                  const isManager = m.user_id === group.manager_id;
                  const projMember = projectMembers.find((pm) => pm.user_id === m.user_id);
                  const projRole = projMember?.role || m.role;
                  return (
                    <div key={m.user_id} className="flex items-center gap-2 px-3 py-2">
                      <div className="w-6 h-6 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                        <span className="text-2xs font-bold text-accent-text">{(m.name || m.email || "?")[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-text-primary truncate">{m.name || m.email}</p>
                      </div>
                      {isManager && <span className="text-2xs font-semibold px-1 py-[1px] rounded bg-accent-light text-accent">Mgr</span>}
                      <span className="text-xs font-medium text-text-muted">{projRole === "admin" ? "Admin" : "Surveyor"}</span>
                      <button onClick={() => setConfirmRemove(m)} className="p-0.5 rounded text-text-disabled hover:text-[#DC2626] transition-colors cursor-pointer">
                        <UserMinus size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* View sites link + Delete */}
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(`/projects/${projectId}/sites?group_id=${group.id}`)} className="text-base font-medium text-accent hover:underline cursor-pointer">
              View {siteCount} site{siteCount !== 1 ? "s" : ""} →
            </button>
            {siteCount === 0 && childMembers.length === 0 && childGroups.length === 0 && (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-sm font-medium text-[#DC2626] hover:underline cursor-pointer">
                <Trash2 size={11} /> Delete Group
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals for this group */}
      <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} groupId={group.id} existingMemberIds={childMembers.map((m) => m.user_id)} sourceMembers={projectMembers} />
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => removeChildMember.mutate(confirmRemove.user_id, { onSettled: () => setConfirmRemove(null) })}
        title="Remove Member"
        description={`Remove ${confirmRemove?.name || confirmRemove?.email || "this member"} from ${group.name}?`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        loading={removeChildMember.isPending}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteGroup.mutate(undefined, { onSettled: () => setConfirmDelete(false) })}
        title="Delete Group"
        description={`Permanently delete "${group.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        loading={deleteGroup.isPending}
      />
    </div>
  );
}

// ── Main Page ──
export default function ProjectSettingsPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { vizUser } = useUser();
  const { getAccessTokenSilently } = useAuth0();
  const qc = useQueryClient();

  const { data: project, isLoading } = useGroup(projectId);
  const { data: allGroups = [] } = useGroups();
  const { data: allSites = [] } = useSites();
  const { data: jobsData } = useJobs({ group_id: projectId, limit: 1 });
  const jobCount = jobsData?.total || 0;
  const { data: workflows = [] } = useWorkflows({ project_id: projectId });
  const updateGroup = useUpdateGroup(projectId);
  const deleteProject = useDeleteGroup(projectId);
  const { data: orgData } = useOrg();
  const removeMember = useRemoveGroupMember(projectId);

  const myGroupRole = getMyGroupRole(project, vizUser);
  const canManage = can.manageGroupMembers(vizUser, myGroupRole);
  const categories = orgData?.group_categories || [];
  const members = project?.members || [];
  const admins = members.filter((m) => m.role === "admin");
  const children = getChildren(allGroups, projectId);
  const descIds = projectId ? getDescendantIds(allGroups, projectId) : [];
  const projectSiteCount = allSites.filter((s) => descIds.includes(s.group_id)).length;
  const otherMembers = members.filter((m) => m.user_id !== vizUser?.user_id);
  const canDeleteProject = children.length === 0 && projectSiteCount === 0 && jobCount === 0 && workflows.length === 0 && otherMembers.length === 0;

  // Edit states
  const [editName, setEditName] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [editManager, setEditManager] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

  if (isLoading) {
    return <ProjectShell><div className="flex items-center justify-center py-32"><Loader2 size={16} className="animate-spin text-text-muted" /></div></ProjectShell>;
  }

  if (!canManage) {
    return <ProjectShell><div className="max-w-[600px] mx-auto px-6 py-12 text-center"><p className="text-lg text-text-muted">You don't have permission to edit project settings.</p></div></ProjectShell>;
  }

  async function handleChangeRole(userId, newRole) {
    try {
      const token = await getAccessTokenSilently();
      await apiRequest(`/api/v1/groups/${projectId}/members/${userId}`, { token, method: "PATCH", body: { role: newRole } });
      qc.invalidateQueries({ queryKey: ["groups", projectId] });
    } catch {}
  }

  return (
    <ProjectShell>
      <div className="max-w-[700px] mx-auto px-6 lg:px-8 py-6">
        <h1 className="text-4xl font-semibold text-text-primary tracking-[-0.5px] mb-1">Settings</h1>
        <p className="text-md text-text-secondary mb-6">Manage project configuration.</p>

        <div className="space-y-6">

          {/* ═══ Project Details ═══ */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">Project Details</h2>

              {/* Name */}
              <div>
                <label className="block text-base font-semibold text-text-secondary mb-1.5">Name</label>
                <div className="flex gap-2">
                  <Input value={editName ?? project?.name ?? ""} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
                  <Button size="sm" disabled={updateGroup.isPending || !(editName && editName.trim() !== project?.name)} onClick={() => updateGroup.mutate({ name: editName.trim() }, { onSuccess: () => setEditName(null) })}>
                    {updateGroup.isPending ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-base font-semibold text-text-secondary mb-1.5">Category</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select value={editCategory ?? project?.category ?? ""} onChange={(e) => setEditCategory(e.target.value)} className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-md cursor-pointer outline-none focus:border-accent">
                        <option value="">No category</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                    <Button size="sm" disabled={updateGroup.isPending || editCategory === null || (editCategory || "") === (project?.category || "")} onClick={() => updateGroup.mutate({ category: editCategory || null }, { onSuccess: () => setEditCategory(null) })}>Save</Button>
                  </div>
                </div>
              )}

              {/* Manager */}
              <div>
                <label className="block text-base font-semibold text-text-secondary mb-1.5">Manager</label>
                {admins.length === 0 ? (
                  <p className="text-base text-text-muted">Add an admin member first.</p>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select value={editManager ?? project?.manager_id ?? ""} onChange={(e) => setEditManager(e.target.value)} disabled={updateGroup.isPending} className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-md cursor-pointer outline-none focus:border-accent">
                        <option value="">No manager</option>
                        {admins.map((m) => <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                    <Button size="sm" disabled={updateGroup.isPending || editManager === null || (editManager || "") === (project?.manager_id || "")} onClick={() => updateGroup.mutate({ manager_id: editManager || null }, { onSuccess: () => setEditManager(null) })}>
                      {updateGroup.isPending ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ═══ Members ═══ */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Members <span className="text-text-muted font-normal">({members.length})</span></h2>
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowAddMember(true)}>
                  <UserPlus size={13} /> Add Member
                </Button>
              </div>

              {members.length === 0 ? (
                <p className="text-md text-text-muted py-4 text-center">No members yet.</p>
              ) : (
                <div className="border border-border rounded-lg divide-y divide-canvas overflow-hidden">
                  {members.map((m) => {
                    const isManager = m.user_id === project?.manager_id;
                    return (
                      <div key={m.user_id || m.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-accent-text">{(m.name || m.email || "?")[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-md font-medium text-text-primary truncate">{m.name || m.email}</p>
                          {m.name && <p className="text-base text-text-muted truncate">{m.email}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isManager && (
                            <span className="text-xs font-semibold px-1.5 py-[2px] rounded bg-accent-light text-accent">Manager</span>
                          )}
                          <div className="relative">
                            <select
                              value={m.role}
                              onChange={(e) => handleChangeRole(m.user_id, e.target.value)}
                              className="appearance-none h-[28px] pl-2 pr-6 rounded border border-border bg-white text-sm font-medium cursor-pointer outline-none focus:border-accent"
                            >
                              <option value="admin">Admin</option>
                              <option value="surveyor">Surveyor</option>
                            </select>
                            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                          </div>
                          {!isManager && (
                            <button onClick={() => setConfirmRemove(m)} className="p-1 rounded text-text-disabled hover:text-[#DC2626] transition-colors cursor-pointer">
                              <UserMinus size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ Groups ═══ */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Groups <span className="text-text-muted font-normal">({children.length})</span></h2>
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowAddGroup(true)}>
                  <Plus size={13} /> Add Group
                </Button>
              </div>

              {children.length === 0 ? (
                <p className="text-md text-text-muted py-4 text-center">No groups yet. Add a group to organize sites.</p>
              ) : (
                <div className="border border-border rounded-lg divide-y divide-canvas overflow-hidden">
                  {children.map((child) => (
                    <ExpandableGroupRow
                      key={child.id}
                      group={child}
                      allGroups={allGroups}
                      allSites={allSites}
                      categories={categories}
                      projectId={projectId}
                      projectMembers={members}
                      navigate={navigate}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ Danger Zone ═══ */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold text-[#DC2626] mb-2">Danger Zone</h2>
              {canDeleteProject ? (
                <>
                  <p className="text-base text-text-muted mb-4">This project is empty and can be deleted. This action cannot be undone.</p>
                  <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteProject(true)}>Delete Project</Button>
                </>
              ) : (
                <>
                  <p className="text-base text-text-muted mb-3">Remove everything from this project before it can be deleted:</p>
                  <div className="space-y-1 mb-4">
                    {children.length > 0 && <p className="text-base text-text-secondary">· {children.length} group{children.length !== 1 ? "s" : ""}</p>}
                    {projectSiteCount > 0 && <p className="text-base text-text-secondary">· {projectSiteCount} site{projectSiteCount !== 1 ? "s" : ""}</p>}
                    {jobCount > 0 && <p className="text-base text-text-secondary">· {jobCount} job{jobCount !== 1 ? "s" : ""}</p>}
                    {workflows.length > 0 && <p className="text-base text-text-secondary">· {workflows.length} workflow{workflows.length !== 1 ? "s" : ""}</p>}
                    {otherMembers.length > 0 && <p className="text-base text-text-secondary">· {otherMembers.length} other member{otherMembers.length !== 1 ? "s" : ""}</p>}
                  </div>
                  <Button variant="destructive" size="sm" disabled>Delete Project</Button>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Modals */}
      <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} groupId={projectId} existingMemberIds={members.map((m) => m.user_id)} />
      <CreateGroupModal open={showAddGroup} onClose={() => setShowAddGroup(false)} parentId={projectId} parentName={project?.name} />
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => removeMember.mutate(confirmRemove.user_id, { onSettled: () => setConfirmRemove(null) })}
        title="Remove Member"
        description={`Remove ${confirmRemove?.name || confirmRemove?.email || "this member"} from the project?`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        loading={removeMember.isPending}
      />
      <ConfirmDialog
        open={confirmDeleteProject}
        onClose={() => setConfirmDeleteProject(false)}
        onConfirm={() => deleteProject.mutate(undefined, { onSuccess: () => navigate("/projects"), onSettled: () => setConfirmDeleteProject(false) })}
        title="Delete Project"
        description={`Permanently delete "${project?.name}"? This cannot be undone.`}
        confirmLabel="Delete Project"
        confirmVariant="destructive"
        loading={deleteProject.isPending}
      />
    </ProjectShell>
  );
}
