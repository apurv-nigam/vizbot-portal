import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, MapPin, Plus, X, Upload, ChevronDown, AlertTriangle, Loader2,
  Users, Building2,
} from "lucide-react";
import { useSites, useGroups, useGroup, useUpdateSite, useTransferSite, useSearchMembers, queryKeys } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "@auth0/auth0-react";
import { apiRequest } from "@/lib/api";
import { useUser } from "@/auth/UserProvider";
import { can } from "@/lib/permissions";
import { SITE_STATUS_CONFIG, getBreadcrumbPath, isLeafGroup } from "@/lib/constants";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

function StatusBadge({ status }) {
  const cfg = SITE_STATUS_CONFIG[status] || SITE_STATUS_CONFIG.Active;
  return (
    <span className="inline-block text-[11px] font-semibold px-2.5 py-[3px] rounded-md capitalize" style={{ color: cfg.color, background: cfg.bg }}>
      {status}
    </span>
  );
}

function AssignToGroupModal({ open, onClose, siteIds, groups }) {
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const transferSite = useTransferSite();

  const leafGroups = groups.filter((g) => isLeafGroup(groups, g.id));

  async function handleAssign() {
    if (!selectedGroupId || siteIds.length === 0) return;
    setTransferring(true);
    try {
      for (const siteId of siteIds) {
        await transferSite.mutateAsync({ siteId, targetGroupId: selectedGroupId });
      }
      setSelectedGroupId("");
      onClose();
    } catch {}
    setTransferring(false);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-[18px] font-semibold text-text-primary mb-1">Assign to Group</h3>
        <p className="text-[13px] text-text-secondary mb-5">
          Assign {siteIds.length} site{siteIds.length !== 1 ? "s" : ""} to a group.
        </p>
        <div className="mb-5">
          <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Group</label>
          {leafGroups.length === 0 ? (
            <p className="text-[13px] text-text-muted py-2">No groups available. Create a group first.</p>
          ) : (
            <div className="relative">
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-[13px] cursor-pointer outline-none focus:border-accent"
              >
                <option value="">Select a group...</option>
                {leafGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}{g.category ? ` (${g.category})` : ""}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={transferring}>Cancel</Button>
          <Button size="sm" onClick={handleAssign} disabled={transferring || !selectedGroupId}>
            {transferring ? <Loader2 size={14} className="animate-spin" /> : `Assign ${siteIds.length} Site${siteIds.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AssignTechnicianModal({ open, onClose, siteIds }) {
  const { getAccessTokenSilently } = useAuth0();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const { data: searchResults = [], isLoading: searching } = useSearchMembers(search);

  async function handleAssign(userId) {
    if (siteIds.length === 0) return;
    setAssigning(true);
    try {
      const token = await getAccessTokenSilently();
      for (const siteId of siteIds) {
        await apiRequest(`/api/v1/sites/${siteId}`, { token, method: "PATCH", body: { technician_id: userId } });
      }
      qc.invalidateQueries({ queryKey: ["sites"] });
      setSearch("");
      onClose();
    } catch {}
    setAssigning(false);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-[18px] font-semibold text-text-primary mb-1">Assign Technician</h3>
        <p className="text-[13px] text-text-secondary mb-4">
          Assign a technician to {siteIds.length} site{siteIds.length !== 1 ? "s" : ""}.
        </p>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="h-[42px] w-full pl-9 pr-3 rounded-lg border-[1.5px] border-border bg-white text-[13px] outline-none focus:border-accent"
            autoComplete="off"
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto border border-border rounded-lg">
          {search.length < 2 ? (
            <p className="py-6 text-center text-[13px] text-text-muted">Type at least 2 characters to search</p>
          ) : searching ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={14} className="animate-spin text-text-muted" /></div>
          ) : searchResults.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-text-muted">No members found</p>
          ) : (
            searchResults.map((m) => (
              <button
                key={m.user_id}
                onClick={() => handleAssign(m.user_id)}
                disabled={assigning}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors cursor-pointer border-b border-canvas last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-accent-text">{(m.name || m.email)[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text-primary truncate">{m.name || m.email}</p>
                  {m.name && <p className="text-[12px] text-text-muted truncate">{m.email}</p>}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={assigning}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

function SiteDetailPanel({ site, groups, onClose, canManage, onCreateJob }) {
  const [selectedTech, setSelectedTech] = useState("");
  const [savedTech, setSavedTech] = useState("");
  // Reset when site changes
  useEffect(() => {
    const techId = site?.technician_id || "";
    setSelectedTech(techId);
    setSavedTech(techId);
  }, [site?.id]);
  if (!site) return null;
  const group = site.group_id ? groups.find((g) => g.id === site.group_id) : null;
  const breadcrumb = site.group_id ? getBreadcrumbPath(groups, site.group_id) : [];
  const { data: groupDetail } = useGroup(site.group_id);
  const updateSite = useUpdateSite(site.id);

  // Get surveyors from the group's members
  const surveyors = (groupDetail?.members || []).filter((m) => m.role === "surveyor" || m.role === "admin");
  const techChanged = selectedTech !== savedTech;

  return (
    <div className="w-[360px] border-l border-border bg-white flex-shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-[18px] py-[18px] border-b border-border">
        <div>
          <p className="text-[15px] font-semibold text-text-primary">{site.name}</p>
          {site.code && <p className="text-[12px] font-mono text-text-muted mt-0.5">{site.code}</p>}
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary cursor-pointer transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Status + Type */}
      <div className="px-[18px] py-3.5 border-b border-canvas flex items-center gap-2">
        <StatusBadge status={site.status || "Active"} />
        {site.site_type && <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-canvas text-text-secondary">{site.site_type}</span>}
      </div>

      {/* Group */}
      <div className="px-[18px] py-3.5 border-b border-canvas">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.06em] mb-2">Group</p>
        {group ? (
          <div className="text-[12px] text-accent font-medium">
            {breadcrumb.map((g, i) => (
              <span key={g.id}>
                {i > 0 && <span className="text-text-muted mx-1">›</span>}
                {g.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[12px] text-[#633806] bg-[#FAEEDA] rounded-lg px-3 py-2">
            <AlertTriangle size={13} />
            Not assigned to any group
          </div>
        )}
      </div>

      {/* Technician */}
      <div className="px-[18px] py-3.5 border-b border-canvas">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.06em] mb-2">Technician</p>
        {canManage && site.group_id && surveyors.length > 0 ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                disabled={updateSite.isPending}
                className="appearance-none w-full h-[34px] pl-3 pr-7 rounded-lg border border-border bg-white text-[13px] cursor-pointer outline-none focus:border-accent"
              >
                <option value="">No technician</option>
                {surveyors.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
            {techChanged && (
              <Button
                size="sm"
                disabled={updateSite.isPending}
                onClick={() => updateSite.mutate({ technician_id: selectedTech || null }, { onSuccess: () => setSavedTech(selectedTech) })}
              >
                {updateSite.isPending ? <Loader2 size={12} className="animate-spin" /> : "Save"}
              </Button>
            )}
          </div>
        ) : site.technician_name ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-accent-light flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-accent-text">{site.technician_name[0].toUpperCase()}</span>
            </div>
            <span className="text-[13px] font-medium text-text-primary">{site.technician_name}</span>
          </div>
        ) : (
          <p className="text-[12px] text-text-muted">{site.group_id ? "No technician assigned" : "Assign to a group first"}</p>
        )}
      </div>

      {/* Details */}
      <div className="px-[18px] py-3.5">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.06em] mb-2">Details</p>
        <div className="space-y-1.5">
          {site.state && (
            <div className="flex justify-between text-[12px]">
              <span className="text-text-secondary">State</span>
              <span className="font-semibold">{site.state}</span>
            </div>
          )}
          {site.district && (
            <div className="flex justify-between text-[12px]">
              <span className="text-text-secondary">District</span>
              <span className="font-semibold">{site.district}</span>
            </div>
          )}
          {site.site_type && (
            <div className="flex justify-between text-[12px]">
              <span className="text-text-secondary">Type</span>
              <span className="font-semibold">{site.site_type}</span>
            </div>
          )}
          {site.latitude && site.longitude && (
            <div className="flex justify-between text-[12px]">
              <span className="text-text-secondary">GPS</span>
              <span className="font-mono font-medium text-[11px]">{site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {canManage && site.group_id && (
        <div className="px-[18px] py-3.5">
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={() => onCreateJob(site.id)}
          >
            <Plus size={13} /> Create Job for this Site
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SitesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { vizUser } = useUser();
  const { data: allSites = [], isLoading } = useSites();
  const { data: groups = [] } = useGroups();

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);

  // Derive filters from URL params — reset when URL changes
  const assignFilter = searchParams.get("assigned") || "";
  const groupFilter = searchParams.get("group_id") || "";

  function setAssignFilter(val) {
    const params = new URLSearchParams(searchParams);
    if (val) params.set("assigned", val); else params.delete("assigned");
    params.delete("group_id");
    navigate(`/sites?${params.toString()}`, { replace: true });
  }
  function setGroupFilter(val) {
    const params = new URLSearchParams();
    if (val) params.set("group_id", val);
    navigate(`/sites?${params.toString()}`, { replace: true });
  }

  const unassignedCount = allSites.filter((s) => !s.group_id).length;

  // Unique states for dropdown
  const states = [...new Set(allSites.map((s) => s.state).filter(Boolean))].sort();

  // Get descendant group IDs for group filter (include child groups' sites)
  function getDescIds(gid) {
    let ids = [gid];
    groups.filter((g) => g.parent_id === gid).forEach((c) => { ids = ids.concat(getDescIds(c.id)); });
    return ids;
  }
  const groupFilterIds = groupFilter ? getDescIds(groupFilter) : null;
  const activeGroup = groupFilter ? groups.find((g) => g.id === groupFilter) : null;

  // Filtered sites
  const filtered = allSites.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(s.name || "").toLowerCase().includes(q) && !(s.code || "").toLowerCase().includes(q) && !(s.district || "").toLowerCase().includes(q)) return false;
    }
    if (stateFilter && s.state !== stateFilter) return false;
    if (assignFilter === "unassigned" && s.group_id) return false;
    if (assignFilter === "assigned" && !s.group_id) return false;
    if (groupFilterIds && !groupFilterIds.includes(s.group_id)) return false;
    return true;
  });

  function toggleSelect(id, e) {
    e.stopPropagation();
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((s) => s.id));
  }

  const groupMap = {};
  groups.forEach((g) => { groupMap[g.id] = g; });

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-48px)] lg:h-screen">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 lg:px-9 py-6 max-w-[1400px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.5px]">
                  {activeGroup ? activeGroup.name : "All Sites"}
                  {activeGroup && <span className="text-[14px] font-normal text-text-secondary ml-2">— Sites</span>}
                </h1>
                <p className="text-[13px] text-text-secondary mt-1">
                  {activeGroup ? `${filtered.length} sites in this group` : `${allSites.length} sites${unassignedCount > 0 ? ` · ${unassignedCount} unassigned` : ""}`}
                </p>
              </div>
              {can.manageSites(vizUser) && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="gap-1.5"><Upload size={13} /> Import CSV</Button>
                  <Button size="sm" className="gap-1.5"><Plus size={13} /> Add Site</Button>
                </div>
              )}
            </div>


            {/* Bulk bar */}
            {can.manageSites(vizUser) && selectedIds.length > 0 && (
              <div className="flex items-center gap-3 bg-[#1A1A1A] text-white rounded-[10px] px-4 py-2.5 mb-4">
                <span className="text-[12px] font-medium">{selectedIds.length} site{selectedIds.length !== 1 ? "s" : ""} selected</span>
                <div className="flex-1" />
                <Button size="sm" className="bg-transparent border border-[#666] text-white hover:bg-white/10 h-[30px] text-[11px]" onClick={() => setShowAssignModal(true)}>Assign to Group</Button>
                <Button size="sm" className="bg-transparent border border-[#666] text-white hover:bg-white/10 h-[30px] text-[11px]" onClick={() => setShowTechModal(true)}>Assign Technician</Button>
                <button onClick={() => setSelectedIds([])} className="text-[#999] hover:text-white cursor-pointer text-[12px]">Clear</button>
              </div>
            )}

            {/* Table */}
            <div className="bg-white border border-border rounded-[14px] overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-b border-border flex-wrap">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search sites..."
                    className="h-[34px] pl-[34px] pr-3 w-[220px] bg-canvas border border-border rounded-lg text-[13px] outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="relative">
                  <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="appearance-none h-[34px] pl-3 pr-7 border border-border rounded-lg bg-white text-[13px] cursor-pointer outline-none focus:border-accent">
                    <option value="">All States</option>
                    {states.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={assignFilter} onChange={(e) => setAssignFilter(e.target.value)} className="appearance-none h-[34px] pl-3 pr-7 border border-border rounded-lg bg-white text-[13px] cursor-pointer outline-none focus:border-accent">
                    <option value="">All Sites</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="assigned">Assigned</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
                {groups.length > 0 && (
                  <div className="relative">
                    <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="appearance-none h-[34px] pl-3 pr-7 border border-border rounded-lg bg-white text-[13px] cursor-pointer outline-none focus:border-accent">
                      <option value="">All Groups</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                )}
                {(search || stateFilter || assignFilter || groupFilter) && (
                  <button onClick={() => { setSearch(""); setStateFilter(""); navigate("/sites", { replace: true }); }} className="text-[12px] text-text-muted hover:text-text-secondary cursor-pointer">Clear all</button>
                )}
                <span className="text-[12px] text-text-muted ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={16} className="animate-spin text-text-muted" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-[14px] text-text-muted">{search || stateFilter || assignFilter ? "No sites match your filters" : "No sites yet"}</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border w-8">
                        <div
                          onClick={toggleAll}
                          className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center cursor-pointer shrink-0 ${
                            selectedIds.length === filtered.length && filtered.length > 0 ? "bg-accent border-accent" : "border-[#CBD5E1] bg-white"
                          }`}
                        >
                          {selectedIds.length === filtered.length && filtered.length > 0 && <span className="text-white text-[9px] font-bold">✓</span>}
                        </div>
                      </th>
                      <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Site</th>
                      <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">State</th>
                      <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">District</th>
                      <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Group</th>
                      <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Technician</th>
                      <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Type</th>
                      <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((site) => {
                      const isSelected = selectedIds.includes(site.id);
                      const group = site.group_id ? groupMap[site.group_id] : null;
                      return (
                        <tr
                          key={site.id}
                          onClick={() => setSelectedSite(site)}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-accent-light" : "hover:bg-surface-hover"}`}
                        >
                          <td className="px-4 py-[11px] border-b border-canvas">
                            <div
                              onClick={(e) => toggleSelect(site.id, e)}
                              className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center cursor-pointer shrink-0 ${
                                isSelected ? "bg-accent border-accent" : "border-[#CBD5E1] bg-white"
                              }`}
                            >
                              {isSelected && <span className="text-white text-[9px] font-bold">✓</span>}
                            </div>
                          </td>
                          <td className="px-4 py-[11px] border-b border-canvas">
                            <span className="text-[13px] font-medium">{site.name}</span>
                            {site.code && <span className="ml-1.5 text-[11px] font-mono text-text-muted">{site.code}</span>}
                          </td>
                          <td className="px-4 py-[11px] border-b border-canvas text-[13px]">{site.state || "—"}</td>
                          <td className="px-4 py-[11px] border-b border-canvas text-[13px]">{site.district || "—"}</td>
                          <td className="px-4 py-[11px] border-b border-canvas text-[13px]">
                            {group ? (
                              <span className="text-accent font-medium cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/groups/${group.id}`); }}>
                                {group.name}
                              </span>
                            ) : (
                              <span className="text-[#633806] font-medium">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-[11px] border-b border-canvas text-[13px]">
                            {site.technician_name || <span className="text-text-disabled">—</span>}
                          </td>
                          <td className="px-4 py-[11px] border-b border-canvas text-[13px] text-text-secondary">{site.site_type || "—"}</td>
                          <td className="px-4 py-[11px] border-b border-canvas">
                            <StatusBadge status={site.status || "Active"} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedSite && (
          <SiteDetailPanel site={selectedSite} groups={groups} onClose={() => setSelectedSite(null)} canManage={can.manageSites(vizUser)} onCreateJob={(siteId) => navigate(`/jobs/new?site_id=${siteId}`)} />
        )}
      </div>

      <AssignToGroupModal
        open={showAssignModal}
        onClose={() => { setShowAssignModal(false); setSelectedIds([]); }}
        siteIds={selectedIds}
        groups={groups}
      />

      <AssignTechnicianModal
        open={showTechModal}
        onClose={() => { setShowTechModal(false); setSelectedIds([]); }}
        siteIds={selectedIds}
      />
    </AppShell>
  );
}
