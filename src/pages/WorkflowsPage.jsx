import { useNavigate } from "react-router-dom";
import { Plus, Loader2, FolderOpen } from "lucide-react";
import { useWorkflows } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { can } from "@/lib/permissions";
import { TYPE_CONFIG } from "@/lib/constants";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function WorkflowCard({ workflow, onClick }) {
  const config = TYPE_CONFIG[workflow.asset_type] || TYPE_CONFIG.image;
  const taskCount = workflow.task_count || 0;
  const jobCount = workflow.job_count || 0;

  return (
    <div onClick={onClick} className="group bg-white border border-border rounded-[14px] p-[18px] cursor-pointer transition-all duration-150 hover:border-accent hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-[11px] mb-2">
        <div className="w-[38px] h-[38px] rounded-[9px] flex items-center justify-center shrink-0" style={{ background: config.bg }}>
          <span className="text-[17px]">{config.emoji}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-text-primary">{workflow.name}</p>
          <p className="text-[11px] text-text-secondary mt-0.5">{(workflow.asset_type || "").replace("_", " ")} · {taskCount} task{taskCount !== 1 ? "s" : ""}</p>
        </div>
      </div>
      {workflow.description && (
        <p className="text-[12px] text-text-secondary leading-[1.5] mb-3 line-clamp-2">{workflow.description}</p>
      )}
      <div className="flex gap-[6px] flex-wrap pt-3 border-t border-canvas">
        <span className="text-[11px] font-medium px-[9px] py-[3px] rounded-md bg-canvas text-text-secondary">{jobCount} job{jobCount !== 1 ? "s" : ""}</span>
        <span className="text-[11px] font-medium px-[9px] py-[3px] rounded-md bg-canvas text-text-secondary">{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { vizUser } = useUser();
  const { data: workflows = [], isLoading } = useWorkflows();

  return (
    <AppShell>
      <div className="max-w-[1100px] mx-auto px-6 lg:px-9 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.5px]">Workflow Templates</h1>
            <p className="text-[13px] text-text-secondary mt-1">Checklist templates that define what field agents capture</p>
          </div>
          {can.createWorkflow(vizUser) && (
            <Button size="sm" className="gap-1.5" onClick={() => navigate("/workflows/new")}>
              <Plus size={13} /> New Workflow
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={16} className="animate-spin text-text-muted" />
          </div>
        ) : workflows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-accent-light mx-auto mb-5 flex items-center justify-center">
                <FolderOpen size={24} className="text-accent" />
              </div>
              <h2 className="text-[18px] font-bold text-text-primary mb-2">No workflows yet</h2>
              <p className="text-[14px] text-text-secondary mb-6 max-w-[360px] mx-auto">
                {can.createWorkflow(vizUser) ? "Create your first workflow template to define what your field agents should capture." : "No workflow templates have been created yet."}
              </p>
              {can.createWorkflow(vizUser) && (
                <Button onClick={() => navigate("/workflows/new")} className="gap-2">
                  <Plus size={14} /> Create First Workflow
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {workflows.map((w) => (
              <WorkflowCard key={w.id} workflow={w} onClick={() => navigate(`/workflows/${w.id}`)} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
