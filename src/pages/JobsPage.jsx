import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Loader2, ChevronDown, Briefcase, RotateCcw,
} from "lucide-react";
import { useJobs, useWorkflows } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { can } from "@/lib/permissions";
import { STATUS_CONFIG, STATUS_OPTIONS } from "@/lib/constants";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className="inline-block text-[11px] font-semibold px-2.5 py-[3px] rounded-md capitalize" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

export default function JobsPage() {
  const navigate = useNavigate();
  const { vizUser } = useUser();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");

  const filters = {};
  if (statusFilter) filters.status = statusFilter;
  if (workflowFilter) filters.workflow_id = workflowFilter;
  const { data: jobs = [], isLoading } = useJobs(filters);
  const { data: workflows = [] } = useWorkflows();

  const filtered = jobs.filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (j.title || "").toLowerCase().includes(q) || (j.site_name || "").toLowerCase().includes(q);
  });

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-9 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.5px]">Jobs</h1>
            <p className="text-[13px] text-text-secondary mt-1">All field assignments</p>
          </div>
          {can.createJob(vizUser) && (
            <Button size="sm" className="gap-1.5" onClick={() => navigate("/jobs/new")}>
              <Plus size={13} /> Create Job
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-border rounded-[14px] overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-b border-border flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs..."
                className="h-[34px] pl-[34px] pr-3 w-[220px] bg-canvas border border-border rounded-lg text-[13px] outline-none focus:border-accent transition-colors"
              />
            </div>
            {workflows.length > 0 && (
              <div className="relative">
                <select value={workflowFilter} onChange={(e) => setWorkflowFilter(e.target.value)} className="appearance-none h-[34px] pl-3 pr-7 border border-border rounded-lg bg-white text-[13px] cursor-pointer outline-none focus:border-accent">
                  <option value="">All Workflows</option>
                  {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            )}
            <div className="relative">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none h-[34px] pl-3 pr-7 border border-border rounded-lg bg-white text-[13px] cursor-pointer outline-none focus:border-accent">
                {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
            <span className="text-[12px] text-text-muted ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={16} className="animate-spin text-text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Briefcase size={24} className="text-text-disabled mx-auto mb-3" />
              <p className="text-[14px] text-text-muted">{search || statusFilter || workflowFilter ? "No jobs match your filters" : "No jobs yet"}</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Title</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Site</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Workflow</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Assigned To</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Status</th>
                  <th className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.4px] px-4 py-2.5 text-left bg-surface-hover border-b border-border">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => {
                  return (
                    <tr
                      key={job.id}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="cursor-pointer transition-colors hover:bg-surface-hover"
                    >
                      <td className="px-4 py-[11px] border-b border-canvas">
                        <span className="text-[13px] font-medium">{job.title}</span>
                        {job.rework_count > 0 && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#633806] bg-[#FAEEDA] px-1.5 py-0.5 rounded">
                            <RotateCcw size={9} /> Rework
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-[11px] border-b border-canvas text-[13px]">
                        {job.site_name || "—"}
                      </td>
                      <td className="px-4 py-[11px] border-b border-canvas text-[13px] text-text-secondary">
                        {job.workflow_name || "—"}
                      </td>
                      <td className="px-4 py-[11px] border-b border-canvas text-[13px]">
                        {job.assigned_to_name || job.assigned_to_email || "Unassigned"}
                      </td>
                      <td className="px-4 py-[11px] border-b border-canvas">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-[11px] border-b border-canvas text-[13px] text-text-secondary">
                        {job.due_date ? new Date(job.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
