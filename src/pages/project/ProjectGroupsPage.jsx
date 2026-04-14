import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Loader2, ChevronRight, ChevronDown } from "lucide-react";
import { useGroup, useGroups, useSites, useCreateGroup, useOrg, useSearchMembers } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { can, getMyGroupRole } from "@/lib/permissions";
import { getChildren, getDescendantIds } from "@/lib/constants";
import ProjectShell from "@/components/ProjectShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

function CreateGroupModal({ open, onClose, parentId, parentName }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const createGroup = useCreateGroup();
  const { data: org } = useOrg();
  const navigate = useNavigate();
  const categories = org?.group_categories || [];

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
        <p className="text-md text-text-secondary mb-5">
          {parentName ? `Creating under ${parentName}` : "Create a group to organize sites."}
        </p>
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

export default function ProjectGroupsPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { vizUser } = useUser();

  const { data: project, isLoading } = useGroup(projectId);
  const { data: allGroups = [] } = useGroups();
  const { data: allSites = [] } = useSites();

  const [showCreate, setShowCreate] = useState(false);

  const myGroupRole = getMyGroupRole(project, vizUser);
  const canManage = can.manageGroupMembers(vizUser, myGroupRole);
  const children = getChildren(allGroups, projectId);

  if (isLoading) {
    return <ProjectShell><div className="flex items-center justify-center py-32"><Loader2 size={16} className="animate-spin text-text-muted" /></div></ProjectShell>;
  }

  return (
    <ProjectShell>
      <div className="max-w-[1000px] mx-auto px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-semibold text-text-primary tracking-[-0.5px]">Groups</h1>
            <p className="text-md text-text-secondary mt-1">{children.length} group{children.length !== 1 ? "s" : ""} in this project</p>
          </div>
          {canManage && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Add Group
            </Button>
          )}
        </div>

        {children.length === 0 ? (
          <div className="bg-white border border-border rounded-[14px] p-12 text-center">
            <p className="text-lg text-text-muted mb-4">No groups in this project yet.</p>
            {canManage && (
              <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
                <Plus size={13} /> Add First Group
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-border rounded-[14px] divide-y divide-canvas overflow-hidden">
            {children.map((child) => {
              const childDescIds = getDescendantIds(allGroups, child.id);
              const childSiteCount = allSites.filter((s) => childDescIds.includes(s.group_id)).length;
              const childChildren = getChildren(allGroups, child.id);
              return (
                <div key={child.id} onClick={() => navigate(`/projects/${projectId}/sites?group_id=${child.id}`)} className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-surface-hover transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-medium text-text-primary">{child.name}</p>
                      {child.category && <span className="text-xs font-semibold uppercase tracking-[0.04em] px-1.5 py-[2px] rounded bg-canvas text-text-secondary">{child.category}</span>}
                    </div>
                    <p className="text-base text-text-muted mt-1">
                      {child.manager_name || "No manager"} · {childSiteCount} site{childSiteCount !== 1 ? "s" : ""} · {child.member_count || 0} member{child.member_count !== 1 ? "s" : ""}
                      {childChildren.length > 0 ? ` · ${childChildren.length} sub-group${childChildren.length !== 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-text-disabled opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} parentId={projectId} parentName={project?.name} />
      </div>
    </ProjectShell>
  );
}
