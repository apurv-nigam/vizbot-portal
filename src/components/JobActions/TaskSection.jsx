import { useState } from "react";
import {
  FileText, Image, Hash, List, CheckSquare, ToggleLeft, Calendar,
  ScanBarcode, ChevronDown, ChevronRight, CheckCircle2, AlertCircle,
  MessageSquare, X,
} from "lucide-react";

const FIELD_ICONS = {
  image: Image,
  text: FileText,
  number: Hash,
  single_select: List,
  multi_select: CheckSquare,
  boolean: ToggleLeft,
  date: Calendar,
  barcode: ScanBarcode,
};

function ImageLightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors z-10">
        <X size={20} className="text-white" />
      </button>
      <img src={src} alt="" className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

export default function TaskSection({ task, taskData, index, total, reworkComment }) {
  const [expanded, setExpanded] = useState(true);
  const [preview, setPreview] = useState(null);
  const fields = task.fields || [];
  const completedFields = fields.filter((f) => {
    const val = taskData?.[f.id];
    return val !== undefined && val !== null && val !== "";
  }).length;
  const allDone = fields.length > 0 && completedFields === fields.length;
  const hasFields = fields.length > 0;

  return (
    <div className="bg-white rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <ImageLightbox src={preview} onClose={() => setPreview(null)} />
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-canvas flex items-center justify-center shrink-0">
            <span className="text-sm">{task.icon || "📋"}</span>
          </div>
          <div className="text-left">
            <p className="text-[11px] font-medium text-text-muted">Task {index + 1} of {total}</p>
            <h3 className="text-[14px] font-semibold text-text-primary">{task.name}</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasFields && (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              allDone ? "bg-[#ECFDF5] text-[#16A34A]"
                : completedFields > 0 ? "bg-accent-light text-accent"
                : "bg-canvas text-text-muted"
            }`}>
              {allDone ? <CheckCircle2 size={10} /> : null}
              {completedFields}/{fields.length}
            </span>
          )}
          {expanded ? <ChevronDown size={14} className="text-text-disabled" /> : <ChevronRight size={14} className="text-text-disabled" />}
        </div>
      </button>

      {reworkComment && (
        <div className="mx-5 mb-3 flex items-start gap-2.5 bg-[#FEFCE8] border border-[#CA8A04]/20 rounded-lg px-3.5 py-2.5">
          <MessageSquare size={13} className="text-[#CA8A04] shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-[#CA8A04] mb-0.5">Reviewer feedback</p>
            <p className="text-[13px] text-text-primary">{reworkComment}</p>
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-border">
          {fields.length === 0 ? (
            <div className="px-5 py-6 flex items-center justify-center gap-2 text-[13px] text-text-disabled">
              <AlertCircle size={14} />
              No fields configured for this task
            </div>
          ) : (
            <div className="divide-y divide-canvas">
              {fields.map((field) => {
                const val = taskData?.[field.id];
                const FieldIcon = FIELD_ICONS[field.type] || FileText;
                const hasValue = val !== undefined && val !== null && val !== "";
                return (
                  <div key={field.id} className="px-5 py-3.5 flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${hasValue ? "bg-[#ECFDF5]" : "bg-canvas"}`}>
                      <FieldIcon size={12} className={hasValue ? "text-[#16A34A]" : "text-text-disabled"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[12px] font-medium text-text-muted">{field.label}</p>
                        {field.required && !hasValue && (
                          <span className="text-[10px] font-semibold text-[#DC2626] bg-[#FEF2F2] px-1.5 py-0.5 rounded">Missing</span>
                        )}
                      </div>
                      {field.type === "image" && hasValue ? (
                        <div className="flex gap-2 flex-wrap mt-1">
                          {(Array.isArray(val) ? val : [val]).map((url, i) => (
                            <div key={i} className="w-24 h-24 rounded-lg bg-canvas border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200">
                              <img src={url} alt="" className="w-full h-full object-cover" onClick={() => setPreview(url)} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-[14px] ${hasValue ? "text-text-primary" : "text-text-disabled italic"}`}>
                          {hasValue ? (typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)) : "Not submitted"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
