import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { gameApi } from "@/lib/api";
import { getAvatarColor } from "@/lib/utils";
export default function GameResults() {
    const { sessionId } = useParams();
    const { data, isLoading } = useQuery({
        queryKey: ["results", sessionId],
        queryFn: () => gameApi.results(sessionId),
        enabled: !!sessionId,
    });
    if (isLoading) {
        return _jsx("div", { className: "text-center py-20 text-gray-400", children: "Loading results\u2026" });
    }
    if (!data) {
        return (_jsxs("div", { className: "text-center py-20", children: [_jsx("p", { className: "text-gray-500 mb-4", children: "Results not found" }), _jsx(Link, { to: "/dashboard", children: _jsx(Button, { variant: "secondary", children: "Back to dashboard" }) })] }));
    }
    const { session, players } = data;
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const duration = session.ended_at && session.started_at
        ? Math.round((session.ended_at - session.started_at) / 1000)
        : null;
    return (_jsxs("div", { className: "max-w-2xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Link, { to: "/quizzes", children: _jsxs(Button, { variant: "ghost", size: "sm", children: [_jsx(ArrowLeft, { size: 16 }), " Quizzes"] }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold text-gray-900", children: "Game Results" }), _jsxs("p", { className: "text-gray-500 text-sm", children: ["Room code: ", _jsx("strong", { className: "font-mono text-brand-600", children: session.room_code }), duration && ` · ${Math.floor(duration / 60)}m ${duration % 60}s`] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs(Card, { className: "text-center", children: [_jsx(Users, { className: "mx-auto text-brand-400 mb-2" }), _jsx("p", { className: "text-3xl font-bold text-gray-900", children: players.length }), _jsx("p", { className: "text-sm text-gray-500", children: "Players" })] }), _jsxs(Card, { className: "text-center", children: [_jsx(Trophy, { className: "mx-auto text-amber-400 mb-2" }), _jsx("p", { className: "text-2xl font-bold text-gray-900 truncate", children: sortedPlayers[0]?.display_name ?? "—" }), _jsx("p", { className: "text-sm text-gray-500", children: "Winner" })] })] }), _jsxs(Card, { children: [_jsx("h2", { className: "font-semibold text-gray-800 mb-4", children: "Final standings" }), _jsx("div", { className: "space-y-2", children: sortedPlayers.map((player, i) => (_jsxs("div", { className: "flex items-center gap-3 py-2 border-b border-gray-50 last:border-0", children: [_jsx("span", { className: "w-7 text-center font-bold text-gray-400 text-sm", children: i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}` }), _jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${getAvatarColor(player.id)}`, "aria-hidden": true, children: player.display_name[0]?.toUpperCase() }), _jsx("span", { className: "flex-1 font-medium text-gray-800", children: player.display_name }), _jsx("span", { className: "font-bold tabular-nums text-gray-900", children: player.score.toLocaleString() })] }, player.id))) })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Link, { to: "/quizzes", className: "flex-1", children: _jsx(Button, { variant: "secondary", fullWidth: true, children: "Back to quizzes" }) }), _jsx(Link, { to: "/dashboard", className: "flex-1", children: _jsx(Button, { fullWidth: true, children: "Dashboard" }) })] })] }));
}
