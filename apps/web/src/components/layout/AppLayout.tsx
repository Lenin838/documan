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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Desktop Nav */}
            <div className="flex items-center gap-8">
              <Link
                to="/dashboard"
                className="flex items-center gap-2.5 font-extrabold text-xl text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <span>Documan</span>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        isActive
                          ? "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 shadow-sm"
                          : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Cmd+K Quick Search Button */}
              <button
                type="button"
                onClick={() => navigate("/knowledge/search")}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
                title="Global Search (Cmd+K)"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search...</span>
                <kbd className="font-mono text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                  ⌘K
                </kbd>
              </button>

              <NotificationBell />

              {/* User Dropdown / Controls */}
              {user && (
                <div className="hidden sm:flex items-center gap-3 border-l border-slate-800 pl-4">
                  <div className="text-right text-xs">
                    <p className="font-semibold text-slate-200">{user.name}</p>
                    <p className="text-indigo-400 uppercase tracking-wider text-[10px]">
                      {user.role}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => void handleLogout()}>
                    Logout
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Toggle Navigation Menu"
                aria-expanded={mobileMenuOpen}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav
            className="md:hidden border-b border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-1"
            aria-label="Mobile Navigation"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-300 hover:bg-slate-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
                <div className="px-3 py-1">
                  <p className="text-sm font-semibold text-slate-200">
                    {user.name} ({user.email})
                  </p>
                  <p className="text-xs text-indigo-400 uppercase">{user.role}</p>
                </div>
                <div className="flex gap-2 px-3 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => void handleLogout()} className="flex-1">
                    Logout
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void handleLogoutAll()} className="flex-1">
                    Logout All
                  </Button>
                </div>
              </div>
            )}
          </nav>
        )}
      </header>

      {/* Main Content Body */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Subtle Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          Documan Product Platform &copy; 2026. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
