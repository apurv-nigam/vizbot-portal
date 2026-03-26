import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect({ appState: { returnTo: window.location.pathname } });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-accent)" }}
          >
            <span className="text-white font-extrabold text-sm">V</span>
          </div>
          <Loader2 size={16} className="animate-spin text-text-muted" />
        </div>
      </div>
    );
  }

  return children;
}
