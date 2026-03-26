import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Settings, Eye, ChevronDown, ChevronRight,
  Camera, Type, Hash, ToggleLeft, Calendar, ScanBarcode, List, CheckSquare,
} from "lucide-react";
import { useWorkflow } from "@/lib/queries";
import { TYPE_CONFIG } from "@/lib/constants";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";

const FIELD_TYPE_LABELS = {
  image: { label: "Image", icon: Camera },
  text: { label: "Text", icon: Type },
  number: { label: "Number", icon: Hash },
  boolean: { label: "Yes/No", icon: ToggleLeft },
  date: { label: "Date", icon: Calendar },
  barcode: { label: "Barcode", icon: ScanBarcode },
  single_select: { label: "Single Select", icon: List },
  multi_select: { label: "Multi Select", icon: CheckSquare },
};

function TaskCard({ task, index }) {
  const [expanded, setExpanded] = useState(false);
  const fields = task.fields || [];

  return (
    <div className="bg-white border border-border rounded-[10px] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-[10px] px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="text-base">{task.icon || "📋"}</span>
        <span className="text-[13px] font-semibold text-text-primary flex-1 text-left">{task.name}</span>
        <span className="text-[11px] text-text-secondary">{fields.length} field{fields.length !== 1 ? "s" : ""}</span>
        {expanded ? <ChevronDown size={14} className="text-text-muted" /> : <ChevronRight size={14} className="text-text-muted" />}
      </button>
      {expanded && fields.length > 0 && (
        <div className="border-t border-border">
          {fields.map((field) => {
            const ft = FIELD_TYPE_LABELS[field.type] || { label: field.type, icon: Type };
            return (
              <div key={field.id} className="flex items-center gap-2 px-4 py-[6px] text-[12px] text-text-secondary">
                <ft.icon size={12} className="text-text-muted shrink-0" />
                <span className="flex-1">{field.label}</span>
                <span className="text-[10px] font-semibold font-mono px-[6px] py-[2px] rounded bg-canvas text-text-muted">{ft.label}</span>
                {field.required && <span className="text-[10px] font-semibold text-accent">Required</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WorkflowDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: workflow, isLoading, error: workflowError } = useWorkflow(id);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={16} className="animate-spin text-text-muted" />
        </div>
      </AppShell>
    );
  }

  if (workflowError || !workflow) {
    return (
      <AppShell>
        <div className="max-w-[600px] mx-auto text-center py-20">
          <p className="text-[14px] text-[#DC2626] mb-4">{workflowError?.message || "Workflow not found"}</p>
          <Button variant="secondary" onClick={() => navigate("/workflows")}>Back to Workflows</Button>
        </div>
      </AppShell>
    );
  }

  const config = TYPE_CONFIG[workflow.asset_type] || TYPE_CONFIG.image;
  const tasks = workflow.capture_config?.tasks || [];
  const layout = workflow.capture_config?.layout || "multi_page";
  const totalFields = tasks.reduce((sum, t) => sum + (t.fields?.length || 0), 0);

  return (
    <AppShell>
      <div className="max-w-[800px] mx-auto px-6 lg:px-9 py-6">
        {/* Back */}
        <button
          onClick={() => navigate("/workflows")}
          className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer mb-5"
        >
          <ArrowLeft size={14} /> Workflow Templates
        </button>

        {/* Header */}
        <div className="flex items-start gap-[14px] mb-6">
          <div className="w-[48px] h-[48px] rounded-[12px] flex items-center justify-center shrink-0" style={{ background: config.bg }}>
            <span className="text-[22px]">{config.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.4px]">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-[13px] text-text-secondary mt-1">{workflow.description}</p>
            )}
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(`/workflows/${id}/builder`)}>
            <Settings size={13} /> Edit Workflow
          </Button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.4px] mb-[3px]">Type</p>
            <p className="text-[14px] font-medium capitalize">{(workflow.asset_type || "").replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.4px] mb-[3px]">Tasks</p>
            <p className="text-[14px] font-medium">{tasks.length}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.4px] mb-[3px]">Fields</p>
            <p className="text-[14px] font-medium">{totalFields}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.4px] mb-[3px]">Layout</p>
            <p className="text-[14px] font-medium">{layout === "multi_page" ? "One task per page" : "Single page"}</p>
          </div>
        </div>

        {/* Jobs count */}
        {workflow.job_count != null && workflow.job_count > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <p className="text-[13px] text-text-secondary">{workflow.job_count} job{workflow.job_count !== 1 ? "s" : ""} using this workflow</p>
            <span className="text-text-muted">·</span>
            <button onClick={() => navigate(`/jobs?workflow_id=${id}`)} className="text-[13px] font-medium text-accent cursor-pointer hover:underline">
              View jobs
            </button>
          </div>
        )}

        {/* Tasks */}
        <div>
          <h2 className="text-[16px] font-semibold text-text-primary tracking-[-0.2px] mb-3.5">
            Workflow Tasks ({tasks.length})
          </h2>
          {tasks.length === 0 ? (
            <div className="bg-white border border-border rounded-[14px] p-12 text-center">
              <p className="text-[14px] text-text-muted mb-4">No tasks defined yet</p>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/workflows/${id}/builder`)}>
                Open Workflow Builder
              </Button>
            </div>
          ) : (
            <div className="space-y-[10px]">
              {tasks.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
