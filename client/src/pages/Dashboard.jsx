import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Play, BarChart3, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { gameApi, quizApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useI18n, interp } from "@/i18n";
export default function Dashboard() {
    const user = useAuthStore((s) => s.user);
    const { t } = useI18n();
    const { data: quizzes } = useQuery({
        queryKey: ["quizzes"],
        queryFn: quizApi.list,
    });
    const { data: sessions } = useQuery({
        queryKey: ["sessions"],
        queryFn: gameApi.listSessions,
    });
    const recentSessions = sessions?.slice(0, 5) ?? [];
    const quizCount = quizzes?.length ?? 0;
    const endedSessions = sessions?.filter((s) => s.status === "ended").length ?? 0;
    return (_jsxs("div", { className: "space-y-2 sm:space-y-8 pb-10", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 sm:gap-3", children: [_jsx("div", { children: _jsx("h1", { className: "text-lg sm:text-3xl font-display font-bold text-gray-900 leading-none", children: interp(t.dashboard.welcome, { name: user?.display_name?.split(" ")[0] ?? "" }) }) }), _jsx(Link, { to: "/quizzes/new", className: "shrink-0", children: _jsxs(Button, { size: "sm", className: "h-8 text-xs sm:text-base px-2", children: [_jsx(Plus, { size: 14, className: "mr-1" }), "New"] }) })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 sm:gap-4", children: [_jsx(StatCard, { icon: _jsx(BookOpen, {}), label: t.dashboard.total_quizzes, value: quizCount }), _jsx(StatCard, { icon: _jsx(Play, {}), label: t.dashboard.games_played, value: endedSessions }), _jsx(StatCard, { icon: _jsx(BarChart3, {}), label: t.dashboard.questions_created, value: quizzes?.reduce((s, q) => s + (q.question_count ?? 0), 0) ?? 0 })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 sm:gap-4", children: [_jsxs(Card, { className: "bg-gradient-to-br flex flex-col justify-between from-brand-500 to-brand-700 text-white border-0 shadow flex-1 p-3 sm:p-6 p-2 rounded-xl", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display font-bold text-[13px] sm:text-xl sm:mb-2 leading-tight", children: t.dashboard.start_game_title }), _jsx("p", { className: "text-white/80 text-xs hidden sm:block sm:mb-4", children: t.dashboard.start_game_body })] }), _jsx(Link, { to: "/quizzes", className: "block mt-2 sm:mt-auto", children: _jsx(Button, { variant: "secondary", className: "h-8 text-xs py-0 sm:h-10 sm:text-sm px-2 w-full", children: t.dashboard.choose_quiz }) })] }), _jsxs(Card, { className: "bg-gradient-to-br flex flex-col justify-between from-accent-500 to-rose-500 text-white border-0 shadow flex-1 p-3 sm:p-6 p-2 rounded-xl", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display font-bold text-[13px] sm:text-xl sm:mb-2 leading-tight", children: t.dashboard.create_quiz_title }), _jsx("p", { className: "text-white/80 text-xs hidden sm:block sm:mb-4", children: t.dashboard.create_quiz_body })] }), _jsx(Link, { to: "/quizzes/new", className: "block mt-2 sm:mt-auto", children: _jsx(Button, { variant: "secondary", className: "h-8 text-xs py-0 sm:h-10 sm:text-sm px-2 w-full", children: t.dashboard.start_building }) })] })] }), recentSessions.length > 0 && (_jsxs("div", { children: [_jsx("h2", { className: "text-xs sm:text-lg font-semibold text-gray-800 mb-2", children: t.dashboard.recent_games }), _jsx("div", { className: "space-y-1.5", children: recentSessions.map((session) => (_jsxs("div", { className: "flex items-center justify-between bg-white rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-3 border border-gray-100 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("span", { className: "font-mono font-bold text-brand-600 text-xs sm:text-lg shrink-0", children: session.room_code }), _jsx("span", { className: "text-[10px] sm:text-sm text-gray-500 truncate mt-0.5", children: new Date(session.created_at).toLocaleDateString() })] }), _jsx("span", { className: `badge text-[10px] sm:text-xs shrink-0 ml-2 px-1.5 py-0.5 ${session.status === "ended"
                                        ? "bg-gray-100 text-gray-600"
                                        : session.status === "active"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-brand-100 text-brand-700"}`, children: session.status })] }, session.id))) })] }))] }));
}
function StatCard({ icon, label, value, }) {
    return (_jsxs(Card, { className: "p-2 sm:p-5 flex flex-col items-center justify-center text-center sm:flex-row sm:items-start sm:text-left gap-1 sm:gap-4", children: [_jsx("div", { className: "p-1 sm:p-3 bg-brand-50 rounded-lg sm:rounded-xl text-brand-600 shrink-0 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-6 sm:[&>svg]:h-6", children: icon }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm sm:text-2xl font-bold text-gray-900 tabular-nums leading-none mb-0.5", children: value }), _jsx("p", { className: "text-[10px] sm:text-xs text-gray-500 leading-tight", children: label })] })] }));
}
