import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { gameApi } from "@/lib/api";
import { initPlayerGame } from "@/stores/gameStore";
export default function PlayerJoin() {
    const { code: codeFromUrl } = useParams();
    const navigate = useNavigate();
    const kicked = new URLSearchParams(location.search).has("kicked");
    const [code, setCode] = useState(codeFromUrl?.toUpperCase() ?? "");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(kicked ? "You were removed from the game." : null);
    const handleJoin = async (e) => {
        e.preventDefault();
        if (!code.trim() || !displayName.trim())
            return;
        setError(null);
        setLoading(true);
        try {
            const session = await gameApi.lookupByCode(code.trim().toUpperCase());
            // Generate a persistent playerId stored in sessionStorage
            const storageKey = `player-${session.room_code}`;
            let playerId;
            try {
                const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}");
                playerId = stored.playerId ?? crypto.randomUUID();
            }
            catch {
                playerId = crypto.randomUUID();
            }
            initPlayerGame(session.session_id, session.room_code, playerId, displayName.trim());
            sessionStorage.setItem(storageKey, JSON.stringify({ playerId, displayName: displayName.trim() }));
            navigate("/play", { state: { sessionId: session.session_id, roomCode: session.room_code } });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Room not found");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-brand-950 to-accent-600 flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("span", { className: "text-6xl", "aria-hidden": true, children: "\uD83C\uDFAF" }), _jsx("h1", { className: "mt-4 font-display font-extrabold text-4xl text-white", children: "K-Hoed" }), _jsx("p", { className: "text-white/70 mt-2", children: "Enter a room code to join" })] }), _jsxs("div", { className: "bg-white rounded-3xl shadow-2xl p-8 space-y-4", children: [error && (_jsxs("div", { className: "flex items-start gap-2 text-sm text-danger-600 bg-danger-50 rounded-xl p-3", children: [_jsx(AlertCircle, { size: 16, className: "shrink-0 mt-0.5" }), error] })), _jsxs("form", { onSubmit: handleJoin, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "label", htmlFor: "room-code", children: "Room code" }), _jsx("input", { id: "room-code", type: "text", className: "input text-2xl font-mono font-bold tracking-widest uppercase text-center", placeholder: "ABCD12", maxLength: 6, required: true, value: code, onChange: (e) => setCode(e.target.value.toUpperCase()), "aria-describedby": "room-code-hint" }), _jsx("p", { id: "room-code-hint", className: "mt-1 text-xs text-gray-400 text-center", children: "Get the code from your host" })] }), _jsx(Input, { label: "Your nickname", type: "text", required: true, placeholder: "e.g. QuizWizard", maxLength: 30, value: displayName, onChange: (e) => setDisplayName(e.target.value) }), _jsxs(Button, { type: "submit", fullWidth: true, size: "lg", loading: loading, children: ["Join game", _jsx(ArrowRight, { size: 18 })] })] })] })] }) }));
}
