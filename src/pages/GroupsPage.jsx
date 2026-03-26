import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Loader2, AlertTriangle, ChevronRight, ChevronDown, Search, X, Users,
} from "lucide-react";
import { useGroups, useSites, useCreateGroup, useOrg, useSearchMembers } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { can } from "@/lib/permissions";
import { getChildren, getDescendantIds, getBreadcrumbPath } from "@/lib/constants";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

function CreateGroupModal({ open, onClose, parentId, parentName }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [manager, setManager] = useState(null);
  const [managerSearch, setManagerSearch] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const createGroup = useCreateGroup();
  const { data: org } = useOrg();
  const { data: searchResults = [], isLoading: searching } = useSearchMembers(managerSearch);
  const navigate = useNavigate();

  const categories = org?.group_categories || [];

  function handleCreate() {
    if (!name.trim()) return;
    createGroup.mutate(
      { name: name.trim(), parent_id: parentId || null, category: category || null, manager_id: manager?.user_id || null },
      {
        onSuccess: (data) => {
          onClose();
          setName(""); setCategory(""); setManager(null); setManagerSearch("");
          if (data?.id) navigate(`/groups/${data.id}`);
        },
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-[18px] font-semibold text-text-primary mb-1">{parentId ? "Add Sub-group" : "Add Group"}</h3>
        <p className="text-[13px] text-text-secondary mb-5">
          {parentId ? `Creating under ${parentName}` : "Create a group to organize sites and assign managers."}
        </p>
        <div className="space-y-3.5 mb-5">
          <div>
            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Telangana" />
          </div>
          {categories.length > 0 && (
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Category</label>
              <div className="relative">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-[13px] cursor-pointer outline-none focus:border-accent">
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Manager</label>
            {manager ? (
              <div className="flex items-center justify-between h-[42px] px-3.5 rounded-lg border-[1.5px] border-accent bg-surface-hover">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-accent-text">{(manager.name || manager.email)[0].toUpperCase()}</span>
                  </div>
                  <span className="text-[13px] font-medium text-text-primary">{manager.name || manager.email}</span>
                </div>
                <button onClick={() => setManager(null)} className="text-[12px] text-text-muted hover:text-text-secondary cursor-pointer">Change</button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
                  <Input value={managerSearch} onChange={(e) => { setManagerSearch(e.target.value); setManagerOpen(true); }} onFocus={() => setManagerOpen(true)} placeholder="Search by name or email..." className="pl-9" autoComplete="off" />
                </div>
                {managerOpen && managerSearch.length >= 2 && (
                  <>
                    <div onClick={() => setManagerOpen(false)} className="fixed inset-0 z-10" />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-border shadow-[0_8px_30px_rgba(0,0,0,0.1)] max-h-[180px] overflow-y-auto z-20">
                      {searching ? (
                        <div className="flex items-center justify-center py-4"><Loader2 size={14} className="animate-spin text-text-muted" /></div>
                      ) : searchResults.length === 0 ? (
                        <p className="py-4 text-center text-[13px] text-text-muted">No members found</p>
                      ) : (
                        searchResults.map((m) => (
                          <button key={m.user_id} onClick={() => { setManager(m); setManagerOpen(false); setManagerSearch(""); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-hover transition-colors cursor-pointer">
                            <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-accent-text">{(m.name || m.email)[0].toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-text-primary truncate">{m.name || m.email}</p>
                              {m.name && <p className="text-[11px] text-text-muted truncate">{m.email}</p>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
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

export { CreateGroupModal };

export default function GroupsPage() {
  const navigate = useNavigate();
  const { vizUser } = useUser();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const { data: allSites = [] } = useSites();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const unassignedCount = allSites.filter((s) => !s.group_id).length;

  // Show all groups (not just root), sorted: root groups first, then by name
  const filteredGroups = groups.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (g.name || "").toLowerCase().includes(q) || (g.category || "").toLowerCase().includes(q) || (g.manager_name || "").toLowerCase().includes(q);
  });

  if (groupsLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={16} className="animate-spin text-text-muted" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-9 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.5px]">Group Management</h1>
            <p className="text-[13px] text-text-secondary mt-1">{groups.length} group{groups.length !== 1 ? "s" : ""} · {allSites.length} total sites{unassignedCount > 0 ? ` · ${unassignedCount} unassigned` : ""}</p>
          </div>
          {can.createGroup(vizUser) && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Add Group
            </Button>
          )}
        </div>

        {/* Unassigned banner */}
        {unassignedCount > 0 && (
          <div className="flex items-center gap-3 bg-[#FAEEDA] border border-[#EF9F27]/20 rounded-[10px] px-4 py-3 mb-5">
            <AlertTriangle size={15} className="text-[#633806] shrink-0" />
            <p className="text-[13px] text-[#633806] flex-1">{unassignedCount} sites not assigned to any group</p>
            <button onClick={() => navigate("/sites?assigned=unassigned")} className="text-[12px] font-medium text-[#633806] underline cursor-pointer">View in Sites</button>
          </div>
        )}

        {groups.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-[40px] mb-4">📂</div>
              <h2 className="text-[18px] font-bold text-text-primary mb-2">No groups yet</h2>
              {can.createGroup(vizUser) ? (
                <>
                  <p className="text-[14px] text-text-secondary mb-6 max-w-[360px] mx-auto">Create your first group to start organizing your {allSites.length} sites.</p>
                  <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus size={14} /> Create First Group</Button>
                </>
              ) : (
                <p className="text-[14px] text-text-secondary max-w-[360px] mx-auto">No groups have been created yet. Contact an admin to set up groups.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Groups table */
          <div className="bg-white border border-border rounded-[14px] overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups..." className="h-[34px] pl-[34px] pr-3 w-[220px] bg-canvas border border-border rounded-lg text-[13px] outline-none focus:border-accent transition-colors" />
              </div>
              <span className="text-[12px] text-text-muted ml-auto">{filteredGroups.length} group{filteredGroups.length !== 1 ? "s" : ""}</span>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[14px] text-text-muted">No groups match your search</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Group</th>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Category</th>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Manager</th>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Parent</th>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-right bg-surface-hover border-b border-border">Members</th>
                    <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-right bg-surface-hover border-b border-border">Sites</th>
                    <th className="w-8 bg-surface-hover border-b border-border"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((g) => {
                    const parent = g.parent_id ? groups.find((p) => p.id === g.parent_id) : null;
                    const descIds = getDescendantIds(groups, g.id);
                    const totalSites = allSites.filter((s) => descIds.includes(s.group_id)).length;

                    return (
                      <tr
                        key={g.id}
                        onClick={() => navigate(`/groups/${g.id}`)}
                        className="cursor-pointer transition-colors hover:bg-surface-hover group"
                      >
                        <td className="px-4 py-3 border-b border-canvas">
                          <p className="text-[13px] font-medium text-text-primary">{g.name}</p>
                        </td>
                        <td className="px-4 py-3 border-b border-canvas">
                          {g.category ? (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.04em] px-1.5 py-[2px] rounded bg-canvas text-text-secondary">{g.category}</span>
                          ) : (
                            <span className="text-[12px] text-text-disabled">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-canvas">
                          {g.manager_name ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-accent-text">{g.manager_name[0].toUpperCase()}</span>
                              </div>
                              <span className="text-[13px] text-text-primary">{g.manager_name}</span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-text-disabled">No manager</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-canvas">
                          {parent ? (
                            <span className="text-[13px] text-accent font-medium cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/groups/${parent.id}`); }}>
                              {parent.name}
                            </span>
                          ) : (
                            <span className="text-[12px] text-text-disabled">Root</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-canvas text-right">
                          <span className="text-[13px] text-text-primary tabular-nums">{g.member_count || 0}</span>
                        </td>
                        <td className="px-4 py-3 border-b border-canvas text-right">
                          <span className="text-[13px] text-text-primary tabular-nums">{totalSites}</span>
                        </td>
                        <td className="px-4 py-3 border-b border-canvas">
                          <ChevronRight size={14} className="text-text-disabled opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} />
      </div>
    </AppShell>
  );
}
