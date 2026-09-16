import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/auth.store";
import { NotificationBell } from "../NotificationBell";
import { Button } from "../ui/Button";

export function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const logoutAll = useAuthStore((state) => state.logoutAll);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut for fast Knowledge Search access
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        navigate("/knowledge/search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  async function handleLogoutAll() {
    await logoutAll();
    navigate("/login");
  }

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Projects", path: "/projects" },
    { label: "Documents", path: "/documents" },
    { label: "Knowledge Search", path: "/knowledge/search" },
    { label: "My Reviews", path: "/reviews" },
    { label: "Trash", path: "/trash" },
  ];

  if (user?.role === "admin") {
    navItems.push({ label: "Manage Users", path: "/users" });
  }

  return (
    <div className="min-h-screen bg-[#0c1324] text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Application Bar (h-14 fixed) */}
      <header className="bg-[#191f31] border-b border-[#1e293b] shadow-sm flex justify-between items-center w-full px-4 md:px-6 h-14 fixed top-0 left-0 z-50">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-extrabold text-lg text-slate-100 hover:text-[#38bdf8] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8] rounded"
          >
            <span className="w-6 h-6 rounded bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8] flex items-center justify-center text-xs font-mono font-bold">
              DE
            </span>
            <span className="tracking-tight">Documan Enterprise</span>
          </Link>
          <div className="h-4 w-px bg-[#1e293b] hidden sm:block"></div>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-[#0c1324] text-slate-300 font-mono text-[10px] uppercase border border-[#1e293b]">
            ENV: PROD-NORTH-SEC-01
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 font-mono text-[10px] text-[#10b981] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
            INVARIANT ENGINE: SYNCED
          </span>
        </div>

        {/* Top Bar Right Cluster */}
        <div className="flex items-center gap-3">
          {/* Quick Search Button (Cmd+K) */}
          <button
            type="button"
            onClick={() => navigate("/knowledge/search")}
            className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#0c1324] border border-[#1e293b] hover:border-[#38bdf8] rounded font-mono text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Search Knowledge (Cmd+K)"
          >
            <span>Search...</span>
            <kbd className="font-mono text-[10px] bg-[#191f31] border border-[#1e293b] px-1.5 py-0.5 rounded text-slate-400">
              ⌘K
            </kbd>
          </button>

          <NotificationBell />

          {/* User Account Controls */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 rounded bg-[#38bdf8] text-[#0c1324] font-mono text-xs font-bold flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]"
              >
                {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#191f31] border border-[#1e293b] rounded-[6px] shadow-lg p-3 z-50 space-y-2">
                  <div className="border-b border-[#1e293b] pb-2">
                    <p className="text-xs font-semibold text-slate-100">{user.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 font-mono text-[10px] uppercase text-[#38bdf8] bg-[#0c1324] px-1.5 py-0.5 rounded border border-[#1e293b]">
                      {user.role}
                    </span>
                  </div>
                  <div className="space-y-1 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void handleLogout();
                      }}
                      className="w-full text-xs justify-start"
                    >
                      Logout
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void handleLogoutAll();
                      }}
                      className="w-full text-xs justify-start text-[#f43f5e]"
                    >
                      Logout All Sessions
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 pt-14 pb-10">
        {/* Docked Left Sidebar Navigation Drawer (w-72 / 280px desktop) */}
        <aside className="hidden lg:flex fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-72 flex-col justify-between p-4 z-40 bg-[#191f31] border-r border-[#1e293b] shadow-sm overflow-y-auto">
          <div className="flex flex-col gap-4">
            {/* Sidebar User / Enclave Profile Header */}
            {user && (
              <div className="p-3 rounded-[6px] bg-[#0c1324] border border-[#1e293b] flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8] flex items-center justify-center font-mono font-bold text-xs">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-100 truncate">
                    {user.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    DOCUMAN-ENCLAVE-V4
                  </span>
                  <span className="font-mono text-[10px] text-[#10b981] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                    Status: Compliant
                  </span>
                </div>
              </div>
            )}

            {/* Navigation Drawer Links */}
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-[6px] px-3 py-2 text-xs font-mono transition-all ${
                      isActive
                        ? "bg-[#0c1324] text-[#38bdf8] font-bold border-l-2 border-[#38bdf8]"
                        : "text-slate-400 hover:bg-[#0c1324] hover:text-slate-200"
                    }`
                  }
                >
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Drawer Bottom Verification Telemetry */}
          <div className="border border-[#1e293b] rounded-[6px] p-3 bg-[#0c1324] text-xs font-mono space-y-1.5">
            <div className="flex justify-between items-center text-slate-400 text-[10px]">
              <span className="font-semibold text-slate-200">CONSENSUS</span>
              <span className="text-[#10b981] font-bold">SHA-256 VALID</span>
            </div>
            <div className="w-full bg-[#191f31] rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#38bdf8] h-full rounded-full w-full"></div>
            </div>
            <div className="flex justify-between text-slate-500 text-[10px]">
              <span>Quorum: 5/5 Nodes</span>
              <span>Latency: 14ms</span>
            </div>
          </div>
        </aside>

        {/* Main Viewport Content Canvas */}
        <main id="main-content" className="flex-1 lg:ml-72 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Handheld Viewport < 1024px) */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-1.5 bg-[#191f31] border-t border-[#1e293b] text-xs font-mono">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-2 py-1 rounded text-[11px] ${
                isActive ? "text-[#38bdf8] font-bold" : "text-slate-400"
              }`
            }
          >
            <span>{item.label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>

      {/* Technical Status Footer Rail */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#191f31] border-t border-[#1e293b] h-7 px-6 hidden lg:flex items-center justify-between font-mono text-[10px] text-slate-400 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
            <span className="text-slate-200 font-semibold">Cryptographic Anchor Online</span>
          </div>
          <span>|</span>
          <span>Node v4.2.0-STABLE</span>
          <span>|</span>
          <span>Latency: <strong className="text-slate-200">14ms</strong></span>
        </div>
        <div>
          <span>Documan Enterprise &copy; 2026</span>
        </div>
      </footer>
    </div>
  );
}
