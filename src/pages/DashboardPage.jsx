import { useNavigate } from "react-router-dom";
import {
  Plus, Loader2, Briefcase,
  CheckCircle2, ChevronRight,
} from "lucide-react";
import { useWorkflows, useJobs } from "@/lib/queries";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TYPE_CONFIG = {
  image: { emoji: "\u{1F4F7}", color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  video: { emoji: "\u{1F3AC}", color: "#2563EB", bg: "#EFF6FF" },
  point_cloud: { emoji: "\u{1F9CA}", color: "#0D9488", bg: "#E6F7F5" },
  geospatial: { emoji: "\u{1F30D}", color: "#D97706", bg: "#FFFBEB" },
};

function MetricCard({ label, value, subtitle, subtitleColor, variant }) {
  const borderClass = variant === "alert"
    ? "border-l-[3px] border-l-[#DC2626] rounded-l-none"
    : variant === "warn"
      ? "border-l-[3px] border-l-[#CA8A04] rounded-l-none"
      : variant === "info"
        ? "border-l-[3px] border-l-[#60A5FA] rounded-l-none"
        : "";

  const valueColor = variant === "alert" ? "text-[#DC2626]"
    : variant === "warn" ? "text-[#CA8A04]"
    : variant === "info" ? "text-accent"
    : "text-text-primary";

  return (
    <div className={`bg-white border border-border rounded-xl p-4 ${borderClass}`}>
      <p className="text-[12px] text-text-muted mb-1">{label}</p>
      <p className={`text-[28px] font-medium leading-tight ${valueColor}`}>{value}</p>
      {subtitle && <p className="text-[12px] mt-1" style={{ color: subtitleColor || "var(--color-text-muted)" }}>{subtitle}</p>}
    </div>
  );
}

function WorkflowCard({ workflow, onClick }) {
  const config = TYPE_CONFIG[workflow.asset_type] || TYPE_CONFIG.image;
  const taskCount = workflow.task_count || 0;
  const siteCount = workflow.site_count || 0;
  const jobCount = workflow.job_count || 0;

  return (
    <div onClick={onClick} className="group bg-white rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 cursor-pointer transition-all duration-200 hover:border-accent">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: config.bg }}>
          <span className="text-base">{config.emoji}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-text-primary truncate">{workflow.name}</p>
          <p className="text-[11px] text-text-muted">{(workflow.asset_type || "").replace("_", " ")} · {taskCount} task{taskCount !== 1 ? "s" : ""}</p>
        </div>
      </div>
      {workflow.description && (
        <p className="text-[12px] text-text-muted leading-relaxed mb-3 line-clamp-2">{workflow.description}</p>
      )}
      <div className="flex gap-1.5 flex-wrap pt-2.5 border-t border-canvas">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-canvas text-text-secondary">{siteCount} sites</span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-canvas text-text-secondary">{jobCount} jobs</span>
      </div>
    </div>
  );
}

function ReviewItem({ job, workflowName, onNavigate }) {
  return (
    <div onClick={onNavigate} className="flex items-start gap-2.5 py-3 border-b border-canvas last:border-0 cursor-pointer group">
      <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center shrink-0 text-sm">🔍</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-text-primary group-hover:text-accent transition-colors truncate">{job.title}</p>
        <p className="text-[11px] text-text-muted mt-0.5">{workflowName} · Submitted {formatRelativeDate(job.updated_at || job.created_at)}</p>
      </div>
      <ChevronRight size={14} className="text-text-disabled shrink-0 mt-1" />
    </div>
  );
}


function formatRelativeDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows();
  const { data: allJobs = [], isLoading: jobsLoading } = useJobs({});

  const loading = workflowsLoading;

  // Compute metrics
  const awaitingReview = allJobs.filter((j) => j.status === "submitted");
  const reworkJobs = allJobs.filter((j) => j.rework_count > 0 && j.status === "in_progress");
  const totalSites = workflows.reduce((sum, p) => sum + (p.site_count || 0), 0);

  // Awaiting review subtitle
  const awaitingSubtitle = awaitingReview.length > 0
    ? `Oldest: ${formatRelativeDate(awaitingReview.reduce((oldest, j) => {
        const d = j.updated_at || j.created_at;
        return d < oldest ? d : oldest;
      }, awaitingReview[0]?.updated_at || awaitingReview[0]?.created_at))}`
    : "No submissions pending";

  return (
    <AppShell>
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-medium text-text-primary">Dashboard</h1>
            <p className="text-[13px] text-text-muted mt-0.5">Here's what needs your attention.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={16} className="animate-spin text-text-muted" />
          </div>
        ) : workflows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-accent-light mx-auto mb-5 flex items-center justify-center">
                <Briefcase size={24} className="text-accent" />
              </div>
              <h2 className="text-[18px] font-bold text-text-primary mb-2">No workflows yet</h2>
              <p className="text-[14px] text-text-secondary max-w-[320px] mx-auto">
                Go to Workflows to create your first capture template.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <MetricCard
                label="Awaiting review"
                value={awaitingReview.length}
                subtitle={awaitingSubtitle}
                subtitleColor={awaitingReview.length > 0 ? "#CA8A04" : undefined}
                variant={awaitingReview.length > 0 ? "warn" : undefined}
              />
              <MetricCard
                label="Sent for rework"
                value={reworkJobs.length}
                subtitle={reworkJobs.length > 0 ? `${reworkJobs.length} job${reworkJobs.length !== 1 ? "s" : ""} in progress` : "No rework pending"}
                variant={reworkJobs.length > 0 ? "info" : undefined}
              />
              <MetricCard
                label="Active sites"
                value={totalSites}
                subtitle={`Across ${workflows.length} workflow${workflows.length !== 1 ? "s" : ""}`}
              />
            </div>

            {/* Two-column layout */}
            <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 360px" }}>
              {/* Left: Workflows */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[16px] font-medium text-text-primary">Workflow Templates</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {workflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onClick={() => navigate(`/workflows/${workflow.id}`)}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Review queue + Overdue */}
              <div>
                {/* Review queue */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[16px] font-medium text-text-primary">Review queue</h2>
                  {awaitingReview.length > 0 && (
                    <span className="text-[12px] font-medium text-[#CA8A04]">{awaitingReview.length} awaiting</span>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-border p-4 mb-5">
                  {jobsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 size={14} className="animate-spin text-text-muted" />
                    </div>
                  ) : awaitingReview.length === 0 ? (
                    <p className="text-[13px] text-text-muted text-center py-4">No submissions to review</p>
                  ) : (
                    awaitingReview.slice(0, 5).map((job) => (
                      <ReviewItem
                        key={job.id}
                        job={job}
                        workflowName={job.workflow_name || "Unknown"}
                        onNavigate={() => navigate(`/jobs/${job.id}`)}
                      />
                    ))
                  )}
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
