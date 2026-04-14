import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Plus, X, GripVertical, ChevronDown, ChevronUp,
  Camera, List, CheckSquare, Type, Hash, ToggleLeft, Calendar, ScanBarcode,
  MapPin, Clock, Smartphone, User, Save,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiRequest } from "@/lib/api";
import AppShell from "@/components/ProjectShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FIELD_TYPES = [
  { value: "image", label: "Photo", desc: "Camera/gallery", icon: Camera },
  { value: "single_select", label: "Single Select", desc: "Pick one option", icon: List },
  { value: "multi_select", label: "Multi Select", desc: "Pick multiple", icon: CheckSquare },
  { value: "text", label: "Text", desc: "Free text input", icon: Type },
  { value: "number", label: "Number", desc: "Numeric input", icon: Hash },
  { value: "boolean", label: "Yes / No", desc: "Toggle true/false", icon: ToggleLeft },
  { value: "date", label: "Date", desc: "Date picker", icon: Calendar },
  { value: "barcode", label: "Barcode", desc: "Scan barcode/QR", icon: ScanBarcode },
];

const AUTO_FIELDS = [
  { icon: MapPin, label: "GPS Location" },
  { icon: Clock, label: "Timestamp" },
  { icon: Smartphone, label: "Device Info" },
  { icon: User, label: "Captured By" },
];

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function newTask() {
  return { id: `task_${uid()}`, name: "", icon: "📋", description: "", fields: [] };
}

function newField(type) {
  const base = { id: `field_${uid()}`, label: "", type, required: true };
  if (type === "single_select" || type === "multi_select") base.options = [""];
  return base;
}

// ── Sortable Field Editor ──
function SortableFieldEditor({ field, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: "relative", zIndex: isDragging ? 10 : "auto" };

  const [expanded, setExpanded] = useState(!field.label);
  const typeMeta = FIELD_TYPES.find((t) => t.value === field.type) || FIELD_TYPES[0];
  const Icon = typeMeta.icon;
  const hasOptions = field.type === "single_select" || field.type === "multi_select";

  function updateField(patch) { onChange({ ...field, ...patch }); }

  if (!expanded) {
    return (
      <div ref={setNodeRef} style={style}
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-white cursor-pointer hover:border-border-hover transition-colors duration-200"
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <GripVertical size={13} className="text-text-disabled shrink-0" />
        </div>
        <Icon size={14} className="text-text-muted shrink-0" />
        <span className="text-[13px] font-medium text-text-primary flex-1 truncate">{field.label || "Untitled field"}</span>
        <span className="text-[11px] text-text-muted shrink-0">{typeMeta.label}</span>
        <span className={`text-[11px] font-semibold shrink-0 ${field.required ? "text-accent" : "text-text-muted"}`}>
          {field.required ? "Required" : "Optional"}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-0.5 rounded text-text-disabled hover:text-[#DC2626] transition-colors cursor-pointer">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-accent/20 bg-surface-hover p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
            <GripVertical size={13} className="text-text-disabled" />
          </div>
          <Icon size={14} className="text-accent" />
          <span className="text-[12px] font-semibold text-accent">{typeMeta.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setExpanded(false)} className="p-0.5 rounded text-text-muted hover:text-text-secondary transition-colors cursor-pointer"><ChevronUp size={14} /></button>
          <button onClick={onRemove} className="p-0.5 rounded text-text-disabled hover:text-[#DC2626] transition-colors cursor-pointer"><X size={13} /></button>
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-semibold text-text-secondary mb-1">Label</label>
        <Input value={field.label} onChange={(e) => updateField({ label: e.target.value })} placeholder="e.g. Front of house" className="!h-[36px] !text-[13px]" />
      </div>
      <button
        onClick={() => updateField({ required: !field.required })}
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
          field.required ? "bg-accent-light text-accent border border-accent/20" : "bg-canvas text-text-muted border border-border"
        }`}
      >
        {field.required ? "Required" : "Optional"}
      </button>
      {hasOptions && (
        <div>
          <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Options</label>
          <div className="space-y-1.5">
            {(field.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-muted w-4 text-right shrink-0">{i + 1}.</span>
                <Input value={opt} onChange={(e) => { const opts = [...field.options]; opts[i] = e.target.value; updateField({ options: opts }); }} placeholder={`Option ${i + 1}`} className="!h-[32px] !text-[13px] flex-1" />
                <button onClick={() => updateField({ options: field.options.filter((_, j) => j !== i) })} className="p-0.5 rounded text-text-disabled hover:text-[#DC2626] transition-colors cursor-pointer"><X size={12} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => updateField({ options: [...(field.options || []), ""] })} className="flex items-center gap-1 mt-2 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer">
            <Plus size={12} /> Add Option
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sortable Task Card ──
function SortableTaskEditor({ task, onChange, onRemove, onReorderFields }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: "relative", zIndex: isDragging ? 10 : "auto" };

  const [expanded, setExpanded] = useState(true);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateTask(patch) { onChange({ ...task, ...patch }); }
  function updateField(idx, field) { const fields = [...task.fields]; fields[idx] = field; updateTask({ fields }); }
  function removeField(idx) { updateTask({ fields: task.fields.filter((_, i) => i !== idx) }); }
  function addField(type) { updateTask({ fields: [...task.fields, newField(type)] }); setFieldPickerOpen(false); }

  function handleFieldDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = task.fields.findIndex((f) => f.id === active.id);
      const newIndex = task.fields.findIndex((f) => f.id === over.id);
      updateTask({ fields: arrayMove(task.fields, oldIndex, newIndex) });
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none" onClick={(e) => e.stopPropagation()}>
            <GripVertical size={14} className="text-text-disabled shrink-0" />
          </div>
          <span className="text-lg shrink-0">{task.icon}</span>
          <span className="text-[14px] font-semibold text-text-primary flex-1 truncate">{task.name || "Untitled task"}</span>
          <span className="text-[12px] text-text-muted shrink-0">{task.fields.length} field{task.fields.length !== 1 ? "s" : ""}</span>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-0.5 rounded text-text-disabled hover:text-[#DC2626] transition-colors cursor-pointer"><X size={14} /></button>
          {expanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </div>

        {expanded && (
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            <div className="h-px bg-border" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1">Task Name *</label>
                <Input value={task.name} onChange={(e) => updateTask({ name: e.target.value })} placeholder="e.g. Property Exterior" className="!h-[36px] !text-[13px]" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1">Icon</label>
                <Input value={task.icon} onChange={(e) => updateTask({ icon: e.target.value })} className="!h-[36px] !text-[13px] !w-20" maxLength={2} />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1">Description</label>
              <Input value={task.description} onChange={(e) => updateTask({ description: e.target.value })} placeholder="Instructions for this task" className="!h-[36px] !text-[13px]" />
            </div>

            {/* Fields */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-semibold text-text-secondary">Fields</label>
                <div className="relative">
                  <button onClick={() => setFieldPickerOpen(!fieldPickerOpen)} className="flex items-center gap-1 text-[12px] font-semibold text-accent hover:text-accent-hover transition-colors cursor-pointer">
                    <Plus size={12} /> Add Field
                  </button>
                  {fieldPickerOpen && (
                    <>
                      <div onClick={() => setFieldPickerOpen(false)} className="fixed inset-0 z-10" />
                      <div className="absolute right-0 top-full mt-1 w-[220px] bg-white rounded-lg border border-border shadow-[0_10px_32px_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.03)] p-1 z-20">
                        {FIELD_TYPES.map((ft) => {
                          const FIcon = ft.icon;
                          return (
                            <button key={ft.value} onClick={() => addField(ft.value)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left hover:bg-surface-hover transition-colors cursor-pointer">
                              <FIcon size={14} className="text-text-muted shrink-0" />
                              <div>
                                <p className="text-[13px] font-medium text-text-primary">{ft.label}</p>
                                <p className="text-[11px] text-text-muted">{ft.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {task.fields.length === 0 ? (
                <p className="text-[12px] text-text-muted text-center py-4">No fields yet. Click "+ Add Field" to start.</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                  <SortableContext items={task.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {task.fields.map((field, i) => (
                        <SortableFieldEditor key={field.id} field={field} onChange={(f) => updateField(i, f)} onRemove={() => removeField(i)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ── Main Page ──
export default function WorkflowBuilderPage() {
  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const { id: projectId, wid } = useParams();
  const id = wid || projectId;
  const basePath = wid ? `/projects/${projectId}` : "";

  const [workflowName, setWorkflowName] = useState("");
  const [layout, setLayout] = useState("multi_page");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getAccessTokenSilently();
        const wf = await apiRequest(`/api/v1/workflows/${id}`, { token });
        if (cancelled) return;
        setWorkflowName(wf.name);
        if (wf.capture_config) {
          setLayout(wf.capture_config.layout || "multi_page");
          setTasks(wf.capture_config.tasks || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  function updateTask(idx, task) { const t = [...tasks]; t[idx] = task; setTasks(t); }
  function removeTask(idx) { setTasks(tasks.filter((_, i) => i !== idx)); }

  function handleTaskDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      setTasks(arrayMove(tasks, oldIndex, newIndex));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      await apiRequest(`/api/v1/workflows/${id}`, {
        token,
        method: "PATCH",
        body: { capture_config: { layout, tasks } },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={16} className="animate-spin text-text-muted" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[800px] mx-auto px-6 lg:px-9 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate(`${basePath}/workflows/${id}`)} className="flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-text-secondary transition-colors cursor-pointer mb-2">
              <ArrowLeft size={14} /> {workflowName}
            </button>
            <h1 className="text-[24px] font-bold text-text-primary tracking-[-0.3px]">Capture Workflow</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <><Save size={14} /> Saved</> : <><Save size={14} /> Save Workflow</>}
          </Button>
        </div>

        {error && <p className="text-[12px] text-[#DC2626] mb-4">{error}</p>}

        <div className="space-y-5">
          {/* Layout toggle */}
          <Card>
            <CardContent className="p-4">
              <label className="block text-[13px] font-semibold text-text-primary mb-2.5">Layout Mode</label>
              <div className="flex gap-2">
                {[
                  { value: "multi_page", label: "One task per page" },
                  { value: "single_page", label: "All tasks on one page" },
                ].map((opt) => (
                  <button key={opt.value} onClick={() => setLayout(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all ${
                      layout === opt.value ? "bg-accent-light text-accent border border-accent/20" : "bg-canvas text-text-muted border border-transparent hover:text-text-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Auto-captured */}
          <Card>
            <CardContent className="p-4">
              <label className="block text-[13px] font-semibold text-text-primary mb-2.5">Auto-captured with every submission</label>
              <div className="flex flex-wrap gap-2">
                {AUTO_FIELDS.map((af) => {
                  const AIcon = af.icon;
                  return (
                    <span key={af.label} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#ECFDF5] text-[#16A34A] text-[11px] font-semibold">
                      <AIcon size={12} /> {af.label} ✓
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[13px] font-semibold text-text-primary">Tasks</label>
              <Button variant="secondary" size="sm" onClick={() => setTasks([...tasks, newTask()])} className="gap-1.5">
                <Plus size={13} /> Add Task
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-[14px] text-text-muted mb-3">No tasks yet</p>
                  <Button variant="secondary" size="sm" onClick={() => setTasks([newTask()])} className="gap-1.5">
                    <Plus size={13} /> Add your first task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {tasks.map((task, i) => (
                      <SortableTaskEditor key={task.id} task={task} onChange={(t) => updateTask(i, t)} onRemove={() => removeTask(i)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
