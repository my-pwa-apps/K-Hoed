import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, Link, useNavigate } from "react-router-dom";
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
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 flex flex-col", children: [_jsx("header", { className: "bg-white border-b border-gray-200 sticky top-0 z-40", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4", children: [_jsxs(Link, { to: "/dashboard", className: "flex items-center gap-2 font-display font-bold text-xl text-brand-600", children: [_jsx("img", { src: "/logo.png", alt: "K-Hoed", className: "h-10 w-10 object-contain" }), "K-Hoed"] }), _jsxs("nav", { className: "hidden sm:flex items-center gap-1", "aria-label": "Main navigation", children: [_jsx(NavLink, { to: "/dashboard", icon: _jsx(LayoutDashboard, { size: 16 }), children: t.nav.dashboard }), _jsx(NavLink, { to: "/quizzes", icon: _jsx(BookOpen, { size: 16 }), children: "Quizzes" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(LanguagePicker, {}), _jsx("span", { className: "hidden sm:block text-sm text-gray-600 font-medium truncate max-w-[140px]", children: user?.display_name }), _jsx("button", { onClick: handleLogout, "aria-label": "Log out", className: "p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors", children: _jsx(LogOut, { size: 18 }) })] })] }) }), _jsx("main", { className: "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8", children: _jsx(Outlet, {}) })] }));
}
function NavLink({ to, icon, children, }) {
    return (_jsxs(Link, { to: to, className: "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600\r\n                 hover:text-brand-700 hover:bg-brand-50 transition-colors", children: [icon, children] }));
}
