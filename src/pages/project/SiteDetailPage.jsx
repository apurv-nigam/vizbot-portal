import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, MapPin, Hash, Building2, User, Calendar,
  CheckCircle2, Clock, Circle, Eye, RotateCcw, Plus, ChevronRight,
  AlertTriangle, Briefcase,
} from "lucide-react";
import { useSite, useJobs, useWorkflows, useGroup } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { can, getMyGroupRole } from "@/lib/permissions";
import { STATUS_CONFIG } from "@/lib/constants";
import ProjectShell from "@/components/ProjectShell";
import { Button } from "@/components/ui/button";

const STATUS_ICONS = {
  pending: Circle,
  in_progress: Clock,
  submitted: Eye,
  reviewed: CheckCircle2,
};

const STATUS_COLORS = {
  reviewed: "#16A34A",
  submitted: "#CA8A04",
  in_progress: "#2563EB",
  pending: "var(--color-text-disabled)",
};

function InfoPill({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="inline-flex items-center gap-1.5 bg-white border border-border rounded-lg px-3 py-2">
      <Icon size={13} className="text-text-muted shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-text-muted leading-tight">{label}</p>
        <p className="text-md font-medium text-text-primary leading-tight">{value}</p>
      </div>
    </div>
  );
}

function TimelineEntry({ job, navigate, projectId, workflowName }) {
  const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const StatusIcon = STATUS_ICONS[job.status] || Circle;
  const isOverdue = job.status !== "reviewed" && job.due_date && new Date(job.due_date) < new Date();
  const dueStr = job.due_date ? new Date(job.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  const createdStr = new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      onClick={() => navigate(`/projects/${projectId}/jobs/${job.id}`)}
      className="flex gap-4 cursor-pointer group"
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center pt-1">
        <div className="w-3 h-3 rounded-full border-2 shrink-0" style={{ borderColor: STATUS_COLORS[job.status], background: job.status === "reviewed" ? STATUS_COLORS.reviewed : "white" }} />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6 min-w-0">
        <div className="bg-white border border-border rounded-[12px] p-4 group-hover:border-accent/30 group-hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <p className="text-md font-semibold text-text-primary group-hover:text-accent transition-colors truncate">{job.title}</p>
              {workflowName && (
                <p className="text-sm text-text-muted mt-0.5">{workflowName}</p>
              )}
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold shrink-0" style={{ color: sc.color, background: sc.bg }}>
              <StatusIcon size={10} /> {sc.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-text-muted flex-wrap">
            <span className="flex items-center gap-1">
              <User size={10} /> {job.assigned_to_name || "Unassigned"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={10} /> {createdStr}
            </span>
            {dueStr && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-[#DC2626] font-semibold" : ""}`}>
                {isOverdue && <AlertTriangle size={10} />}
                Due {dueStr}
              </span>
            )}
            {job.rework_count > 0 && (
              <span className="flex items-center gap-1 text-[#CA8A04] font-semibold">
                <RotateCcw size={10} /> Rework {job.rework_count}x
              </span>
            )}
          </div>

          {/* Submission progress */}
          {job.capture_config?.tasks && (
            (() => {
              const tasks = job.capture_config.tasks;
              const submissions = job.submissions || {};
              const totalFields = tasks.reduce((sum, t) => sum + (t.fields?.length || 0), 0);
              const filled = tasks.reduce((sum, t) => {
                const td = submissions[t.id] || {};
                return sum + (t.fields || []).filter(f => { const v = td[f.id]; return v !== undefined && v !== null && v !== ""; }).length;
              }, 0);
              if (totalFields === 0) return null;
              const pct = Math.round((filled / totalFields) * 100);
              return (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">{filled}/{totalFields} fields</span>
                    <span className="text-xs font-semibold text-text-primary">{pct}%</span>
                  </div>
                  <div className="h-1 bg-canvas rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#16A34A" : "var(--color-accent)" }} />
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

export default function SiteDetailPage() {
  const navigate = useNavigate();
  const { id: projectId, siteId } = useParams();
  const { vizUser } = useUser();

  const { data: site, isLoading: siteLoading } = useSite(siteId);
  const { data: project } = useGroup(projectId);
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ site_id: siteId, limit: 200 });
  const jobs = jobsData?.items || [];
  const { data: workflows = [] } = useWorkflows({ project_id: projectId });

  const myGroupRole = getMyGroupRole(project, vizUser);
  const basePath = `/projects/${projectId}`;

  const workflowMap = {};
  workflows.forEach((w) => { workflowMap[w.id] = w.name; });

  if (siteLoading) {
    return <ProjectShell><div className="flex items-center justify-center py-32"><Loader2 size={16} className="animate-spin text-text-muted" /></div></ProjectShell>;
  }

  if (!site) {
    return (
      <ProjectShell>
        <div className="max-w-[600px] mx-auto text-center py-20">
          <p className="text-lg text-[#DC2626] mb-4">Site not found</p>
          <Button variant="secondary" onClick={() => navigate(`${basePath}/sites`)}>Back to Sites</Button>
        </div>
      </ProjectShell>
    );
  }

  // Sort jobs by created_at descending (newest first)
  const sortedJobs = [...jobs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  // Group jobs by month
  const jobsByMonth = {};
  sortedJobs.forEach((j) => {
    const d = new Date(j.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!jobsByMonth[key]) jobsByMonth[key] = { label, jobs: [] };
    jobsByMonth[key].jobs.push(j);
  });
  const months = Object.keys(jobsByMonth).sort().reverse();

  // Stats
  const reviewed = jobs.filter((j) => j.status === "reviewed").length;
  const submitted = jobs.filter((j) => j.status === "submitted").length;
  const pending = jobs.filter((j) => j.status === "pending" || j.status === "in_progress").length;
  const overdue = jobs.filter((j) => j.status !== "reviewed" && j.due_date && new Date(j.due_date) < new Date()).length;
  const reworked = jobs.filter((j) => j.rework_count > 0).length;

  // Workflow coverage
  const workflowJobs = {};
  jobs.forEach((j) => {
    if (!j.workflow_id) return;
    if (!workflowJobs[j.workflow_id]) workflowJobs[j.workflow_id] = [];
    workflowJobs[j.workflow_id].push(j);
  });

  return (
    <ProjectShell>
      <div className="max-w-[820px] mx-auto px-6 lg:px-8 py-6">

        {/* Back */}
        <button onClick={() => navigate(`${basePath}/sites`)} className="flex items-center gap-1.5 text-md font-medium text-text-muted hover:text-text-secondary transition-colors cursor-pointer mb-5">
          <ArrowLeft size={14} /> Sites
        </button>

        {/* Site Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-text-primary tracking-[-0.3px]">{site.name}</h1>
              {site.code && <p className="text-lg font-mono text-text-muted mt-0.5">{site.code}</p>}
            </div>
            {can.createJob(vizUser, myGroupRole) && (
              <Button size="sm" className="gap-1.5" onClick={() => navigate(`${basePath}/jobs/new`)}>
                <Plus size={13} /> Create Job
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <InfoPill icon={Building2} label="Type" value={site.site_type} />
            <InfoPill icon={MapPin} label="Location" value={[site.district, site.state].filter(Boolean).join(", ")} />
            <InfoPill icon={User} label="Technician" value={site.technician_name} />
            {site.latitude && site.longitude && (
              <InfoPill icon={MapPin} label="Coordinates" value={`${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}`} />
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-2.5 mb-6">
          <div className="bg-white border border-border rounded-[10px] px-3 py-2.5 text-center">
            <p className="text-3xl font-bold text-text-primary tracking-[-1px] leading-none">{jobs.length}</p>
            <p className="text-xs text-text-muted mt-1">Total Jobs</p>
          </div>
          <div className="bg-white border border-border rounded-[10px] px-3 py-2.5 text-center">
            <p className="text-3xl font-bold text-[#16A34A] tracking-[-1px] leading-none">{reviewed}</p>
            <p className="text-xs text-text-muted mt-1">Reviewed</p>
          </div>
          <div className="bg-white border border-border rounded-[10px] px-3 py-2.5 text-center">
            <p className="text-3xl font-bold text-[#CA8A04] tracking-[-1px] leading-none">{submitted}</p>
            <p className="text-xs text-text-muted mt-1">Submitted</p>
          </div>
          <div className="bg-white border border-border rounded-[10px] px-3 py-2.5 text-center">
            <p className={`text-3xl font-bold tracking-[-1px] leading-none ${overdue > 0 ? "text-[#DC2626]" : "text-text-primary"}`}>{overdue}</p>
            <p className="text-xs text-text-muted mt-1">Overdue</p>
          </div>
          <div className="bg-white border border-border rounded-[10px] px-3 py-2.5 text-center">
            <p className={`text-3xl font-bold tracking-[-1px] leading-none ${reworked > 0 ? "text-[#CA8A04]" : "text-text-primary"}`}>{reworked}</p>
            <p className="text-xs text-text-muted mt-1">Rework</p>
          </div>
        </div>

        {/* Workflow Coverage */}
        {Object.keys(workflowJobs).length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-primary mb-3">Workflow Coverage</h2>
            <div className="bg-white border border-border rounded-[14px] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-4 py-2.5 text-left bg-canvas border-b border-border">Workflow</th>
                    <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Runs</th>
                    <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Reviewed</th>
                    <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-left bg-canvas border-b border-border">Last Run</th>
                    <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-left bg-canvas border-b border-border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(workflowJobs).map(([wfId, wfJobs]) => {
                    const wfName = workflowMap[wfId] || "Unknown Workflow";
                    const wfReviewed = wfJobs.filter((j) => j.status === "reviewed").length;
                    const latest = [...wfJobs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                    const latestSc = STATUS_CONFIG[latest.status] || STATUS_CONFIG.pending;
                    const LatestIcon = STATUS_ICONS[latest.status] || Circle;
                    return (
                      <tr key={wfId} className="hover:bg-surface-hover transition-colors">
                        <td className="px-4 py-3 border-b border-canvas">
                          <p className="text-base font-medium text-text-primary">{wfName}</p>
                        </td>
                        <td className="px-3 py-3 border-b border-canvas text-center text-base text-text-primary">{wfJobs.length}</td>
                        <td className="px-3 py-3 border-b border-canvas text-center text-base font-medium text-[#16A34A]">{wfReviewed}</td>
                        <td className="px-3 py-3 border-b border-canvas text-base text-text-secondary">
                          {new Date(latest.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-3 py-3 border-b border-canvas">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: latestSc.color, background: latestSc.bg }}>
                            <LatestIcon size={9} /> {latestSc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Job Timeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Job Timeline</h2>
            <span className="text-base text-text-muted">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
          </div>

          {jobsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={16} className="animate-spin text-text-muted" /></div>
          ) : jobs.length === 0 ? (
            <div className="bg-white border border-border rounded-[14px] p-12 text-center">
              <Briefcase size={24} className="text-text-disabled mx-auto mb-3" />
              <p className="text-lg text-text-muted mb-1">No jobs for this site yet</p>
              <p className="text-base text-text-muted mb-4">Create a job to start tracking inspections.</p>
              {can.createJob(vizUser, myGroupRole) && (
                <Button size="sm" className="gap-1.5" onClick={() => navigate(`${basePath}/jobs/new`)}>
                  <Plus size={13} /> Create Job
                </Button>
              )}
            </div>
          ) : (
            <div>
              {months.map((monthKey) => {
                const { label, jobs: monthJobs } = jobsByMonth[monthKey];
                return (
                  <div key={monthKey}>
                    {/* Month header */}
                    <div className="flex items-center gap-3 mb-3 mt-2">
                      <span className="text-base font-semibold text-text-secondary">{label}</span>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-sm text-text-muted">{monthJobs.length} job{monthJobs.length !== 1 ? "s" : ""}</span>
                    </div>

                    {/* Timeline entries */}
                    {monthJobs.map((job) => (
                      <TimelineEntry
                        key={job.id}
                        job={job}
                        navigate={navigate}
                        projectId={projectId}
                        workflowName={workflowMap[job.workflow_id]}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProjectShell>
  );
}
