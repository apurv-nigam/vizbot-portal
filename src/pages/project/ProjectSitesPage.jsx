import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search, Loader2, MapPin, User, ChevronDown, Hash, Building2, ExternalLink } from "lucide-react";
import { useSites, useGroups, useGroup, useTransferSite, useSearchMembers } from "@/lib/queries";
import { useAuth0 } from "@auth0/auth0-react";
import { apiRequest } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { useUser } from "@/auth/UserProvider";
import { can } from "@/lib/permissions";
import { getDescendantIds } from "@/lib/constants";
import ProjectShell from "@/components/ProjectShell";
import { Button } from "@/components/ui/button";

// ── Assign Group Modal ──
function AssignGroupModal({ open, onClose, siteIds, groups, projectId }) {
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const transferSite = useTransferSite();
  const leafGroups = groups.filter((g) => {
    const children = groups.filter((c) => c.parent_id === g.id);
    return children.length === 0;
  });

  async function handleAssign() {
    if (!selectedGroupId || siteIds.length === 0) return;
    setTransferring(true);
    try {
      for (const siteId of siteIds) { await transferSite.mutateAsync({ siteId, targetGroupId: selectedGroupId }); }
      setSelectedGroupId("");
      onClose();
    } catch {}
    setTransferring(false);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-2xl font-semibold text-text-primary mb-1">Assign to Group</h3>
        <p className="text-md text-text-secondary mb-5">Move {siteIds.length} site{siteIds.length !== 1 ? "s" : ""} to a group.</p>
        <div className="mb-5">
          <div className="relative">
            <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-md cursor-pointer outline-none focus:border-accent">
              <option value="">Select a group...</option>
              {leafGroups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.category ? ` (${g.category})` : ""}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
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

// ── Assign Technician Modal ──
function AssignTechModal({ open, onClose, siteIds }) {
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
      for (const siteId of siteIds) { await apiRequest(`/api/v1/sites/${siteId}`, { token, method: "PATCH", body: { technician_id: userId } }); }
      qc.invalidateQueries({ queryKey: ["sites"] });
      setSearch("");
      onClose();
    } catch {}
    setAssigning(false);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-2xl font-semibold text-text-primary mb-1">Assign Technician</h3>
        <p className="text-md text-text-secondary mb-4">Assign to {siteIds.length} site{siteIds.length !== 1 ? "s" : ""}.</p>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="h-[42px] w-full pl-9 pr-3 rounded-lg border-[1.5px] border-border bg-white text-md outline-none focus:border-accent" autoComplete="off" />
        </div>
        <div className="max-h-[280px] overflow-y-auto border border-border rounded-lg">
          {search.length < 2 ? (
            <p className="py-6 text-center text-md text-text-muted">Type at least 2 characters</p>
          ) : searching ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={14} className="animate-spin text-text-muted" /></div>
          ) : searchResults.length === 0 ? (
            <p className="py-6 text-center text-md text-text-muted">No members found</p>
          ) : (
            searchResults.map((m) => (
              <button key={m.user_id} onClick={() => handleAssign(m.user_id)} disabled={assigning} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors cursor-pointer border-b border-canvas last:border-0">
                <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-accent-text">{(m.name || m.email)[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-md font-medium text-text-primary truncate">{m.name || m.email}</p>
                  {m.name && <p className="text-base text-text-muted truncate">{m.email}</p>}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end mt-4"><Button variant="secondary" size="sm" onClick={onClose} disabled={assigning}>Cancel</Button></div>
      </div>
    </Modal>
  );
}

// ── Site Card (row-style on desktop, stacks on mobile) ──
function SiteCard({ site, group, selected, onSelect, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-[10px] px-4 py-2.5 cursor-pointer transition-all ${
        selected ? "border-accent bg-accent-light/30 shadow-[0_0_0_1px_var(--color-accent)]" : "border-border hover:border-accent/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
      }`}
    >
      {/* Desktop: single row */}
      <div className="hidden lg:flex items-center gap-4">
        <div
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center cursor-pointer shrink-0 ${
            selected ? "bg-accent border-accent" : "border-[#CBD5E1] bg-white"
          }`}
        >
          {selected && <span className="text-white text-2xs font-bold">✓</span>}
        </div>

        {/* Site name + code */}
        <div className="w-[200px] min-w-0 shrink-0">
          <p className="text-md font-semibold text-text-primary truncate">{site.name}</p>
          {site.code && <p className="text-xs font-mono text-text-muted">{site.code}</p>}
        </div>

        {/* Group */}
        <div className="w-[180px] min-w-0 shrink-0">
          {group ? (
            <>
              <p className="text-base font-medium text-accent truncate">{group.name}</p>
              {group.category && <p className="text-2xs font-semibold uppercase tracking-[0.03em] text-text-muted">{group.category}</p>}
            </>
          ) : (
            <span className="text-base text-text-disabled">—</span>
          )}
        </div>

        {/* Technician */}
        <div className="w-[140px] min-w-0 shrink-0">
          {site.technician_name ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-accent-text">{site.technician_name[0].toUpperCase()}</span>
              </div>
              <span className="text-base text-text-primary truncate">{site.technician_name}</span>
            </div>
          ) : (
            <span className="text-base text-text-disabled">No technician</span>
          )}
        </div>

        {/* District + Map */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <p className="text-base text-text-secondary truncate">{site.district || "—"}{site.state ? `, ${site.state}` : ""}</p>
          {site.latitude && site.longitude && (
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, "_blank"); }}
              className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-text-muted hover:text-accent hover:bg-accent-light transition-colors cursor-pointer"
              title="Open in Google Maps"
            >
              <MapPin size={11} />
            </button>
          )}
        </div>

        {/* Type */}
        <div className="w-[100px] min-w-0 shrink-0 text-right">
          {site.site_type && <span className="text-xs font-medium text-text-muted bg-canvas px-2 py-0.5 rounded">{site.site_type}</span>}
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="flex lg:hidden items-start gap-3">
        <div
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center cursor-pointer shrink-0 mt-0.5 ${
            selected ? "bg-accent border-accent" : "border-[#CBD5E1] bg-white"
          }`}
        >
          {selected && <span className="text-white text-2xs font-bold">✓</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-md font-semibold text-text-primary truncate">{site.name}</p>
            {site.code && <span className="text-xs font-mono text-text-muted shrink-0">{site.code}</span>}
          </div>
          {group && (
            <p className="text-sm text-accent font-medium mb-1 truncate">
              {group.name}
              {group.category && <span className="ml-1 text-2xs font-semibold uppercase text-text-muted">{group.category}</span>}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap text-sm text-text-secondary">
            <span className="flex items-center gap-1"><User size={10} className="text-text-muted" /> {site.technician_name || "No tech"}</span>
            {site.district && <span className="flex items-center gap-1"><MapPin size={10} className="text-text-muted" /> {site.district}</span>}
            {site.latitude && site.longitude && (
              <button
                onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, "_blank"); }}
                className="flex items-center gap-1 text-accent hover:underline cursor-pointer"
              >
                <ExternalLink size={10} /> Map
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function ProjectSitesPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();
  const { vizUser } = useUser();

  const { data: allSites = [], isLoading } = useSites();
  const { data: allGroups = [] } = useGroups();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAssignGroup, setShowAssignGroup] = useState(false);
  const [showAssignTech, setShowAssignTech] = useState(false);
  const groupFilter = searchParams.get("group_id") || "";

  const descIds = getDescendantIds(allGroups, projectId);
  const projectSites = allSites.filter((s) => descIds.includes(s.group_id));

  const groupFilterIds = groupFilter ? getDescendantIds(allGroups, groupFilter) : null;
  const activeGroup = groupFilter ? allGroups.find((g) => g.id === groupFilter) : null;

  const filtered = projectSites.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(s.name || "").toLowerCase().includes(q) && !(s.code || "").toLowerCase().includes(q) && !(s.district || "").toLowerCase().includes(q) && !(s.state || "").toLowerCase().includes(q) && !(s.technician_name || "").toLowerCase().includes(q)) return false;
    }
    if (groupFilterIds && !groupFilterIds.includes(s.group_id)) return false;
    return true;
  });

  const groupMap = {};
  allGroups.forEach((g) => { groupMap[g.id] = g; });

  function toggleSelect(siteId) {
    setSelectedIds((prev) => prev.includes(siteId) ? prev.filter((x) => x !== siteId) : [...prev, siteId]);
  }

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  return (
    <ProjectShell>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-semibold text-text-primary tracking-[-0.5px]">
              {activeGroup ? activeGroup.name : "Sites"}
              {activeGroup && <span className="text-lg font-normal text-text-secondary ml-2">— Sites</span>}
            </h1>
            <p className="text-md text-text-secondary mt-1">{filtered.length} site{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Bulk action bar */}
        {can.manageSites(vizUser) && selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-[#1A1A1A] text-white rounded-[10px] px-4 py-2.5 mb-4">
            <span className="text-base font-medium">{selectedIds.length} site{selectedIds.length !== 1 ? "s" : ""} selected</span>
            <div className="flex-1" />
            <Button size="sm" className="bg-transparent border border-[#666] text-white hover:bg-white/10 h-[30px] text-sm" onClick={() => setShowAssignGroup(true)}>Assign to Group</Button>
            <Button size="sm" className="bg-transparent border border-[#666] text-white hover:bg-white/10 h-[30px] text-sm" onClick={() => setShowAssignTech(true)}>Assign Technician</Button>
            <button onClick={() => setSelectedIds([])} className="text-[#999] hover:text-white cursor-pointer text-base">Clear</button>
          </div>
        )}

        {/* Search + controls */}
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sites, codes, districts, states, technicians..." className="h-[34px] pl-[34px] pr-3 w-[380px] bg-white border border-border rounded-lg text-md outline-none focus:border-accent transition-colors" />
          </div>
          {can.manageSites(vizUser) && filtered.length > 0 && (
            <button
              onClick={() => { if (allSelected) setSelectedIds([]); else setSelectedIds(filtered.map((s) => s.id)); }}
              className="h-[34px] px-3 rounded-lg border border-border bg-white text-base font-medium text-text-secondary hover:bg-canvas cursor-pointer transition-colors"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          )}
          {(search || groupFilter) && (
            <button onClick={() => { setSearch(""); navigate(`/projects/${projectId}/sites`, { replace: true }); }} className="text-base text-text-muted hover:text-text-secondary cursor-pointer">Clear filters</button>
          )}
          <span className="text-base text-text-muted ml-auto">{filtered.length} results</span>
        </div>

        {/* Site cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={16} className="animate-spin text-text-muted" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-border rounded-[14px] py-16 text-center">
            <MapPin size={24} className="text-text-disabled mx-auto mb-3" />
            <p className="text-lg text-text-muted">{search || groupFilter ? "No sites match your filters" : "No sites in this project yet"}</p>
          </div>
        ) : (
          <>
          <div className="hidden lg:flex items-center gap-4 px-4 mb-1">
            <div className="w-4 shrink-0" />
            <span className="w-[200px] shrink-0 text-xs font-semibold text-text-muted uppercase tracking-[0.04em]">Site</span>
            <span className="w-[180px] shrink-0 text-xs font-semibold text-text-muted uppercase tracking-[0.04em]">Group</span>
            <span className="w-[140px] shrink-0 text-xs font-semibold text-text-muted uppercase tracking-[0.04em]">Technician</span>
            <span className="flex-1 text-xs font-semibold text-text-muted uppercase tracking-[0.04em]">Location</span>
            <span className="w-[100px] shrink-0 text-xs font-semibold text-text-muted uppercase tracking-[0.04em] text-right">Type</span>
          </div>
          <div className="grid gap-1.5">
            {filtered.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                group={site.group_id ? groupMap[site.group_id] : null}
                selected={selectedIds.includes(site.id)}
                onSelect={() => toggleSelect(site.id)}
                onClick={() => navigate(`/projects/${projectId}/sites/${site.id}`)}
              />
            ))}
          </div>
          </>
        )}
      </div>

      <AssignGroupModal
        open={showAssignGroup}
        onClose={() => { setShowAssignGroup(false); setSelectedIds([]); }}
        siteIds={selectedIds}
        groups={allGroups.filter((g) => descIds.includes(g.id) && g.id !== projectId)}
        projectId={projectId}
      />
      <AssignTechModal
        open={showAssignTech}
        onClose={() => { setShowAssignTech(false); setSelectedIds([]); }}
        siteIds={selectedIds}
      />
    </ProjectShell>
  );
}
