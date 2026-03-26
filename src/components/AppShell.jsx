import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/auth/UserProvider";
import { useGroups, useSites } from "@/lib/queries";
import { apiRequest } from "@/lib/api";
import {
  LayoutDashboard, MapPin, FolderOpen, Briefcase, Network,
  LogOut, Menu, X, ChevronLeft, ChevronRight, AlertCircle,
} from "lucide-react";
import SidebarTree from "./SidebarTree";

const STORAGE_KEY = "vizbot-sidebar";

function Logo({ collapsed }) {
  return (
    <div className="flex items-center gap-[11px] overflow-hidden">
      <div className="w-[34px] h-[34px] rounded-[9px] bg-accent flex items-center justify-center shrink-0">
        <span className="text-white font-semibold text-[15px] tracking-[-0.5px]">V</span>
      </div>
      {!collapsed && (
        <span className="text-[17px] font-semibold text-text-primary tracking-[-0.3px] whitespace-nowrap">Vizbot</span>
      )}
    </div>
  );
}

function Avatar({ name = "?", size = 34 }) {
  return (
    <div className="rounded-full bg-accent-light flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <span className="text-accent-text font-semibold" style={{ fontSize: size * 0.35 }}>{name}</span>
    </div>
  );
}

function NavItem({ icon: Icon, label, badge, badgeClass, active, collapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] h-[34px] mb-[1px] cursor-pointer transition-all duration-150 ${
        collapsed ? "justify-center px-0" : "px-3"
      } ${active ? "bg-accent-light text-accent-text font-medium" : "text-text-secondary hover:bg-canvas hover:text-text-primary"}`}
    >
      <Icon size={18} strokeWidth={1.6} className="shrink-0" />
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {!collapsed && badge != null && (
        <span className={`text-[11px] font-semibold px-2 py-px rounded-[10px] ${badgeClass || "bg-[#E6F1FB] text-[#0C447C]"}`}>{badge}</span>
      )}
    </button>
  );
}

function SectionLabel({ label, collapsed }) {
  if (collapsed) return <div className="h-px bg-border my-2 mx-2" />;
  return <p className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.6px] px-3 pt-[18px] pb-[6px]">{label}</p>;
}

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const { user, logout, getAccessTokenSilently } = useAuth0();
  const { vizUser, setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: groups = [] } = useGroups();
  const { data: sites = [] } = useSites();
  const unassignedCount = sites.filter((s) => !s.group_id).length;

  useEffect(() => {
    if (vizUser?.name) return;
    let cancelled = false;
    async function fetchProfile() {
      try {
        const token = await getAccessTokenSilently();
        const data = await apiRequest("/api/v1/users/me", { token });
        if (!cancelled) setUser({ ...vizUser, ...data });
      } catch {}
    }
    fetchProfile();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => logout({ logoutParams: { returnTo: window.location.origin } });
  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }

  const sidebarW = collapsed ? 64 : 250;
  const resolvedName = vizUser?.name || user?.name;
  const initial = resolvedName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";
  const displayName = resolvedName || user?.email?.split("@")[0];
  const workspaceName = vizUser?.org_name || `${displayName}'s Workspace`;

  function renderNav(mobile) {
    const c = collapsed && !mobile;
    return (
      <>
        <NavItem icon={LayoutDashboard} label="Dashboard" active={location.pathname === "/dashboard"} collapsed={c} onClick={() => { navigate("/dashboard"); if (mobile) setDrawerOpen(false); }} />
        <SectionLabel label="Sites" collapsed={c} />
        <NavItem icon={MapPin} label="All Sites" badge={sites.length || null} badgeClass="bg-[#E6F1FB] text-[#0C447C]" active={location.pathname === "/sites" && !location.search.includes("unassigned")} collapsed={c} onClick={() => { navigate("/sites"); if (mobile) setDrawerOpen(false); }} />
        {!c && groups.length > 0 && <SidebarTree groups={groups} sites={sites} />}
        {unassignedCount > 0 && !c && (
          <div
            onClick={() => { navigate("/sites?assigned=unassigned"); if (mobile) setDrawerOpen(false); }}
            className={`flex items-center gap-[5px] py-[6px] px-2 cursor-pointer rounded-md mx-[6px] my-[1px] text-[12px] transition-all duration-100 ${
              location.search.includes("unassigned")
                ? "bg-accent-light text-accent-text font-semibold"
                : "text-text-secondary hover:bg-canvas"
            }`}
            style={{ paddingLeft: 32 }}
          >
            <span className="w-3 inline-block shrink-0" />
            <span className="flex-1">Unassigned</span>
            <span className="text-[10px] font-semibold px-2 py-px rounded-[10px] bg-[#FEE2E2] text-[#7F1D1D] ml-auto">{unassignedCount}</span>
          </div>
        )}
        {unassignedCount > 0 && c && (
          <NavItem icon={AlertCircle} label="Unassigned" badge={unassignedCount} badgeClass="bg-[#FEE2E2] text-[#7F1D1D]" active={location.search.includes("unassigned")} collapsed={true} onClick={() => { navigate("/sites?assigned=unassigned"); if (mobile) setDrawerOpen(false); }} />
        )}
        <SectionLabel label="Work" collapsed={c} />
        <NavItem icon={FolderOpen} label="Workflows" active={location.pathname.startsWith("/workflows") || location.pathname.startsWith("/projects")} collapsed={c} onClick={() => { navigate("/workflows"); if (mobile) setDrawerOpen(false); }} />
        <NavItem icon={Briefcase} label="Jobs" active={location.pathname === "/jobs"} collapsed={c} onClick={() => { navigate("/jobs"); if (mobile) setDrawerOpen(false); }} />
        <SectionLabel label="Manage" collapsed={c} />
        <NavItem icon={Network} label="Groups" badge={groups.length || null} badgeClass="bg-[#E6F1FB] text-[#0C447C]" active={location.pathname === "/groups" || location.pathname.startsWith("/groups/")} collapsed={c} onClick={() => { navigate("/groups"); if (mobile) setDrawerOpen(false); }} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-white border-r border-border transition-[width] duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] overflow-hidden" style={{ width: sidebarW, padding: "14px 10px" }}>
        <div className="flex items-center justify-between px-[10px] mb-3 shrink-0">
          <button onClick={() => navigate("/dashboard")} className="cursor-pointer"><Logo collapsed={collapsed} /></button>
          {!collapsed && (
            <button onClick={toggleCollapse} className="w-[26px] h-[26px] rounded-md flex items-center justify-center cursor-pointer text-text-muted hover:text-text-secondary hover:bg-canvas transition-colors"><ChevronLeft size={13} /></button>
          )}
        </div>
        {!collapsed ? (
          <div className="mx-1 mb-4 px-3 py-[9px] bg-canvas rounded-lg flex items-center gap-[7px]">
            <div className="w-[7px] h-[7px] rounded-full bg-[#34D399] shrink-0" />
            <span className="text-[12px] text-text-secondary truncate">{workspaceName}</span>
          </div>
        ) : (
          <div className="flex justify-center mb-3"><div title={workspaceName} className="w-[7px] h-[7px] rounded-full bg-[#34D399]" /></div>
        )}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden">{renderNav(false)}</nav>
        <div className="h-px bg-border" />
        <div className="pt-4 shrink-0 relative">
          <div onClick={() => setUserMenu(!userMenu)} className={`flex items-center gap-2.5 rounded-lg cursor-pointer transition-colors hover:bg-canvas ${collapsed ? "justify-center p-1.5" : "px-2.5 py-1.5"}`}>
            <Avatar name={initial} />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-text-primary truncate leading-tight">{displayName}</p>
                <p className="text-[11px] text-text-muted truncate leading-tight mt-px">{user?.email}</p>
              </div>
            )}
          </div>
          {userMenu && (
            <>
              <div onClick={() => setUserMenu(false)} className="fixed inset-0 z-[99]" />
              <div className="absolute bottom-14 w-[190px] bg-white rounded-xl border border-border shadow-[0_20px_48px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] p-1 z-[100]" style={{ left: collapsed ? 56 : 8 }}>
                <button onClick={() => { navigate("/profile"); setUserMenu(false); }} className="w-full text-left px-3 py-2 text-[13px] text-text-secondary rounded-lg hover:bg-canvas cursor-pointer transition-colors">Settings</button>
                <div className="h-px bg-border my-1" />
                <button onClick={() => { handleLogout(); setUserMenu(false); }} className="w-full text-left px-3 py-2 text-[13px] text-[#DC2626] rounded-lg hover:bg-[#FEF2F2] cursor-pointer transition-colors">Log out</button>
              </div>
            </>
          )}
          {collapsed && (
            <button onClick={toggleCollapse} title="Expand" className="w-full flex justify-center mt-2 text-text-muted cursor-pointer hover:text-text-secondary transition-colors"><ChevronRight size={14} /></button>
          )}
        </div>
      </aside>

      {/* Mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-12 bg-white border-b border-border flex items-center px-4 gap-3">
        <button onClick={() => setDrawerOpen(true)} className="p-1 -ml-1 rounded-md text-text-secondary hover:text-text-primary cursor-pointer"><Menu size={18} /></button>
        <Logo collapsed={false} />
      </div>
      {drawerOpen && <div className="lg:hidden fixed inset-0 bg-black/30 z-50 animate-[fadeInOverlay_0.15s_ease-out]" onClick={() => setDrawerOpen(false)} />}
      <aside className={`lg:hidden fixed inset-y-0 left-0 w-[272px] bg-white z-50 flex flex-col border-r border-border transition-transform duration-[250ms] ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ padding: "14px 10px" }}>
        <div className="flex items-center justify-between px-1 mb-3 shrink-0">
          <Logo collapsed={false} />
          <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-md text-text-muted hover:text-text-primary cursor-pointer"><X size={16} /></button>
        </div>
        <div className="mx-1 mb-4 px-3 py-2 bg-canvas rounded-lg flex items-center gap-[7px]">
          <div className="w-[7px] h-[7px] rounded-full bg-[#34D399]" />
          <span className="text-[12px] text-text-secondary truncate">{workspaceName}</span>
        </div>
        <nav className="flex-1 overflow-y-auto">{renderNav(true)}</nav>
        <div className="h-px bg-border" />
        <div className="pt-3 shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-1.5">
            <Avatar name={initial} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-text-primary truncate">{displayName}</p>
              <p className="text-[11px] text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => { handleLogout(); setDrawerOpen(false); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors mt-1 cursor-pointer">
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="app-main min-h-screen overflow-x-hidden pt-16 px-0 pb-0 lg:pt-0 lg:px-0 lg:pb-0" style={{ "--sidebar-w": collapsed ? "64px" : "250px" }}>
        {children}
      </main>
    </div>
  );
}
