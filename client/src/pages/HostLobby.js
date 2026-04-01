import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Copy, Play, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGameStore, initHostGame } from "@/stores/gameStore";
import { useHostGame } from "@/hooks/useGame";
import { useAuthStore } from "@/stores/authStore";
import { gameApi } from "@/lib/api";
import { useI18n, plural } from "@/i18n";
import { getAvatarColor } from "@/lib/utils";
export default function HostLobby() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((s) => s.token);
    const { data: _session } = useQuery({
        queryKey: ["session", sessionId],
        queryFn: () => gameApi.lookupByCode(""),
        enabled: false,
    });
    // We need the room code — get it from the session
    const { data: sessionData } = useQuery({
        queryKey: ["session-data", sessionId],
        queryFn: async () => {
            const sessions = await gameApi.listSessions();
            return sessions.find((s) => s.id === sessionId);
        },
        enabled: !!sessionId,
    });
    const roomCode = sessionData?.room_code ?? "";
    useEffect(() => {
        if (sessionId && roomCode) {
            initHostGame(sessionId, roomCode);
        }
    }, [sessionId, roomCode]);
    const store = useGameStore();
    const { status, send } = useHostGame({
        sessionId: sessionId,
        roomCode,
        token,
    });
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    const players = store.role === "host" ? store.players : [];
    void store.phase;
    const handleStart = () => {
        if (store.role === "host" && store.players.length === 0)
            return;
        send({ type: "start_game" });
        navigate(`/host/${sessionId}/game`);
    };
    const copyCode = () => {
        void navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    if (!roomCode) {
        return _jsx("div", { className: "text-center py-20 text-white/40", children: t.common.loading });
    }
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex flex-col items-center py-12 px-4", children: _jsxs("div", { className: "w-full max-w-2xl space-y-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-white/70 text-sm font-medium mb-1", children: t.lobby.share_hint }), _jsxs("p", { className: "text-white font-medium text-lg mb-2", children: [location.origin, "/join"] }), _jsxs("div", { className: "inline-flex items-center gap-3 bg-white/10 backdrop-blur rounded-3xl px-8 py-4", children: [_jsx("span", { className: "font-display font-extrabold text-5xl text-white tracking-widest", children: roomCode }), _jsx("button", { onClick: copyCode, "aria-label": t.lobby.copy_code, className: "p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition", children: copied ? _jsx(Check, { size: 20, "aria-hidden": true }) : _jsx(Copy, { size: 20, "aria-hidden": true }) })] })] }), _jsxs("div", { className: "bg-white/10 backdrop-blur rounded-3xl p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h2", { className: "text-white font-semibold flex items-center gap-2", children: [_jsx(Users, { size: 18, "aria-hidden": true }), plural(t.lobby, "players", players.length)] }), _jsx("span", { className: `text-xs font-medium px-2 py-1 rounded-full ${status === "open"
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : "bg-yellow-500/20 text-yellow-300"}`, children: status === "open" ? "Connected" : status })] }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 min-h-[80px]", children: [_jsx(AnimatePresence, { children: players.map((p) => (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.6 }, className: "flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2", children: [_jsx("div", { className: `w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${p.avatarEmoji ? "" : getAvatarColor(p.id)} text-white`, "aria-hidden": true, children: p.avatarEmoji ?? p.displayName[0]?.toUpperCase() }), _jsx("span", { className: "text-white text-sm font-medium truncate", children: p.displayName })] }, p.id))) }), players.length === 0 && (_jsx("div", { className: "col-span-3 text-center text-white/40 py-4 text-sm", children: t.lobby.players_zero }))] })] }), _jsxs(Button, { size: "xl", fullWidth: true, className: "bg-accent-500 hover:bg-accent-600 text-white shadow-xl text-xl", onClick: handleStart, disabled: players.length === 0 || status !== "open", children: [_jsx(Play, { size: 24, "aria-hidden": true }), t.lobby.start_game, " \u2014 ", plural(t.lobby, "players", players.length)] })] }) }));
}
