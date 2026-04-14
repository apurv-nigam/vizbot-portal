import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, FolderKanban, MapPin, Briefcase, Users, Settings, LogOut } from "lucide-react";
import { useGroups, useSites, useJobs, useCreateGroup, useOrg } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { useAuth0 } from "@auth0/auth0-react";
import { can } from "@/lib/permissions";
import { getDescendantIds } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

function ProjectCard({ project, allGroups, allSites, onClick }) {
  const descIds = getDescendantIds(allGroups, project.id);
  const siteCount = allSites.filter((s) => descIds.includes(s.group_id)).length;
  const childCount = allGroups.filter((g) => g.parent_id === project.id).length;
  const { data: jobsData } = useJobs({ group_id: project.id, limit: 1 });
  const { data: submittedData } = useJobs({ group_id: project.id, status: "submitted", limit: 1 });
  const jobCount = jobsData?.total || 0;
  const pendingJobs = submittedData?.total || 0;

  return (
    <div onClick={onClick} className="group bg-white border border-border rounded-[14px] p-6 cursor-pointer transition-all duration-200 hover:border-accent hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-11 h-11 rounded-[10px] bg-accent-light flex items-center justify-center shrink-0">
          <FolderKanban size={20} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-text-primary tracking-[-0.3px]">{project.name}</h3>
          {project.manager_name && (
            <p className="text-base text-text-muted mt-0.5">{project.manager_name} · Manager</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-canvas">
        <div>
          <p className="text-3xl font-semibold tracking-[-0.5px] text-text-primary">{siteCount}</p>
          <p className="text-sm text-text-muted">Sites</p>
        </div>
        <div>
          <p className="text-3xl font-semibold tracking-[-0.5px] text-text-primary">{jobCount}</p>
          <p className="text-sm text-text-muted">Jobs</p>
        </div>
        <div>
          <p className="text-3xl font-semibold tracking-[-0.5px] text-text-primary">{childCount}</p>
          <p className="text-sm text-text-muted">Groups</p>
        </div>
      </div>
      {pendingJobs > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[#633806] bg-[#FAEEDA] rounded-md px-2.5 py-1.5">
          <Briefcase size={11} /> {pendingJobs} awaiting review
        </div>
      )}
    </div>
  );
}

function CreateProjectModal({ open, onClose }) {
  const [name, setName] = useState("");
  const createGroup = useCreateGroup();
  const navigate = useNavigate();

  function handleCreate() {
    if (!name.trim()) return;
    createGroup.mutate(
      { name: name.trim(), parent_id: null, is_project: true, category: "Project" },
      {
        onSuccess: (data) => {
          onClose();
          setName("");
          if (data?.id) navigate(`/projects/${data.id}`);
        },
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-2xl font-semibold text-text-primary mb-1">Create Project</h3>
        <p className="text-md text-text-secondary mb-5">A project organizes sites, groups, and jobs for a specific client or contract.</p>
        <div className="mb-5">
          <label className="block text-base font-semibold text-text-secondary mb-1.5">Project name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Adani Towers" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={createGroup.isPending}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={createGroup.isPending || !name.trim()}>
            {createGroup.isPending ? <Loader2 size={14} className="animate-spin" /> : "Create Project"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ProjectPickerPage() {
  const navigate = useNavigate();
  const { vizUser } = useUser();
  const { user, logout } = useAuth0();
  const { data: projects = [], isLoading: groupsLoading } = useGroups({ is_project: true });
  const { data: allGroups = [] } = useGroups();
  const { data: allSites = [] } = useSites();
  const [showCreate, setShowCreate] = useState(false);
  const loading = groupsLoading;

  const initial = vizUser?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";
  const displayName = vizUser?.name || user?.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top bar */}
      <header className="bg-white border-b border-border">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-semibold text-md">V</span>
            </div>
            <span className="text-xl font-semibold text-text-primary tracking-[-0.3px]">Vizbot</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/profile")} className="text-md text-text-secondary hover:text-text-primary transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-canvas">
              Settings
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/profile")}>
              <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center">
                <span className="text-xs font-bold text-accent-text">{initial}</span>
              </div>
              <span className="text-md font-medium text-text-primary hidden sm:block">{displayName}</span>
            </div>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} className="text-md text-text-secondary hover:text-[#DC2626] transition-colors cursor-pointer px-2 py-1.5 rounded-lg hover:bg-[#FEF2F2]">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-semibold text-text-primary tracking-[-0.5px]">Projects</h1>
            <p className="text-lg text-text-secondary mt-1">Select a project to get started, or create a new one.</p>
          </div>
          {can.createGroup(vizUser) && (
            <Button className="gap-2" onClick={() => setShowCreate(true)}>
              <Plus size={15} /> New Project
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-border rounded-[14px] p-16 text-center max-w-[500px] mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-accent-light mx-auto mb-5 flex items-center justify-center">
              <FolderKanban size={28} className="text-accent" />
            </div>
            <h2 className="text-3xl font-semibold text-text-primary mb-2">No projects yet</h2>
            <p className="text-lg text-text-secondary mb-6 max-w-[340px] mx-auto">
              Create your first project to start organizing sites and assigning field work.
            </p>
            {can.createGroup(vizUser) && (
              <Button className="gap-2" onClick={() => setShowCreate(true)}>
                <Plus size={15} /> Create First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                allGroups={allGroups}
                allSites={allSites}
                onClick={() => navigate(`/projects/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
