import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus, Search, Loader2, ChevronDown, Briefcase, RotateCcw,
  User, MapPin, Calendar, CheckCircle2, Clock, Circle, Eye, AlertTriangle,
} from "lucide-react";
import { useJobsInfinite, useWorkflows, useGroup } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { can, getMyGroupRole } from "@/lib/permissions";
import { STATUS_CONFIG, STATUS_OPTIONS } from "@/lib/constants";
import ProjectShell from "@/components/ProjectShell";
import { Button } from "@/components/ui/button";

const STATUS_ICONS = {
  pending: Circle,
  in_progress: Clock,
  submitted: Eye,
  reviewed: CheckCircle2,
};

function JobCard({ job, onClick }) {
  const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const StatusIcon = STATUS_ICONS[job.status] || Circle;
  const isOverdue = job.status !== "reviewed" && job.due_date && new Date(job.due_date) < new Date();
  const dueStr = job.due_date ? new Date(job.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-border rounded-[10px] px-4 py-2.5 cursor-pointer transition-all hover:border-accent/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
    >
      {/* Desktop: single row */}
      <div className="hidden lg:flex items-center gap-4">
        {/* Title */}
        <div className="w-[260px] min-w-0 shrink-0">
          <div className="flex items-center gap-1.5">
            <p className="text-md font-semibold text-text-primary truncate">{job.title}</p>
            {job.rework_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-2xs font-semibold text-[#CA8A04] bg-[#FEFCE8] px-1.5 py-0.5 rounded shrink-0">
                <RotateCcw size={8} /> {job.rework_count}x
              </span>
            )}
          </div>
        </div>

        {/* Site */}
        <div className="w-[140px] min-w-0 shrink-0">
          <p className="text-base text-text-secondary truncate">{job.site_name || "—"}</p>
        </div>

        {/* Assigned to */}
        <div className="w-[140px] min-w-0 shrink-0">
          {job.assigned_to_name ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-accent-text">{job.assigned_to_name[0].toUpperCase()}</span>
              </div>
              <span className="text-base text-text-primary truncate">{job.assigned_to_name}</span>
            </div>
          ) : (
            <span className="text-base text-text-disabled">Unassigned</span>
          )}
        </div>

        {/* Status */}
        <div className="w-[100px] shrink-0">
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md" style={{ color: sc.color, background: sc.bg }}>
            <StatusIcon size={10} /> {sc.label}
          </span>
        </div>

        {/* Due */}
        <div className="flex-1 min-w-0 text-right">
          {dueStr ? (
            <span className={`text-base font-medium ${isOverdue ? "text-[#DC2626]" : "text-text-secondary"}`}>
              {isOverdue && <AlertTriangle size={10} className="inline mr-1 -mt-px" />}
              {dueStr}
            </span>
          ) : (
            <span className="text-base text-text-disabled">No due date</span>
          )}
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="flex lg:hidden items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: sc.bg }}>
          <StatusIcon size={14} style={{ color: sc.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-md font-semibold text-text-primary truncate">{job.title}</p>
            {job.rework_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-2xs font-semibold text-[#CA8A04] shrink-0">
                <RotateCcw size={8} /> {job.rework_count}x
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-sm text-text-secondary">
            {job.site_name && <span className="flex items-center gap-1"><MapPin size={10} className="text-text-muted" /> {job.site_name}</span>}
            <span className="flex items-center gap-1"><User size={10} className="text-text-muted" /> {job.assigned_to_name || "Unassigned"}</span>
            {dueStr && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-[#DC2626] font-semibold" : ""}`}>
                <Calendar size={10} className={isOverdue ? "text-[#DC2626]" : "text-text-muted"} /> {dueStr}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md shrink-0" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
      </div>
    </div>
  );
}

export default function ProjectJobsPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { vizUser } = useUser();
  const { data: project } = useGroup(projectId);
  const myGroupRole = getMyGroupRole(project, vizUser);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");
  const sentinelRef = useRef(null);

  const filters = { group_id: projectId };
  if (statusFilter) filters.status = statusFilter;
  if (workflowFilter) filters.workflow_id = workflowFilter;
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useJobsInfinite(filters);
  const { data: workflows = [] } = useWorkflows({ project_id: projectId });

  const jobs = data?.items || [];
  const totalCount = data?.total || 0;

  // Preload next page when sentinel is visible (5 items before end)
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filtered = jobs.filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (j.title || "").toLowerCase().includes(q) || (j.site_name || "").toLowerCase().includes(q) || (j.assigned_to_name || "").toLowerCase().includes(q);
  });

  return (
    <ProjectShell>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-semibold text-text-primary tracking-[-0.5px]">Jobs</h1>
            <p className="text-md text-text-secondary mt-1">{totalCount} job{totalCount !== 1 ? "s" : ""} in this project</p>
          </div>
          {can.createJob(vizUser, myGroupRole) && (
            <Button size="sm" className="gap-1.5" onClick={() => navigate(`/projects/${projectId}/jobs/new`)}>
              <Plus size={13} /> Create Job
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs, sites, assignees..." className="h-[34px] pl-[34px] pr-3 w-[300px] bg-white border border-border rounded-lg text-md outline-none focus:border-accent transition-colors" />
          </div>
          {workflows.length > 0 && (
            <div className="relative">
              <select value={workflowFilter} onChange={(e) => setWorkflowFilter(e.target.value)} className="appearance-none h-[34px] pl-3 pr-7 border border-border rounded-lg bg-white text-md cursor-pointer outline-none focus:border-accent">
                <option value="">All Workflows</option>
                {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          )}
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none h-[34px] pl-3 pr-7 border border-border rounded-lg bg-white text-md cursor-pointer outline-none focus:border-accent">
              {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
          {(search || statusFilter || workflowFilter) && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); setWorkflowFilter(""); }} className="text-base text-text-muted hover:text-text-secondary cursor-pointer">Clear filters</button>
          )}
          <span className="text-base text-text-muted ml-auto">{filtered.length} results</span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={16} className="animate-spin text-text-muted" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-border rounded-[14px] py-16 text-center">
            <Briefcase size={24} className="text-text-disabled mx-auto mb-3" />
            <p className="text-lg text-text-muted">{search || statusFilter || workflowFilter ? "No jobs match your filters" : "No jobs in this project yet"}</p>
          </div>
        ) : (
          <>
            {/* Column headers (desktop) */}
            <div className="hidden lg:flex items-center gap-4 px-4 mb-1">
              <span className="w-[260px] shrink-0 text-xs font-semibold text-text-muted uppercase tracking-[0.04em]">Title</span>
              <span className="w-[140px] shrink-0 text-xs font-semibold text-text-muted uppercase tracking-[0.04em]">Site</span>
              <span className="w-[140px] shrink-0 text-xs font-semibold text-text-muted uppercase tracking-[0.04em]">Assigned To</span>
              <span className="w-[100px] shrink-0 text-xs font-semibold text-text-muted uppercase tracking-[0.04em]">Status</span>
              <span className="flex-1 text-xs font-semibold text-text-muted uppercase tracking-[0.04em] text-right">Due</span>
            </div>
            <div className="grid gap-1.5">
              {filtered.map((job, i) => (
                <div key={job.id} ref={i === filtered.length - 5 ? sentinelRef : undefined}>
                  <JobCard
                    job={job}
                    onClick={() => navigate(`/projects/${projectId}/jobs/${job.id}`)}
                  />
                </div>
              ))}
            </div>
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-text-muted" />
              </div>
            )}
            {!hasNextPage && jobs.length > 0 && (
              <p className="text-center text-sm text-text-muted py-4">Showing all {totalCount} jobs</p>
            )}
          </>
        )}
      </div>
    </ProjectShell>
  );
}
