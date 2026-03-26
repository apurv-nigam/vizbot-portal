import { useState } from "react";
import { Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export default function ReworkModal({ open, onClose, tasks, onSubmit, loading }) {
  const [selected, setSelected] = useState({});
  const [comments, setComments] = useState({});

  function toggle(taskId) {
    setSelected((s) => {
      const next = { ...s };
      if (next[taskId]) { delete next[taskId]; } else { next[taskId] = true; }
      return next;
    });
  }

  function handleSubmit() {
    const payload = {};
    for (const taskId of Object.keys(selected)) {
      if (comments[taskId]?.trim()) {
        payload[taskId] = comments[taskId].trim();
      }
    }
    if (Object.keys(payload).length === 0) return;
    onSubmit(payload);
  }

  const hasSelection = Object.keys(selected).some((id) => comments[id]?.trim());

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-[16px] font-semibold text-text-primary mb-1">Send Back for Rework</h3>
        <p className="text-[13px] text-text-secondary mb-5">Select the tasks that need revision and add feedback for the field agent.</p>

        <div className="space-y-2.5 mb-6 max-h-[400px] overflow-y-auto">
          {tasks.map((task, i) => (
            <div key={task.id} className={`rounded-lg border transition-colors duration-150 ${
              selected[task.id] ? "border-[#CA8A04]/30 bg-[#FEFCE8]/50" : "border-border bg-white"
            }`}>
              <button
                onClick={() => toggle(task.id)}
                className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <div className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                  selected[task.id] ? "bg-[#CA8A04] border-[#CA8A04]" : "border-border-hover bg-white"
                }`}>
                  {selected[task.id] && <CheckCircle2 size={10} className="text-white" />}
                </div>
                <div className="w-6 h-6 rounded bg-canvas flex items-center justify-center shrink-0">
                  <span className="text-xs">{task.icon || "📋"}</span>
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-text-muted">Task {i + 1}</p>
                  <p className="text-[13px] font-medium text-text-primary">{task.name}</p>
                </div>
              </button>
              {selected[task.id] && (
                <div className="px-4 pb-3">
                  <textarea
                    value={comments[task.id] || ""}
                    onChange={(e) => setComments({ ...comments, [task.id]: e.target.value })}
                    placeholder="What needs to be fixed..."
                    rows={2}
                    className="w-full rounded-lg border-[1.5px] border-border bg-white px-3 py-2 text-[13px] text-text-primary placeholder:text-text-disabled focus:border-[#CA8A04] focus:outline-none focus:shadow-[0_0_0_3px_rgba(202,138,4,0.1)] resize-none transition-all duration-200"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !hasSelection}
            className="bg-[#CA8A04] hover:bg-[#A16207] shadow-[0_1px_2px_rgba(202,138,4,0.3)]"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><RotateCcw size={13} /> Send Back</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
