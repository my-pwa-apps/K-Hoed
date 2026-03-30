import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Play, BarChart3, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { gameApi, quizApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
export default function Dashboard() {
    const user = useAuthStore((s) => s.user);
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
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-3xl font-display font-bold text-gray-900", children: ["Welcome back, ", user?.display_name?.split(" ")[0], " \uD83D\uDC4B"] }), _jsx("p", { className: "text-gray-500 mt-1", children: "Ready to host your next quiz?" })] }), _jsx(Link, { to: "/quizzes/new", children: _jsxs(Button, { size: "lg", children: [_jsx(Plus, { size: 18 }), "New quiz"] }) })] }), _jsxs("div", { className: "grid sm:grid-cols-3 gap-4", children: [_jsx(StatCard, { icon: _jsx(BookOpen, {}), label: "Total quizzes", value: quizCount }), _jsx(StatCard, { icon: _jsx(Play, {}), label: "Games played", value: endedSessions }), _jsx(StatCard, { icon: _jsx(BarChart3, {}), label: "Questions created", value: quizzes?.reduce((s, q) => s + (q.question_count ?? 0), 0) ?? 0 })] }), _jsxs("div", { className: "grid sm:grid-cols-2 gap-4", children: [_jsxs(Card, { className: "bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0 shadow-lg", children: [_jsx("h2", { className: "font-display font-bold text-xl mb-2", children: "Start a game" }), _jsx("p", { className: "text-white/80 text-sm mb-4", children: "Pick a quiz, get a room code, and go live instantly." }), _jsx(Link, { to: "/quizzes", children: _jsx(Button, { variant: "secondary", size: "sm", children: "Choose quiz" }) })] }), _jsxs(Card, { className: "bg-gradient-to-br from-accent-500 to-rose-500 text-white border-0 shadow-lg", children: [_jsx("h2", { className: "font-display font-bold text-xl mb-2", children: "Create a quiz" }), _jsx("p", { className: "text-white/80 text-sm mb-4", children: "Build your own questions with timers and answer choices." }), _jsx(Link, { to: "/quizzes/new", children: _jsx(Button, { variant: "secondary", size: "sm", children: "Start building" }) })] })] }), recentSessions.length > 0 && (_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-800 mb-3", children: "Recent sessions" }), _jsx("div", { className: "space-y-2", children: recentSessions.map((session) => (_jsxs("div", { className: "flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "font-mono font-bold text-brand-600 text-lg", children: session.room_code }), _jsx("span", { className: "ml-3 text-sm text-gray-500", children: new Date(session.created_at).toLocaleDateString() })] }), _jsx("span", { className: `badge ${session.status === "ended"
                                        ? "bg-gray-100 text-gray-600"
                                        : session.status === "active"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-brand-100 text-brand-700"}`, children: session.status })] }, session.id))) })] }))] }));
}
function StatCard({ icon, label, value, }) {
    return (_jsx(Card, { children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "p-3 bg-brand-50 rounded-xl text-brand-600", children: icon }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl font-bold text-gray-900 tabular-nums", children: value }), _jsx("p", { className: "text-sm text-gray-500", children: label })] })] }) }));
}
