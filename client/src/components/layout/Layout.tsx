import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LogOut, LayoutDashboard, BookOpen } from "lucide-react";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { useI18n } from "@/i18n";

export default function Layout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 shrink-0 relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold text-xl text-brand-600">
            <img src="/logo.png" alt="K-Hoed" className="h-10 w-10 object-contain" />
            K-Hoed
          </Link>

          {/* Nav — desktop only */}
          <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
            <NavLink to="/dashboard" icon={<LayoutDashboard size={16} />}>
              {t.nav.dashboard}
            </NavLink>
            <NavLink to="/quizzes" icon={<BookOpen size={16} />}>
              Quizzes
            </NavLink>
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-2">
            <LanguagePicker />
            <span className="hidden sm:block text-sm text-gray-600 font-medium truncate max-w-[140px]">
              {user?.display_name}
            </span>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Page content — scrolls within remaining viewport height */}
      <main className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-20 sm:pb-8">
        <Outlet />
      </main>

      {/* Bottom tab bar — mobile only */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200
                   flex safe-area-inset-bottom"
        aria-label="Mobile navigation"
      >
        <BottomTab to="/dashboard" icon={<LayoutDashboard size={22} />} label={t.nav.dashboard} />
        <BottomTab to="/quizzes" icon={<BookOpen size={22} />} label="Quizzes" />
      </nav>
    </div>
  );
}

function NavLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600
                 hover:text-brand-700 hover:bg-brand-50 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}

function BottomTab({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3
                  text-xs font-semibold transition-colors
                  ${active ? "text-brand-600" : "text-gray-500 hover:text-brand-500"}`}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
    </Link>
  );
}
