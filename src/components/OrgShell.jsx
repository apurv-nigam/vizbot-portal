import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@/auth/UserProvider";
import { useAuth0 } from "@auth0/auth0-react";

export default function OrgShell({ children, title }) {
  const navigate = useNavigate();
  const { vizUser } = useUser();
  const { user } = useAuth0();
  const initial = vizUser?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";
  const displayName = vizUser?.name || user?.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/projects")} className="flex items-center gap-1.5 text-md font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer">
              <ArrowLeft size={14} /> Projects
            </button>
            {title && (
              <>
                <div className="w-px h-5 bg-border" />
                <span className="text-lg font-semibold text-text-primary">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/profile")} className="text-md text-text-secondary hover:text-text-primary transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-canvas">Settings</button>
            <div className="w-px h-5 bg-border mx-1" />
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/profile")}>
              <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center">
                <span className="text-xs font-bold text-accent-text">{initial}</span>
              </div>
              <span className="text-md font-medium text-text-primary hidden sm:block">{displayName}</span>
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
