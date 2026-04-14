import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, MapPin, Briefcase, FolderOpen, Settings, FolderKanban, Menu, X, LogOut } from "lucide-react";
import { useGroup, useGroups, useSites } from "@/lib/queries";
import { useUser } from "@/auth/UserProvider";
import { useAuth0 } from "@auth0/auth0-react";
import { getDescendantIds } from "@/lib/constants";
import { useState } from "react";
import SidebarTree from "./SidebarTree";

function NavItem({ icon: Icon, label, badge, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-lg text-lg h-[36px] mb-[1px] cursor-pointer transition-all duration-150 px-3 ${
        active ? "bg-accent-light text-accent-text font-medium" : "text-text-secondary hover:bg-canvas hover:text-text-primary"
      }`}
    >
      <Icon size={18} strokeWidth={1.6} className="shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge != null && (
        <span className="text-sm font-semibold text-text-secondary ml-auto">{badge}</span>
      )}
    </button>
  );
}

export default function ProjectShell({ children }) {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const location = useLocation();
  const { vizUser } = useUser();
  const { user, logout } = useAuth0();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: project } = useGroup(projectId);
  const { data: allGroups = [] } = useGroups();
  const { data: allSites = [] } = useSites();

  const descIds = projectId ? getDescendantIds(allGroups, projectId) : [];
  const projectSites = allSites.filter((s) => descIds.includes(s.group_id));
  const projectGroups = allGroups.filter((g) => g.parent_id && descIds.includes(g.id) && g.id !== projectId);

  const initial = vizUser?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";
  const displayName = vizUser?.name || user?.email?.split("@")[0];
  const basePath = `/projects/${projectId}`;

  const handleLogout = () => logout({ logoutParams: { returnTo: window.location.origin } });

  function nav(path) { navigate(path); setDrawerOpen(false); }

  function renderNav() {
    return (
      <>
        {/* Back to projects */}
        <button
          onClick={() => nav("/projects")}
          className="w-full flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-md font-medium text-text-secondary hover:text-text-primary hover:bg-canvas transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> All Projects
        </button>

        {/* Project name */}
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
              <FolderKanban size={16} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold text-text-primary truncate">{project?.name || "Project"}</p>
              {project?.category && (
                <p className="text-sm text-text-secondary uppercase tracking-wide">{project.category}</p>
              )}
            </div>
          </div>
        </div>

        <div className="h-px bg-border mb-2" />

        {/* Nav items */}
        <NavItem icon={LayoutDashboard} label="Overview" active={location.pathname === basePath} onClick={() => nav(basePath)} />
        <NavItem icon={MapPin} label="Sites" badge={projectSites.length || null} active={location.pathname === `${basePath}/sites`} onClick={() => nav(`${basePath}/sites`)} />

        {/* Sub-group tree under Sites */}
        {projectGroups.length > 0 && (
          <div className="ml-1">
            <SidebarTree
              groups={projectGroups}
              sites={projectSites}
              baseUrl={`${basePath}/sites`}
            />
          </div>
        )}

        <NavItem icon={Briefcase} label="Jobs" active={location.pathname === `${basePath}/jobs` || location.pathname.startsWith(`${basePath}/jobs/`)} onClick={() => nav(`${basePath}/jobs`)} />
        <NavItem icon={FolderOpen} label="Workflows" active={location.pathname === `${basePath}/workflows` || location.pathname.startsWith(`${basePath}/workflows/`)} onClick={() => nav(`${basePath}/workflows`)} />
        <NavItem icon={Settings} label="Settings" active={location.pathname === `${basePath}/settings` || location.pathname === `${basePath}/groups` || location.pathname === `${basePath}/members`} onClick={() => nav(`${basePath}/settings`)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 w-[250px] bg-white border-r border-border overflow-y-auto" style={{ padding: "14px 10px" }}>
        <nav className="flex-1">{renderNav()}</nav>
        <div className="h-px bg-border" />
        <div className="pt-3 shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-canvas cursor-pointer" onClick={() => nav("/profile")}>
            <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
              <span className="text-base font-bold text-accent-text">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-medium text-text-primary truncate leading-tight">{displayName}</p>
              <p className="text-base text-text-secondary truncate leading-tight mt-px">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2.5 py-1.5 mt-1 rounded-lg text-base font-medium text-text-secondary hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer">
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-12 bg-white border-b border-border flex items-center px-4 gap-3">
        <button onClick={() => setDrawerOpen(true)} className="p-1 -ml-1 rounded-md text-text-secondary hover:text-text-primary cursor-pointer">
          <Menu size={18} />
        </button>
        <FolderKanban size={16} className="text-accent" />
        <span className="text-xl font-semibold text-text-primary truncate">{project?.name || "Project"}</span>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && <div className="lg:hidden fixed inset-0 bg-black/30 z-50" onClick={() => setDrawerOpen(false)} />}
      <aside className={`lg:hidden fixed inset-y-0 left-0 w-[272px] bg-white z-50 flex flex-col border-r border-border transition-transform duration-250 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ padding: "14px 10px" }}>
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2">
            <FolderKanban size={16} className="text-accent" />
            <span className="text-xl font-semibold">{project?.name}</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-md text-text-muted hover:text-text-primary cursor-pointer"><X size={16} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto">{renderNav()}</nav>
        <div className="h-px bg-border" />
        <div className="pt-3">
          <button onClick={() => { handleLogout(); setDrawerOpen(false); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-lg font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer">
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="lg:ml-[250px] min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
