import { useState } from "react";
import {
  FileText, Image, Hash, List, CheckSquare, ToggleLeft, Calendar,
  ScanBarcode, ChevronDown, ChevronRight, CheckCircle2, AlertCircle,
  MessageSquare, X, Circle,
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

function FieldValue({ field, val, onPreview }) {
  const hasValue = val !== undefined && val !== null && val !== "";

  if (field.type === "image" && hasValue) {
    const images = Array.isArray(val) ? val : [val];
    return (
      <div className="flex gap-1.5 flex-wrap">
        {images.map((url, i) => (
          <div key={i} className="w-10 h-10 rounded-md bg-canvas border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
            <img src={url} alt="" className="w-full h-full object-cover" onClick={(e) => { e.stopPropagation(); onPreview(url); }} />
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "boolean" && hasValue) {
    return <span className={`text-md font-medium ${val ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{val ? "Yes" : "No"}</span>;
  }

  if (!hasValue) {
    return (
      <span className="text-base text-text-disabled italic">
        {field.required ? <span className="text-[#DC2626] not-italic font-medium">Missing</span> : "—"}
      </span>
    );
  }

  return <span className="text-md text-text-primary">{String(val)}</span>;
}

export default function TaskSection({ task, taskData, index, total, reworkComment }) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(null);
  const fields = task.fields || [];
  const completedFields = fields.filter((f) => {
    const val = taskData?.[f.id];
    return val !== undefined && val !== null && val !== "";
  }).length;
  const allDone = fields.length > 0 && completedFields === fields.length;

  return (
    <>
      <ImageLightbox src={preview} onClose={() => setPreview(null)} />

      {/* Task header row */}
      {(() => {
        const imageFields = fields.filter((f) => f.type === "image");
        const imageCount = imageFields.reduce((sum, f) => {
          const val = taskData?.[f.id];
          if (!val) return sum;
          return sum + (Array.isArray(val) ? val.length : 1);
        }, 0);
        const missingRequired = fields.filter((f) => {
          if (!f.required) return false;
          const val = taskData?.[f.id];
          return val === undefined || val === null || val === "";
        }).length;

        return (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer text-left border-b border-canvas"
          >
            <span className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}>
              <ChevronRight size={12} className="text-text-muted" />
            </span>
            <span className="text-md">{task.icon || "📋"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-md font-medium text-text-primary truncate">{task.name}</p>
              {fields.length > 0 && (
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="text-xs text-text-muted">{completedFields}/{fields.length} fields</span>
                  {imageCount > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-text-muted">
                      <Image size={9} /> {imageCount} photo{imageCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {missingRequired > 0 && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-[#DC2626]">
                      <AlertCircle size={9} /> {missingRequired} missing
                    </span>
                  )}
                  {reworkComment && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-[#CA8A04]">
                      <MessageSquare size={9} /> Rework
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className={`text-sm font-semibold px-1.5 py-[1px] rounded-full shrink-0 ${
              allDone ? "bg-[#ECFDF5] text-[#16A34A]" : completedFields > 0 ? "bg-accent-light text-accent" : "bg-canvas text-text-muted"
            }`}>
              {allDone ? <CheckCircle2 size={10} className="inline -mt-px" /> : null} {completedFields}/{fields.length}
            </span>
          </button>
        );
      })()}

      {/* Expanded: fields as compact rows */}
      {expanded && (
        <div className="bg-canvas/50">
          {reworkComment && (
            <div className="mx-4 my-2 flex items-start gap-2 bg-[#FEFCE8] border border-[#CA8A04]/20 rounded-lg px-3 py-2">
              <MessageSquare size={11} className="text-[#CA8A04] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#CA8A04] mb-0.5">Rework feedback</p>
                <p className="text-base text-text-primary">{reworkComment}</p>
              </div>
            </div>
          )}

          {fields.length === 0 ? (
            <div className="px-4 py-4 text-center text-base text-text-disabled">No fields configured</div>
          ) : (
            <div className="px-4 py-1">
              {fields.map((field) => {
                const val = taskData?.[field.id];
                const hasValue = val !== undefined && val !== null && val !== "";
                return (
                  <div key={field.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="w-[40%] min-w-0 shrink-0 flex items-center gap-2 pt-0.5">
                      {hasValue ? (
                        <CheckCircle2 size={11} className="text-[#16A34A] shrink-0" />
                      ) : (
                        <Circle size={11} className="text-text-disabled shrink-0" />
                      )}
                      <span className="text-base font-medium text-text-secondary truncate">{field.label}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <FieldValue field={field} val={val} onPreview={setPreview} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
