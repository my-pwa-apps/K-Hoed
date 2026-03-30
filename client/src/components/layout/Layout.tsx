import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LogOut, LayoutDashboard, BookOpen } from "lucide-react";

export default function Layout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold text-xl text-brand-600">
            <span className="text-2xl" aria-hidden>🎯</span>
            K-Hoed
          </Link>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
            <NavLink to="/dashboard" icon={<LayoutDashboard size={16} />}>
              Dashboard
            </NavLink>
            <NavLink to="/quizzes" icon={<BookOpen size={16} />}>
              Quizzes
            </NavLink>
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
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

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
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
