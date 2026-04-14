import { Loader2 } from "lucide-react";
import { Button } from "./button";

export function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-border shadow-[0_20px_48px_rgba(0,0,0,0.12)] w-full max-w-[520px] max-h-[80vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, confirmVariant = "default", loading }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-lg text-text-secondary mb-6">{description}</p>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
