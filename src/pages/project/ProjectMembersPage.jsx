import { useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, UserPlus, UserMinus, Search, ChevronDown } from "lucide-react";
import { useGroup, useAddGroupMember, useRemoveGroupMember, useSearchMembers } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { can, getMyGroupRole } from "@/lib/permissions";
import { ROLE_CONFIG } from "@/lib/constants";
import ProjectShell from "@/components/ProjectShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmDialog } from "@/components/ui/modal";

function AddMemberModal({ open, onClose, groupId, existingMemberIds }) {
  const addMember = useAddGroupMember(groupId);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("surveyor");
  const { data: searchResults = [], isLoading: searching } = useSearchMembers(search);
  const available = searchResults.filter((m) => !existingMemberIds.includes(m.user_id));

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-2xl font-semibold text-text-primary mb-1">Add Member</h3>
        <p className="text-md text-text-secondary mb-4">Add a member to this project.</p>
        <div className="flex gap-2.5 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." className="pl-9" autoComplete="off" />
          </div>
          <div className="relative">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="appearance-none h-[42px] pl-3 pr-8 rounded-lg border-[1.5px] border-border bg-white text-md cursor-pointer outline-none focus:border-accent">
              <option value="admin">Admin</option>
              <option value="surveyor">Surveyor</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>
        <div className="max-h-[280px] overflow-y-auto border border-border rounded-lg">
          {search.length < 2 ? (
            <p className="py-6 text-center text-md text-text-muted">Type at least 2 characters</p>
          ) : searching ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={14} className="animate-spin text-text-muted" /></div>
          ) : available.length === 0 ? (
            <p className="py-6 text-center text-md text-text-muted">No matching members</p>
          ) : (
            available.map((m) => (
              <button key={m.user_id} onClick={() => { addMember.mutate({ user_id: m.user_id, role }, { onSuccess: () => { onClose(); setSearch(""); } }); }} disabled={addMember.isPending} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors cursor-pointer border-b border-canvas last:border-0">
                <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-accent-text">{(m.name || m.email)[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-md font-medium text-text-primary truncate">{m.name || m.email}</p>
                  {m.name && <p className="text-base text-text-muted truncate">{m.email}</p>}
                </div>
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

export default function ProjectMembersPage() {
  const { id: projectId } = useParams();
  const { vizUser } = useUser();
  const { data: project, isLoading } = useGroup(projectId);
  const removeMember = useRemoveGroupMember(projectId);

  const [showAdd, setShowAdd] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const myGroupRole = getMyGroupRole(project, vizUser);
  const canManage = can.manageGroupMembers(vizUser, myGroupRole);
  const members = project?.members || [];

  if (isLoading) {
    return <ProjectShell><div className="flex items-center justify-center py-32"><Loader2 size={16} className="animate-spin text-text-muted" /></div></ProjectShell>;
  }

  return (
    <ProjectShell>
      <div className="max-w-[800px] mx-auto px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-semibold text-text-primary tracking-[-0.5px]">Members</h1>
            <p className="text-md text-text-secondary mt-1">{members.length} member{members.length !== 1 ? "s" : ""}</p>
          </div>
          {canManage && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <UserPlus size={13} /> Add Member
            </Button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="bg-white border border-border rounded-[14px] p-12 text-center">
            <p className="text-md text-text-muted mb-4">No members in this project yet.</p>
            {canManage && <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}><UserPlus size={13} /> Add Member</Button>}
          </div>
        ) : (
          <div className="bg-white border border-border rounded-[14px] divide-y divide-canvas overflow-hidden">
            {members.map((m) => {
              const rc = ROLE_CONFIG[m.role] || ROLE_CONFIG.surveyor;
              const isManager = m.user_id === project?.manager_id;
              return (
                <div key={m.user_id || m.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-accent-text">{(m.name || m.email || "?")[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-md font-medium text-text-primary truncate">{m.name || m.email}</p>
                    {m.name && <p className="text-base text-text-muted truncate">{m.email}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isManager && <span className="text-xs font-semibold px-1.5 py-[2px] rounded bg-accent-light text-accent">Manager</span>}
                    <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ color: rc.color, background: rc.bg }}>{rc.label}</span>
                    {canManage && !isManager && (
                      <button onClick={() => setConfirmRemove(m)} className="p-1 rounded text-text-disabled hover:text-[#DC2626] transition-colors cursor-pointer"><UserMinus size={14} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AddMemberModal open={showAdd} onClose={() => setShowAdd(false)} groupId={projectId} existingMemberIds={members.map((m) => m.user_id)} />

        <ConfirmDialog
          open={!!confirmRemove}
          onClose={() => setConfirmRemove(null)}
          onConfirm={() => removeMember.mutate(confirmRemove.user_id, { onSuccess: () => setConfirmRemove(null) })}
          title="Remove Member"
          description={`Remove ${confirmRemove?.name || confirmRemove?.email || "this member"} from the project?`}
          confirmLabel="Remove"
          confirmVariant="destructive"
          loading={removeMember.isPending}
        />
      </div>
    </ProjectShell>
  );
}
