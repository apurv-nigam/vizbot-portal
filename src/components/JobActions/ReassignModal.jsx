import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useSearchMembers } from "@/lib/queries";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ReassignModal({ open, onClose, onSubmit, loading, currentAssignee }) {
  const [search, setSearch] = useState("");
  const { data: searchResults = [], isLoading: searching } = useSearchMembers(search);

  const filtered = searchResults.filter((m) => m.user_id !== currentAssignee);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-text-primary mb-1">Reassign Job</h3>
        <p className="text-md text-text-secondary mb-4">Search for a team member to reassign this job to.</p>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
        </div>

        <div className="max-h-[280px] overflow-y-auto border border-border rounded-lg">
          {search.length < 2 ? (
            <p className="py-6 text-center text-md text-text-muted">Type at least 2 characters to search</p>
          ) : searching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={14} className="animate-spin text-text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-md text-text-muted">No members found</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.user_id}
                onClick={() => onSubmit(m.user_id)}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors cursor-pointer border-b border-canvas last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-accent">{(m.name || m.email)[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-md font-medium text-text-primary truncate">{m.name || m.email}</p>
                  {m.name && <p className="text-base text-text-muted truncate">{m.email}</p>}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
