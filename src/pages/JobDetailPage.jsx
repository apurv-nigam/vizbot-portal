import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, MapPin, Calendar, Building2,
  Clock, Circle, CheckCircle2,
  Send, RotateCcw, UserCheck,
} from "lucide-react";
import { useJob, useReviewJob, useReworkJob, useReassignJob, useResendJob } from "@/lib/queries";
import AppShell from "@/components/AppShell";
import { useUser } from "@/auth/UserProvider";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import TaskSection from "@/components/JobActions/TaskSection";
import ReworkModal from "@/components/JobActions/ReworkModal";
import ReassignModal from "@/components/JobActions/ReassignModal";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "var(--color-text-muted)", bg: "var(--color-canvas)", icon: Circle },
  in_progress: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF", icon: Clock },
  submitted: { label: "Submitted", color: "#CA8A04", bg: "#FEFCE8", icon: CheckCircle2 },
  reviewed: { label: "Reviewed", color: "#16A34A", bg: "#ECFDF5", icon: CheckCircle2 },
};

export default function JobDetailPage() {
  const { vizUser } = useUser();
  const navigate = useNavigate();
  const { jobId } = useParams();

  const { data: job, isLoading: jobLoading, error: jobError } = useJob(jobId);

  const reviewMutation = useReviewJob(jobId);
  const reworkMutation = useReworkJob(jobId);
  const reassignMutation = useReassignJob(jobId);
  const resendMutation = useResendJob(jobId);

  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  function showSuccess(msg) {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  }

  const actionLoading = reviewMutation.isPending || reworkMutation.isPending || reassignMutation.isPending || resendMutation.isPending;

  function handleReview() {
    reviewMutation.mutate(undefined, {
      onSuccess: () => { setShowReviewConfirm(false); showSuccess("Job marked as reviewed"); },
    });
  }

  function handleRework(comments) {
    reworkMutation.mutate(comments, {
      onSuccess: () => { setShowReworkModal(false); showSuccess("Job sent back for rework"); },
    });
  }

  function handleReassign(userId) {
    reassignMutation.mutate(userId, {
      onSuccess: () => { setShowReassignModal(false); showSuccess("Job reassigned"); },
    });
  }

  function handleResend() {
    resendMutation.mutate(undefined, {
      onSuccess: () => { setShowResendConfirm(false); showSuccess("Reminder sent to agent"); },
    });
  }

  const loading = jobLoading;
  const error = jobError?.message;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={16} className="animate-spin text-text-muted" />
        </div>
      </AppShell>
    );
  }

  if (error || !job) {
    return (
      <AppShell>
        <div className="max-w-[600px] mx-auto text-center py-20">
          <p className="text-[14px] text-[#DC2626] mb-4">{error || "Job not found"}</p>
          <Button variant="secondary" onClick={() => navigate("/jobs")}>Back to Jobs</Button>
        </div>
      </AppShell>
    );
  }

  const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const tasks = job.capture_config?.tasks || [];
  const submissions = job.submissions || {};
  const reworkComments = job.rework_comments || {};

  const totalFields = tasks.reduce((sum, t) => sum + (t.fields?.length || 0), 0);
  const totalCompleted = tasks.reduce((sum, t) => {
    const td = submissions[t.id] || {};
    return sum + (t.fields || []).filter(f => {
      const v = td[f.id];
      return v !== undefined && v !== null && v !== "";
    }).length;
  }, 0);

  const isPending = job.status === "pending";
  const isSubmitted = job.status === "submitted";

  return (
    <AppShell>
      <div className="max-w-[760px] mx-auto">
        <button
          onClick={() => navigate("/jobs")}
          className="flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-text-secondary transition-colors duration-200 cursor-pointer mb-6"
        >
          <ArrowLeft size={14} />
          Jobs
        </button>

        {actionSuccess && (
          <div className="mb-4 flex items-center gap-2 bg-[#ECFDF5] border border-[#16A34A]/20 text-[#16A34A] rounded-lg px-4 py-2.5 text-[13px] font-medium animate-[fadeIn_0.15s_ease-out]">
            <CheckCircle2 size={14} />
            {actionSuccess}
          </div>
        )}

        {/* Job header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-[24px] font-bold text-text-primary tracking-[-0.3px] leading-tight">{job.title}</h1>
              {job.rework_count > 0 && (
                <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#CA8A04] bg-[#FEFCE8] px-2 py-0.5 rounded-full">
                  <RotateCcw size={10} /> Returned {job.rework_count}x
                </span>
              )}
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold shrink-0 ml-4"
              style={{ color: status.color, background: status.bg }}
            >
              <StatusIcon size={12} /> {status.label}
            </span>
          </div>

          {/* Metadata pills */}
          <div className="flex flex-wrap items-center gap-2.5 mb-5">
            {job.site_name && (
              <div className="inline-flex items-center gap-1.5 bg-white border border-border rounded-lg px-3 py-2">
                <Building2 size={13} className="text-text-muted shrink-0" />
                <span className="text-[13px] font-medium text-text-primary">{job.site_name}</span>
              </div>
            )}
            <div className="inline-flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
              <div className="w-5 h-5 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-accent">
                  {(job.assigned_to_name || job.assigned_to_email || "?")[0].toUpperCase()}
                </span>
              </div>
              <span className="text-[13px] font-medium text-text-primary">
                {job.assigned_to_name || job.assigned_to_email || "Unassigned"}
              </span>
            </div>
            {job.due_date && (
              <div className="inline-flex items-center gap-1.5 bg-white border border-border rounded-lg px-3 py-2">
                <Calendar size={13} className="text-text-muted" />
                <span className="text-[13px] font-medium text-text-primary">
                  {new Date(job.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            )}
            {job.location && (
              <div className="inline-flex items-center gap-1.5 bg-white border border-border rounded-lg px-3 py-2">
                <MapPin size={13} className="text-text-muted shrink-0" />
                <span className="text-[13px] font-medium text-text-primary">{job.location}</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {totalFields > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-text-secondary">Completion</span>
                <span className="text-[12px] font-semibold text-text-primary">{totalCompleted}/{totalFields} fields</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${totalFields > 0 ? (totalCompleted / totalFields) * 100 : 0}%`,
                    background: totalCompleted === totalFields ? "#16A34A" : "var(--color-accent)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Instructions */}
          {job.instructions && (
            <div className="bg-accent-light/50 border border-accent/10 rounded-lg px-4 py-3 mb-5">
              <p className="text-[12px] font-semibold text-accent mb-1">Instructions</p>
              <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap">{job.instructions}</p>
            </div>
          )}

          {/* Action buttons — admin/owner only */}
          {can.manageJobs(vizUser) && (isPending || isSubmitted) && (
            <div className="flex flex-wrap gap-2.5">
              {isSubmitted && (
                <>
                  <Button size="sm" onClick={() => setShowReviewConfirm(true)} className="gap-1.5">
                    <CheckCircle2 size={13} /> Mark as Reviewed
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowReworkModal(true)} className="gap-1.5">
                    <RotateCcw size={13} /> Send Back for Rework
                  </Button>
                </>
              )}
              {isPending && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setShowReassignModal(true)} className="gap-1.5">
                    <UserCheck size={13} /> Reassign
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowResendConfirm(true)} className="gap-1.5">
                    <Send size={13} /> Resend Reminder
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Task sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-text-primary">Submitted Data</h2>
              <p className="text-[12px] text-text-muted mt-0.5">Responses captured for each task in the workflow</p>
            </div>
            <span className="text-[12px] font-medium text-text-muted">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
          </div>
          {tasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-8 text-center">
              <p className="text-[14px] text-text-muted">No tasks configured in the workflow template.</p>
            </div>
          ) : (
            tasks.map((task, i) => (
              <TaskSection
                key={task.id}
                task={task}
                taskData={submissions[task.id]}
                index={i}
                total={tasks.length}
                reworkComment={reworkComments[task.id]}
              />
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <ConfirmDialog
        open={showReviewConfirm}
        onClose={() => setShowReviewConfirm(false)}
        onConfirm={handleReview}
        title="Mark as Reviewed"
        description="This will mark the job as reviewed. The field agent will be notified that their submission has been approved."
        confirmLabel="Confirm Review"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={showResendConfirm}
        onClose={() => setShowResendConfirm(false)}
        onConfirm={handleResend}
        title="Resend Reminder"
        description="This will send a push notification to the assigned field agent reminding them about this pending job."
        confirmLabel="Send Reminder"
        loading={actionLoading}
      />

      <ReworkModal
        open={showReworkModal}
        onClose={() => setShowReworkModal(false)}
        tasks={tasks}
        onSubmit={handleRework}
        loading={actionLoading}
      />

      <ReassignModal
        open={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        onSubmit={handleReassign}
        loading={actionLoading}
        currentAssignee={job.assigned_to}
      />
    </AppShell>
  );
}
