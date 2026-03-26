import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  const handleLogin = () => loginWithRedirect();
  const handleSignup = () =>
    loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/60">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5">
            <div
              className="w-[30px] h-[30px] rounded-lg flex items-center justify-center"
              style={{ background: "var(--color-accent)" }}
            >
              <span className="text-white font-extrabold text-sm">V</span>
            </div>
            <span className="text-[17px] font-bold text-text-primary tracking-[-0.5px]">Vizbot</span>
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 py-1.5 rounded-md text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleLogin}>Log in</Button>
                <Button size="sm" onClick={handleSignup}>Get Started</Button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-1.5 rounded-md text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <div className="px-4 py-3 space-y-0.5">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-[14px] font-medium py-2 px-3 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors duration-200"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border">
              {isAuthenticated ? (
                <Button className="w-full" onClick={() => { setMobileOpen(false); navigate("/dashboard"); }}>Dashboard</Button>
              ) : (
                <>
                  <Button variant="secondary" className="w-full" onClick={() => { setMobileOpen(false); handleLogin(); }}>Log in</Button>
                  <Button className="w-full" onClick={() => { setMobileOpen(false); handleSignup(); }}>Get Started</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
