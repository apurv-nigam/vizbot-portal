import { useNavigate, useParams } from "react-router-dom";
import {
  Loader2, MapPin, Briefcase, ChevronRight, RotateCcw,
  CheckCircle2, Clock, Circle, AlertCircle, Plus,
  Users, FolderOpen, ArrowUpRight, TrendingUp, Eye,
  AlertTriangle, UserCheck, CalendarClock,
} from "lucide-react";
import { useGroup, useGroups, useSites, useJobs, useJobStats, useWorkflows } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { can, getMyGroupRole } from "@/lib/permissions";
import { getDescendantIds, getChildren, STATUS_CONFIG } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ProjectShell from "@/components/ProjectShell";
import { Button } from "@/components/ui/button";

// ── Helpers ──

function daysBetween(a, b) {
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function daysOverdue(dueDate) {
  if (!dueDate) return 0;
  const diff = daysBetween(new Date(dueDate), new Date());
  return diff > 0 ? diff : 0;
}

// ── Small Components ──

function MetricCard({ label, value, sub, accent, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-border rounded-[14px] px-5 py-4 relative overflow-hidden ${onClick ? "cursor-pointer hover:border-accent/30 transition-colors" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-text-muted uppercase tracking-[0.05em] mb-1.5">{label}</p>
          <p className={`text-6xl font-bold tracking-[-1.5px] leading-none ${accent || "text-text-primary"}`}>{value}</p>
          {sub && <p className="text-sm text-text-muted mt-1.5">{sub}</p>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-canvas flex items-center justify-center shrink-0">
            <Icon size={16} className="text-text-muted" />
          </div>
        )}
      </div>
    </div>
  );
}

function CompletionRing({ completed, total, size = 40 }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-canvas)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={pct === 100 ? "#16A34A" : pct > 50 ? "var(--color-accent)" : "#CA8A04"}
          strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xs font-bold text-text-primary">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, action, actionLabel, icon: Icon }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={15} className="text-text-muted" />}
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      </div>
      {action && (
        <button onClick={action} className="flex items-center gap-1 text-base font-medium text-accent cursor-pointer hover:underline">
          {actionLabel} <ArrowUpRight size={11} />
        </button>
      )}
    </div>
  );
}

// ── Pipeline Bar ──

function PipelineBar({ byStatus, total }) {
  if (!total) return null;
  const counts = {
    reviewed: byStatus.reviewed || 0,
    submitted: byStatus.submitted || 0,
    in_progress: byStatus.in_progress || 0,
    pending: byStatus.pending || 0,
  };
  const segments = [
    { key: "reviewed", label: "Reviewed", count: counts.reviewed, color: "#16A34A" },
    { key: "submitted", label: "Submitted", count: counts.submitted, color: "#CA8A04" },
    { key: "in_progress", label: "In Progress", count: counts.in_progress, color: "#2563EB" },
    { key: "pending", label: "Pending", count: counts.pending, color: "var(--color-text-disabled)" },
  ];
  return (
    <div className="bg-white border border-border rounded-[14px] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text-primary">Job Pipeline</h2>
        <span className="text-base text-text-muted">{total} total</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden flex bg-canvas mb-3">
        {segments.map((seg) => seg.count > 0 ? (
          <div key={seg.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(seg.count / total) * 100}%`, background: seg.color }} />
        ) : null)}
      </div>
      <div className="flex items-center gap-5 flex-wrap">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-sm text-text-secondary">{seg.label}</span>
            <span className="text-sm font-semibold text-text-primary">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──

export default function ProjectOverviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { vizUser } = useUser();

  const { data: project, isLoading } = useGroup(id);
  const { data: allGroups = [] } = useGroups();
  const { data: allSites = [] } = useSites();
  const { data: stats } = useJobStats({ group_id: id });
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ group_id: id, limit: 100 });
  const jobs = jobsData?.items || [];
  const { data: workflows = [] } = useWorkflows({ project_id: id });
  const myGroupRole = getMyGroupRole(project, vizUser);

  if (isLoading) {
    return <ProjectShell><div className="flex items-center justify-center py-32"><Loader2 size={16} className="animate-spin text-text-muted" /></div></ProjectShell>;
  }

  const descIds = getDescendantIds(allGroups, id);
  const projectSites = allSites.filter((s) => descIds.includes(s.group_id));
  const children = getChildren(allGroups, id);
  const now = new Date();

  // ── KPI metrics from stats API ──
  const byStatus = stats?.by_status || {};
  const totalJobs = stats?.total || 0;
  const reviewedCount = byStatus.reviewed || 0;
  const submittedCount = byStatus.submitted || 0;
  const pendingCount = byStatus.pending || 0;
  const inProgressCount = byStatus.in_progress || 0;
  const completionRate = totalJobs > 0 ? Math.round((reviewedCount / totalJobs) * 100) : 0;

  // ── Overdue & rework from paginated jobs (first 100 items — best effort) ──
  const activeJobs = jobs.filter((j) => j.status !== "reviewed");
  const overdueJobs = activeJobs.filter((j) => j.due_date && new Date(j.due_date) < now)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const reworkedJobs = jobs.filter((j) => j.rework_count > 0);
  const reworkRate = (submittedCount + reviewedCount) > 0
    ? Math.round((reworkedJobs.length / (submittedCount + reviewedCount)) * 100)
    : 0;

  // ── Group breakdown ──
  const groupStats = children.map((group) => {
    const gDescIds = getDescendantIds(allGroups, group.id);
    const gSites = allSites.filter((s) => gDescIds.includes(s.group_id));
    const gSiteIds = new Set(gSites.map((s) => s.id));
    const gJobs = jobs.filter((j) => j.site_id && gSiteIds.has(j.site_id));
    const gReviewed = gJobs.filter((j) => j.status === "reviewed").length;
    const gOverdue = gJobs.filter((j) => j.status !== "reviewed" && j.due_date && new Date(j.due_date) < now).length;
    const gRework = gJobs.filter((j) => j.rework_count > 0).length;
    return { ...group, siteCount: gSites.length, jobCount: gJobs.length, reviewed: gReviewed, overdue: gOverdue, rework: gRework };
  });

  // ── Team breakdown ──
  const teamMap = {};
  jobs.forEach((j) => {
    const name = j.assigned_to_name || "Unassigned";
    const key = j.assigned_to || "unassigned";
    if (!teamMap[key]) teamMap[key] = { name, assigned: 0, completed: 0, pending: 0, rework: 0, overdue: 0 };
    teamMap[key].assigned++;
    if (j.status === "reviewed") teamMap[key].completed++;
    if (j.status === "pending" || j.status === "in_progress") teamMap[key].pending++;
    if (j.rework_count > 0) teamMap[key].rework++;
    if (j.status !== "reviewed" && j.due_date && new Date(j.due_date) < now) teamMap[key].overdue++;
  });
  const teamStats = Object.values(teamMap).sort((a, b) => b.assigned - a.assigned);

  // ── Monthly chart data from stats API ──
  const monthlyData = (stats?.by_month || []).slice(-12).map((m) => {
    const d = new Date(m.month + "-01");
    return { ...m, label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
  });

  // ── Uncovered sites ──
  const siteIdsWithJobs = new Set(jobs.map((j) => j.site_id).filter(Boolean));
  const uncoveredSites = projectSites.filter((s) => !siteIdsWithJobs.has(s.id));

  return (
    <ProjectShell>
      <div className="max-w-[1060px] mx-auto px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-semibold text-text-primary tracking-[-0.5px]">{project?.name}</h1>
            <p className="text-md text-text-secondary mt-0.5">
              {project?.manager_name ? `Managed by ${project.manager_name}` : "Project overview"}
              {project?.member_count ? ` · ${project.member_count} members` : ""}
            </p>
          </div>
          {can.createJob(vizUser, myGroupRole) && (
            <Button size="sm" className="gap-1.5" onClick={() => navigate(`/projects/${id}/jobs/new`)}>
              <Plus size={13} /> Create Job
            </Button>
          )}
        </div>

        {/* ═══ KPI Row ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <MetricCard label="Sites" value={projectSites.length} icon={MapPin} sub={`${children.length} group${children.length !== 1 ? "s" : ""}`} />
          <MetricCard label="Jobs" value={totalJobs} icon={Briefcase} sub={`${workflows.length} workflow${workflows.length !== 1 ? "s" : ""}`} />
          <MetricCard
            label="Completion"
            value={`${completionRate}%`}
            icon={TrendingUp}
            accent={completionRate === 100 ? "text-[#16A34A]" : ""}
            sub={`${reviewedCount} of ${totalJobs} reviewed`}
          />
          <MetricCard
            label="Overdue"
            value={overdueJobs.length}
            icon={CalendarClock}
            accent={overdueJobs.length > 0 ? "text-[#DC2626]" : ""}
            sub={overdueJobs.length > 0 ? "Needs attention" : "On track"}
          />
          <MetricCard
            label="Rework Rate"
            value={`${reworkRate}%`}
            icon={RotateCcw}
            accent={reworkRate > 20 ? "text-[#DC2626]" : reworkRate > 10 ? "text-[#CA8A04]" : ""}
            sub={`${reworkedJobs.length} returned`}
          />
        </div>

        {/* ═══ Pipeline Bar ═══ */}
        {totalJobs > 0 && (
          <div className="mb-5">
            <PipelineBar byStatus={byStatus} total={totalJobs} />
          </div>
        )}

        {/* ═══ Monthly Jobs Chart ═══ */}
        {monthlyData.length > 0 && (
          <div className="bg-white border border-border rounded-[14px] p-5 mb-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Jobs by Month</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} barCategoryGap="20%">
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
                  itemStyle={{ padding: "2px 0" }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="reviewed" name="Reviewed" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} />
                <Bar dataKey="submitted" name="Submitted" stackId="a" fill="#CA8A04" />
                <Bar dataKey="in_progress" name="In Progress" stackId="a" fill="#2563EB" />
                <Bar dataKey="pending" name="Pending" stackId="a" fill="var(--color-text-disabled)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ═══ Two Column Layout ═══ */}
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">

          {/* ── Left Column ── */}
          <div className="space-y-5">

            {/* Group Performance Table */}
            {children.length > 0 && (
              <div>
                <SectionHeader title="Group Performance" icon={Users} action={() => navigate(`/projects/${id}/settings`)} actionLabel="Manage" />
                <div className="bg-white border border-border rounded-[14px] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-4 py-2.5 text-left bg-canvas border-b border-border">Group</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Sites</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Jobs</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Done</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Overdue</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Rework</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupStats.map((g) => (
                        <tr key={g.id} onClick={() => navigate(`/projects/${id}/sites?group_id=${g.id}`)} className="cursor-pointer hover:bg-surface-hover transition-colors">
                          <td className="px-4 py-3 border-b border-canvas">
                            <div className="flex items-center gap-2.5">
                              <CompletionRing completed={g.reviewed} total={g.jobCount} size={32} />
                              <div className="min-w-0">
                                <p className="text-base font-medium text-text-primary truncate">{g.name}</p>
                                <p className="text-xs text-text-muted">{g.manager_name || "No manager"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 border-b border-canvas text-center text-base text-text-primary">{g.siteCount}</td>
                          <td className="px-3 py-3 border-b border-canvas text-center text-base text-text-primary">{g.jobCount}</td>
                          <td className="px-3 py-3 border-b border-canvas text-center text-base font-medium text-[#16A34A]">{g.reviewed}</td>
                          <td className="px-3 py-3 border-b border-canvas text-center text-base font-medium">
                            {g.overdue > 0 ? <span className="text-[#DC2626]">{g.overdue}</span> : <span className="text-text-disabled">0</span>}
                          </td>
                          <td className="px-3 py-3 border-b border-canvas text-center text-base font-medium">
                            {g.rework > 0 ? <span className="text-[#CA8A04]">{g.rework}</span> : <span className="text-text-disabled">0</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Team Performance Table */}
            {teamStats.length > 0 && (
              <div>
                <SectionHeader title="Team Performance" icon={UserCheck} />
                <div className="bg-white border border-border rounded-[14px] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-4 py-2.5 text-left bg-canvas border-b border-border">Surveyor</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Assigned</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Done</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Pending</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Overdue</th>
                        <th className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] px-3 py-2.5 text-center bg-canvas border-b border-border">Rework</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamStats.map((t) => {
                        const pct = t.assigned > 0 ? Math.round((t.completed / t.assigned) * 100) : 0;
                        return (
                          <tr key={t.name} className="hover:bg-surface-hover transition-colors">
                            <td className="px-4 py-3 border-b border-canvas">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                                  <span className="text-2xs font-bold text-accent-text">{t.name[0].toUpperCase()}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-base font-medium text-text-primary truncate">{t.name}</p>
                                  <p className="text-xs text-text-muted">{pct}% complete</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 border-b border-canvas text-center text-base text-text-primary">{t.assigned}</td>
                            <td className="px-3 py-3 border-b border-canvas text-center text-base font-medium text-[#16A34A]">{t.completed}</td>
                            <td className="px-3 py-3 border-b border-canvas text-center text-base text-text-primary">{t.pending}</td>
                            <td className="px-3 py-3 border-b border-canvas text-center text-base font-medium">
                              {t.overdue > 0 ? <span className="text-[#DC2626]">{t.overdue}</span> : <span className="text-text-disabled">0</span>}
                            </td>
                            <td className="px-3 py-3 border-b border-canvas text-center text-base font-medium">
                              {t.rework > 0 ? <span className="text-[#CA8A04]">{t.rework}</span> : <span className="text-text-disabled">0</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-5">

            {/* Quick Actions */}
            {can.createJob(vizUser, myGroupRole) && (
              <div className="bg-white border border-border rounded-[14px] p-4">
                <h2 className="text-md font-semibold text-text-primary mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => navigate(`/projects/${id}/jobs/new`)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-canvas hover:bg-border/50 text-base font-medium text-text-primary transition-colors cursor-pointer">
                    <Briefcase size={13} className="text-text-muted" /> New Job
                  </button>
                  <button onClick={() => navigate(`/projects/${id}/sites`)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-canvas hover:bg-border/50 text-base font-medium text-text-primary transition-colors cursor-pointer">
                    <MapPin size={13} className="text-text-muted" /> View Sites
                  </button>
                  <button onClick={() => navigate(`/projects/${id}/workflows`)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-canvas hover:bg-border/50 text-base font-medium text-text-primary transition-colors cursor-pointer">
                    <FolderOpen size={13} className="text-text-muted" /> Workflows
                  </button>
                  <button onClick={() => navigate(`/projects/${id}/settings`)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-canvas hover:bg-border/50 text-base font-medium text-text-primary transition-colors cursor-pointer">
                    <Users size={13} className="text-text-muted" /> Members
                  </button>
                </div>
              </div>
            )}

            {/* Overdue Jobs */}
            <div className="bg-white border border-border rounded-[14px] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className={overdueJobs.length > 0 ? "text-[#DC2626]" : "text-text-muted"} />
                  <h2 className="text-md font-semibold text-text-primary">Overdue</h2>
                </div>
                {overdueJobs.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">{overdueJobs.length}</span>
                )}
              </div>
              {overdueJobs.length === 0 ? (
                <div className="py-5 text-center">
                  <CheckCircle2 size={18} className="text-[#16A34A] mx-auto mb-1.5" />
                  <p className="text-base text-text-muted">All jobs on schedule</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {overdueJobs.slice(0, 5).map((job) => {
                    const days = daysOverdue(job.due_date);
                    return (
                      <div key={job.id} onClick={() => navigate(`/projects/${id}/jobs/${job.id}`)} className="flex items-center gap-2.5 px-3 py-2 -mx-1 rounded-lg cursor-pointer hover:bg-canvas transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-text-primary truncate group-hover:text-accent transition-colors">{job.title}</p>
                          <p className="text-xs text-text-muted truncate">{job.assigned_to_name || "Unassigned"}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#DC2626] shrink-0">{days}d late</span>
                      </div>
                    );
                  })}
                  {overdueJobs.length > 5 && (
                    <button onClick={() => navigate(`/projects/${id}/jobs`)} className="w-full pt-2 text-sm font-medium text-accent hover:underline cursor-pointer">
                      +{overdueJobs.length - 5} more overdue
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Rework Insights */}
            {reworkedJobs.length > 0 && (
              <div className="bg-white border border-border rounded-[14px] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw size={14} className="text-[#CA8A04]" />
                    <h2 className="text-md font-semibold text-text-primary">Rework</h2>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEFCE8] text-[#CA8A04]">{reworkRate}% rate</span>
                </div>
                <div className="space-y-0.5">
                  {reworkedJobs.slice(0, 5).map((job) => (
                    <div key={job.id} onClick={() => navigate(`/projects/${id}/jobs/${job.id}`)} className="flex items-center gap-2.5 px-3 py-2 -mx-1 rounded-lg cursor-pointer hover:bg-canvas transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-text-primary truncate group-hover:text-accent transition-colors">{job.title}</p>
                        <p className="text-xs text-text-muted truncate">{job.assigned_to_name || "Unassigned"}</p>
                      </div>
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-[#CA8A04] shrink-0">
                        <RotateCcw size={9} /> {job.rework_count}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uncovered Sites */}
            <div className="bg-white border border-border rounded-[14px] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className={uncoveredSites.length > 0 ? "text-[#CA8A04]" : "text-text-muted"} />
                  <h2 className="text-md font-semibold text-text-primary">Uncovered Sites</h2>
                </div>
                {uncoveredSites.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEFCE8] text-[#CA8A04]">{uncoveredSites.length}</span>
                )}
              </div>
              {uncoveredSites.length === 0 ? (
                <div className="py-5 text-center">
                  <CheckCircle2 size={18} className="text-[#16A34A] mx-auto mb-1.5" />
                  <p className="text-base text-text-muted">All sites have jobs assigned</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {uncoveredSites.slice(0, 6).map((site) => (
                    <div key={site.id} className="flex items-center gap-2.5 px-3 py-2 -mx-1 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-text-primary truncate">{site.name}</p>
                        {site.code && <p className="text-xs font-mono text-text-muted">{site.code}</p>}
                      </div>
                      <span className="text-xs text-text-muted shrink-0">{site.technician_name || "No tech"}</span>
                    </div>
                  ))}
                  {uncoveredSites.length > 6 && (
                    <button onClick={() => navigate(`/projects/${id}/sites`)} className="w-full pt-2 text-sm font-medium text-accent hover:underline cursor-pointer">
                      +{uncoveredSites.length - 6} more uncovered
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Recent Jobs */}
            <div className="bg-white border border-border rounded-[14px] p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-md font-semibold text-text-primary">Recent Jobs</h2>
                <button onClick={() => navigate(`/projects/${id}/jobs`)} className="text-sm font-medium text-accent cursor-pointer hover:underline">View all</button>
              </div>
              {jobs.length === 0 ? (
                <p className="text-base text-text-muted text-center py-4">No jobs yet</p>
              ) : (
                <div className="space-y-0.5">
                  {[...jobs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 6).map((job) => {
                    const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                    return (
                      <div key={job.id} onClick={() => navigate(`/projects/${id}/jobs/${job.id}`)} className="flex items-center gap-2.5 px-3 py-2 -mx-1 rounded-lg cursor-pointer hover:bg-canvas transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-text-primary truncate group-hover:text-accent transition-colors">{job.title}</p>
                        </div>
                        {job.rework_count > 0 && (
                          <span className="flex items-center gap-0.5 text-2xs font-semibold text-[#CA8A04]"><RotateCcw size={8} />{job.rework_count}</span>
                        )}
                        <span className="text-xs font-medium px-1.5 py-[1px] rounded shrink-0" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProjectShell>
  );
}
