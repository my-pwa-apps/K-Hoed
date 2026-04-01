import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { AvatarPicker } from "@/components/game/AvatarPicker";
import { gameApi } from "@/lib/api";
import { initPlayerGame } from "@/stores/gameStore";
import { useI18n } from "@/i18n";
import { AVATARS } from "@/lib/utils";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
export default function PlayerJoin() {
    const { code: codeFromUrl } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const kicked = new URLSearchParams(location.search).has("kicked");
    const [step, setStep] = useState("info");
    // Determine if we have a localStorage-saved game session for reconnect hint
    const savedSession = (() => {
        if (codeFromUrl)
            return null;
        const keys = Object.keys(localStorage).filter((k) => k.startsWith("player-"));
        for (const key of keys) {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.playerId)
                        return { roomCode: key.replace("player-", "").toUpperCase(), displayName: parsed.displayName };
                }
                catch { /* ignore */ }
            }
        }
        return null;
    })();
    const [code, setCode] = useState(() => codeFromUrl?.toUpperCase() ?? savedSession?.roomCode ?? "");
    const [displayName, setDisplayName] = useState(() => localStorage.getItem("k-hoed-display-name") ?? "");
    const [avatar, setAvatar] = useState(() => localStorage.getItem("k-hoed-avatar")
        ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(kicked ? t.join.kicked : null);
    const handleSelectAvatar = (a) => {
        setAvatar(a);
        if (a)
            localStorage.setItem("k-hoed-avatar", a);
    };
    const goToAvatar = (e) => {
        e.preventDefault();
        if (!code.trim() || !displayName.trim())
            return;
        setStep("avatar");
    };
    const handleJoin = async () => {
        if (!avatar)
            return;
        const trimCode = code.trim().toUpperCase();
        const trimName = displayName.trim();
        setError(null);
        setLoading(true);
        try {
            const session = await gameApi.lookupByCode(trimCode);
            const storageKey = `player-${session.room_code}`;
            let playerId;
            try {
                // Use localStorage so reconnection survives browser close (e.g. dead battery)
                const raw = localStorage.getItem(storageKey);
                const stored = raw ? JSON.parse(raw) : {};
                playerId = stored.playerId ?? crypto.randomUUID();
            }
            catch {
                playerId = crypto.randomUUID();
            }
            initPlayerGame(session.session_id, session.room_code, playerId, trimName, avatar);
            localStorage.setItem(storageKey, JSON.stringify({ playerId, displayName: trimName, avatarEmoji: avatar }));
            navigate("/play", {
                state: { sessionId: session.session_id, roomCode: session.room_code },
            });
        }
        catch {
            setError(t.join.room_not_found);
            setStep("info");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-brand-950 to-accent-600 flex flex-col items-center justify-center p-4", children: [_jsx("div", { className: "absolute top-4 right-4", children: _jsx(LanguagePicker, { light: true }) }), _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("img", { src: "/logo.png", alt: "K-Hoed", className: "h-28 w-28 mx-auto object-contain" }), _jsx("h1", { className: "mt-2 font-display font-extrabold text-4xl text-white", children: "K-Hoed" }), _jsx("p", { className: "text-white/70 mt-2", children: t.join.subtitle })] }), _jsxs(AnimatePresence, { mode: "wait", children: [step === "info" && (_jsxs(motion.div, { initial: { opacity: 0, x: -30 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -30 }, className: "bg-white rounded-3xl shadow-2xl p-8 space-y-4", children: [error && (_jsxs("div", { role: "alert", className: "flex items-start gap-2 text-sm text-danger-600 bg-danger-50 rounded-xl p-3", children: [_jsx(AlertCircle, { size: 16, className: "shrink-0 mt-0.5", "aria-hidden": true }), error] })), _jsxs("form", { onSubmit: goToAvatar, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "label", htmlFor: "room-code", children: t.join.room_code_label }), _jsx("input", { id: "room-code", type: "text", inputMode: "text", autoComplete: "off", autoCapitalize: "characters", className: "input text-2xl font-mono font-bold tracking-widest uppercase text-center", placeholder: "ABCD12", maxLength: 6, required: true, value: code, onChange: (e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")), "aria-describedby": "room-code-hint" }), _jsx("p", { id: "room-code-hint", className: "mt-1 text-xs text-gray-400 text-center", children: t.join.room_code_hint }), savedSession && code.toUpperCase() === savedSession.roomCode && (_jsxs("p", { className: "mt-1 text-xs text-indigo-500 font-medium text-center", children: ["\uD83D\uDC4B Welcome back", savedSession.displayName ? `, ${savedSession.displayName}` : "", "! Tap ", _jsx("em", { children: "Next" }), " to rejoin."] }))] }), _jsx(Input, { label: t.join.nickname_label, type: "text", required: true, placeholder: t.join.nickname_placeholder, maxLength: 30, value: displayName, onChange: (e) => {
                                                    setDisplayName(e.target.value);
                                                    localStorage.setItem("k-hoed-display-name", e.target.value);
                                                } }), _jsxs(Button, { type: "submit", fullWidth: true, size: "lg", children: [t.join.next ?? "Next", _jsx(ArrowRight, { size: 18, "aria-hidden": true })] })] })] }, "info")), step === "avatar" && (_jsxs(motion.div, { initial: { opacity: 0, x: 30 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 30 }, className: "bg-white rounded-3xl shadow-2xl p-8 space-y-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", onClick: () => setStep("info"), className: "p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors", "aria-label": "Back", children: _jsx(ArrowLeft, { size: 18 }) }), _jsxs("div", { children: [_jsx("p", { className: "font-display font-bold text-lg text-gray-900", children: t.chat.pick_avatar }), _jsx("p", { className: "text-sm text-gray-500", children: displayName })] }), _jsx("span", { className: "ml-auto", children: avatar && _jsx(PlayerAvatar, { value: avatar, name: displayName, size: "lg" }) })] }), _jsx(AvatarPicker, { selected: avatar, onSelect: (a) => handleSelectAvatar(a) }), _jsx(Button, { fullWidth: true, size: "lg", onClick: handleJoin, loading: loading, disabled: !avatar, children: t.join.join_button })] }, "avatar"))] })] })] }));
}
