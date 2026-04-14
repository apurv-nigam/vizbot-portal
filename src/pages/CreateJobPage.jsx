import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, ChevronDown, Search, Calendar, MapPin } from "lucide-react";
import { useWorkflows, useSites, useCreateJob } from "@/lib/queries";
import ProjectShell from "@/components/ProjectShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

export default function CreateJobPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();
  const basePath = projectId ? `/projects/${projectId}` : "";

  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows(projectId ? { project_id: projectId } : {});
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const createJob = useCreateJob();

  const preSelectedSiteId = searchParams.get("site_id") || "";

  const [selectedSiteId, setSelectedSiteId] = useState(preSelectedSiteId);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [dueDate, setDueDate] = useState(formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  const [siteSearch, setSiteSearch] = useState("");
  const [siteOpen, setSiteOpen] = useState(false);
  const [error, setError] = useState(null);

  const loading = workflowsLoading || sitesLoading;

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

  // Auto-generate title
  const autoTitle = selectedSite && selectedWorkflow
    ? `${selectedSite.name}${selectedSite.code ? ` (${selectedSite.code})` : ""} — ${selectedWorkflow.name}`
    : "";

  // Filter sites for search
  const filteredSites = sites.filter((s) => {
    if (!siteSearch) return true;
    const q = siteSearch.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q) || (s.district || "").toLowerCase().includes(q);
  });

  function handleCreate() {
    if (!selectedSiteId || !selectedWorkflowId) return;
    if (!selectedSite?.technician_id) {
      setError("This site has no technician assigned. Assign a technician to the site first.");
      return;
    }
    setError(null);
    createJob.mutate(
      {
        title: autoTitle,
        workflow_id: selectedWorkflowId,
        site_id: selectedSiteId,
        assigned_to: selectedSite.technician_id,
        due_date: dueDate || null,
      },
      {
        onSuccess: () => navigate(`${basePath}/jobs`, { replace: true }),
        onError: (err) => setError(err.message),
      }
    );
  }

  if (loading) {
    return (
      <ProjectShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={16} className="animate-spin text-text-muted" />
        </div>
      </ProjectShell>
    );
  }

  return (
    <ProjectShell>
      <div className="max-w-[560px] mx-auto px-6 lg:px-9 py-6">
        <button
          onClick={() => navigate(`${basePath}/jobs`)}
          className="flex items-center gap-1.5 text-md font-medium text-text-muted hover:text-text-secondary transition-colors cursor-pointer mb-5"
        >
          <ArrowLeft size={14} /> Jobs
        </button>

        <h1 className="text-4xl font-semibold text-text-primary tracking-[-0.5px] mb-1">Create Job</h1>
        <p className="text-md text-text-secondary mb-6">Select a site and workflow to create a field assignment.</p>

        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Site picker */}
            <div>
              <label className="block text-base font-semibold text-text-secondary mb-1.5">Site *</label>
              {selectedSite ? (
                <div className="flex items-center justify-between h-[42px] px-3.5 rounded-lg border-[1.5px] border-accent bg-surface-hover">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-accent shrink-0" />
                    <div>
                      <span className="text-md font-medium text-text-primary">{selectedSite.name}</span>
                      {selectedSite.code && <span className="ml-1 text-sm font-mono text-text-muted">{selectedSite.code}</span>}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedSiteId(""); setSiteSearch(""); }} className="text-base text-text-muted hover:text-text-secondary cursor-pointer">Change</button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
                    <Input
                      value={siteSearch}
                      onChange={(e) => { setSiteSearch(e.target.value); setSiteOpen(true); }}
                      onFocus={() => setSiteOpen(true)}
                      placeholder="Search sites by name or code..."
                      className="pl-9"
                      autoComplete="off"
                    />
                  </div>
                  {siteOpen && (
                    <>
                      <div onClick={() => setSiteOpen(false)} className="fixed inset-0 z-10" />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-border shadow-[0_8px_30px_rgba(0,0,0,0.1)] max-h-[240px] overflow-y-auto z-20">
                        {filteredSites.length === 0 ? (
                          <p className="p-3 text-md text-text-muted">No sites found</p>
                        ) : (
                          filteredSites.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => { setSelectedSiteId(s.id); setSiteOpen(false); setSiteSearch(""); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-hover transition-colors cursor-pointer border-b border-canvas last:border-0"
                            >
                              <MapPin size={13} className="text-text-muted shrink-0" />
                              <div className="min-w-0">
                                <p className="text-md font-medium text-text-primary truncate">
                                  {s.name}
                                  {s.code && <span className="ml-1.5 text-sm font-mono text-text-muted">{s.code}</span>}
                                </p>
                                <p className="text-sm text-text-muted truncate">{[s.district, s.state].filter(Boolean).join(", ") || "No location"}</p>
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

            {/* Site info (shown when site selected) */}
            {selectedSite && (
              <div className="bg-canvas rounded-lg px-3.5 py-2.5 space-y-1">
                {selectedSite.technician_name ? (
                  <div className="flex items-center justify-between text-base">
                    <span className="text-text-secondary">Technician</span>
                    <span className="font-medium text-text-primary">{selectedSite.technician_name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-base text-[#DC2626]">
                    <span>No technician assigned to this site</span>
                  </div>
                )}
                {(selectedSite.district || selectedSite.state) && (
                  <div className="flex items-center justify-between text-base">
                    <span className="text-text-secondary">Location</span>
                    <span className="font-medium text-text-primary">{[selectedSite.district, selectedSite.state].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
            )}

            {/* Workflow picker */}
            <div>
              <label className="block text-base font-semibold text-text-secondary mb-1.5">Workflow *</label>
              <div className="relative">
                <select
                  value={selectedWorkflowId}
                  onChange={(e) => setSelectedWorkflowId(e.target.value)}
                  className="appearance-none w-full h-[42px] pl-3.5 pr-8 rounded-lg border-[1.5px] border-border bg-white text-md cursor-pointer outline-none focus:border-accent"
                >
                  <option value="">Select a workflow...</option>
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.task_count || 0} tasks)</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="flex items-center gap-1.5 text-base font-semibold text-text-secondary mb-1.5">
                <Calendar size={12} /> Due date
              </label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            {/* Preview */}
            {autoTitle && (
              <div className="bg-accent-light rounded-lg px-3.5 py-2.5">
                <p className="text-sm font-semibold text-accent-text mb-0.5">Job will be created as:</p>
                <p className="text-md font-medium text-accent-text">{autoTitle}</p>
                {selectedSite?.technician_name && (
                  <p className="text-sm text-accent mt-1">Assigned to {selectedSite.technician_name} · Due {new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                )}
              </div>
            )}

            {error && <p className="text-base text-[#DC2626]">{error}</p>}

            <Button
              onClick={handleCreate}
              disabled={createJob.isPending || !selectedSiteId || !selectedWorkflowId}
              className="w-full"
            >
              {createJob.isPending ? <Loader2 size={14} className="animate-spin" /> : "Create Job"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProjectShell>
  );
}
