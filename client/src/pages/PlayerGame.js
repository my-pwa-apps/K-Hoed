import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { CheckCircle, XCircle, Clock, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/game/Timer";
import { Leaderboard, Podium } from "@/components/game/Leaderboard";
import { GiphyChat } from "@/components/game/GiphyChat";
import { useGameStore, initPlayerGame } from "@/stores/gameStore";
import { usePlayerGame } from "@/hooks/useGame";
import { useI18n } from "@/i18n";
import { ANSWER_COLORS, ANSWER_SHAPES } from "@/lib/utils";
import { MediaEmbed } from "@/components/game/MediaEmbed";
// ─── Main component ───────────────────────────────────────────────────────────
export default function PlayerGame() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state;
    const { t, interp } = useI18n();
    // Local state for new question types
    const [textAnswer, setTextAnswer] = useState("");
    const [textAnswer2, setTextAnswer2] = useState(""); // audioclip artist
    const [sliderVal, setSliderVal] = useState(null);
    const [puzzleItems, setPuzzleItems] = useState([]);
    const [pinCoords, setPinCoords] = useState(null);
    const store = useGameStore();
    // N1: simple Web Audio beep — avoids loading external assets
    const playTone = useCallback((freq, duration, type = "sine") => {
        try {
            const ctx = new AudioContext();
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
            void ctx.close();
        }
        catch { /* audio not available */ }
    }, []);
    useEffect(() => {
        if (!state?.sessionId || !state?.roomCode) {
            navigate("/join", { replace: true });
            return;
        }
        // Try to recover state from localStorage if lost
        if (store.role !== "player" || !store.playerId) {
            try {
                const raw = localStorage.getItem(`player-${state.roomCode}`);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.playerId && parsed.displayName) {
                        initPlayerGame(state.sessionId, state.roomCode, parsed.playerId, parsed.displayName, parsed.avatarEmoji || "😀");
                        return;
                    }
                }
            }
            catch { /* ignore parse error */ }
            navigate(`/join/${state.roomCode}`, { replace: true });
        }
    }, [state, store.role, navigate]);
    const { status, send } = usePlayerGame({
        sessionId: state?.sessionId ?? "",
        roomCode: state?.roomCode ?? "",
        displayName: store.role === "player" ? store.displayName : "",
        playerId: store.role === "player" ? store.playerId : "",
    });
    if (store.role !== "player")
        return null;
    const { phase, currentQuestion, currentQuestionIndex, totalQuestions, questionStartTime, timeLimit, selectedAnswerIds, answerSubmitted, lastResult, leaderboard, totalScore, playerId, } = store;
    // Reset per-type state when question changes
    useEffect(() => {
        if (!currentQuestion)
            return;
        setTextAnswer("");
        setTextAnswer2("");
        setSliderVal(null);
        setPinCoords(null);
        if (currentQuestion.type === "puzzle") {
            setPuzzleItems([...currentQuestion.answerOptions]);
        }
        else {
            setPuzzleItems([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuestion?.id]);
    const handleSelectAnswer = (answerId) => {
        if (answerSubmitted || phase !== "question")
            return;
        store.selectAnswer(answerId);
    };
    const handleSubmit = () => {
        if (!currentQuestion || answerSubmitted)
            return;
        // N1: haptic pulse on mobile
        navigator.vibrate?.(50);
        const base = { type: "submit_answer", questionId: currentQuestion.id, clientTimestamp: Date.now() };
        switch (currentQuestion.type) {
            case "classic":
            case "multiple":
            case "truefalse":
                if (selectedAnswerIds.length === 0)
                    return;
                send({ ...base, answerIds: selectedAnswerIds });
                break;
            case "puzzle":
                send({ ...base, answerIds: puzzleItems.map((it) => it.id) });
                break;
            case "typeanswer":
                if (!textAnswer.trim())
                    return;
                send({ ...base, answerText: textAnswer.trim() });
                break;
            case "audioclip":
                if (!textAnswer.trim())
                    return;
                send({ ...base, answerText: textAnswer.trim(), answerText2: textAnswer2.trim() || undefined });
                break;
            case "videoclip":
                if (!textAnswer.trim())
                    return;
                send({ ...base, answerText: textAnswer.trim() });
                break;
            case "slider":
                if (sliderVal === null)
                    return;
                send({ ...base, sliderValue: sliderVal });
                break;
            case "pinanswer":
                if (!pinCoords)
                    return;
                send({ ...base, pinCoords });
                break;
        }
    };
    // N1: play sound when answer result arrives
    useEffect(() => {
        if (!lastResult)
            return;
        if (lastResult.correct) {
            playTone(880, 0.15); // high ding for correct
            setTimeout(() => playTone(1100, 0.1), 130);
        }
        else {
            playTone(330, 0.25, "square"); // low buzz for wrong
        }
        navigator.vibrate?.(lastResult.correct ? [30, 30, 60] : [100]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastResult]);
    // Auto-submit for single-answer questions on selection
    useEffect(() => {
        if (currentQuestion &&
            !answerSubmitted &&
            selectedAnswerIds.length === 1 &&
            (currentQuestion.type === "classic" || currentQuestion.type === "truefalse")) {
            handleSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAnswerIds]);
    const isClassicType = currentQuestion?.type === "classic" ||
        currentQuestion?.type === "multiple" ||
        currentQuestion?.type === "truefalse";
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 flex flex-col", children: [_jsxs("div", { className: "bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-medium text-gray-500", children: currentQuestionIndex >= 0
                            ? interp(t.player_game.question_progress, {
                                n: currentQuestionIndex + 1,
                                m: totalQuestions,
                            })
                            : "…" }), _jsxs("span", { className: "font-bold text-brand-600 tabular-nums", children: [totalScore.toLocaleString(), "\u00A0", t.player_game.pts] })] }), _jsxs("div", { className: "flex-1 flex flex-col items-center p-4 gap-4 max-w-lg mx-auto w-full", children: [phase === "lobby" && (_jsxs("div", { className: "flex flex-col items-center justify-center flex-1 text-center gap-4", children: [_jsx("div", { className: "animate-pulse text-5xl", "aria-hidden": "true", children: "\u23F3" }), _jsx("h2", { className: "font-display font-bold text-2xl text-gray-800", children: t.player_game.waiting_title }), _jsx("p", { className: "text-gray-500", children: t.player_game.waiting_sub }), status !== "open" && (_jsxs("p", { className: "text-xs text-amber-500 flex items-center gap-1", children: [_jsx(Clock, { size: 12, "aria-hidden": "true" }), " ", t.player_game.reconnecting] }))] })), phase === "question" && currentQuestion && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "w-full space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Timer, { timeLimit: timeLimit, startTime: questionStartTime, size: 56, onExpire: () => { } }), _jsx("p", { className: "font-display font-bold text-lg text-gray-900 leading-snug flex-1", children: currentQuestion.text })] }), currentQuestion.imageUrl && (_jsx("img", { src: currentQuestion.imageUrl, alt: "", className: "max-h-28 mx-auto rounded-xl object-cover" })), (currentQuestion.type === "audioclip" || currentQuestion.type === "videoclip") && currentQuestion.mediaUrl && (_jsx(MediaEmbed, { url: currentQuestion.mediaUrl, type: currentQuestion.type }))] }), isClassicType && (_jsxs(_Fragment, { children: [_jsx("div", { className: `grid gap-3 w-full ${currentQuestion.answerOptions.length <= 2 ? "grid-cols-1" : "grid-cols-2"}`, children: currentQuestion.answerOptions.map((opt, i) => {
                                            const color = ANSWER_COLORS[i % ANSWER_COLORS.length];
                                            const selected = selectedAnswerIds.includes(opt.id);
                                            return (_jsxs(motion.button, { whileTap: { scale: 0.96 }, onClick: () => handleSelectAnswer(opt.id), disabled: answerSubmitted, "aria-pressed": selected, "aria-label": opt.text, className: [
                                                    "flex items-center gap-3 rounded-2xl px-4 py-5 font-semibold text-white",
                                                    "text-left w-full transition-all duration-150 min-h-[72px] touch-manipulation",
                                                    color.bg,
                                                    selected ? "ring-4 ring-white/60 brightness-110 scale-[1.02]" : "",
                                                    answerSubmitted
                                                        ? "opacity-50 cursor-not-allowed"
                                                        : color.hover + " active:scale-95",
                                                ].join(" "), children: [_jsx("span", { className: "text-2xl shrink-0", "aria-hidden": "true", children: ANSWER_SHAPES[i] }), _jsx("span", { className: "text-base leading-snug", children: opt.text })] }, opt.id));
                                        }) }), currentQuestion.type === "multiple" && !answerSubmitted && (_jsx(Button, { fullWidth: true, size: "lg", disabled: selectedAnswerIds.length < 2, onClick: handleSubmit, children: interp(t.player_game.submit_answers, { count: selectedAnswerIds.length }) }))] })), currentQuestion.type === "typeanswer" && (_jsxs("div", { className: "w-full space-y-3", children: [_jsx("input", { type: "text", className: "input w-full text-lg py-4 text-center", placeholder: t.player_game.type_answer_placeholder, value: textAnswer, onChange: (e) => setTextAnswer(e.target.value), onKeyDown: (e) => { if (e.key === "Enter")
                                            handleSubmit(); }, disabled: answerSubmitted, autoFocus: true, "aria-label": "Type your answer" }), _jsx(Button, { fullWidth: true, size: "lg", disabled: !textAnswer.trim() || answerSubmitted, onClick: handleSubmit, children: t.player_game.submit })] })), currentQuestion.type === "audioclip" && (_jsxs("div", { className: "w-full space-y-3", children: [_jsx("input", { type: "text", className: "input w-full text-lg py-4 text-center", placeholder: "Song title\u2026", value: textAnswer, onChange: (e) => setTextAnswer(e.target.value), onKeyDown: (e) => { if (e.key === "Enter" && !textAnswer2)
                                            handleSubmit(); }, disabled: answerSubmitted, autoFocus: true, "aria-label": "Song title" }), currentQuestion.hasArtist && (_jsx("input", { type: "text", className: "input w-full py-4 text-center border-amber-300", placeholder: `Artist name (🏅 +${currentQuestion.artistPoints ?? 500} bonus pts)`, value: textAnswer2, onChange: (e) => setTextAnswer2(e.target.value), onKeyDown: (e) => { if (e.key === "Enter")
                                            handleSubmit(); }, disabled: answerSubmitted, "aria-label": "Artist name (bonus)" })), _jsx(Button, { fullWidth: true, size: "lg", disabled: !textAnswer.trim() || answerSubmitted, onClick: handleSubmit, children: t.player_game.submit })] })), currentQuestion.type === "videoclip" && (_jsxs("div", { className: "w-full space-y-3", children: [_jsx("input", { type: "text", className: "input w-full text-lg py-4 text-center", placeholder: "Movie or series title\u2026", value: textAnswer, onChange: (e) => setTextAnswer(e.target.value), onKeyDown: (e) => { if (e.key === "Enter")
                                            handleSubmit(); }, disabled: answerSubmitted, autoFocus: true, "aria-label": "Movie or series title" }), _jsx(Button, { fullWidth: true, size: "lg", disabled: !textAnswer.trim() || answerSubmitted, onClick: handleSubmit, children: t.player_game.submit })] })), currentQuestion.type === "slider" && currentQuestion.sliderConfig && (_jsxs("div", { className: "w-full space-y-4", children: [_jsx("div", { className: "text-center text-5xl font-bold text-brand-600 tabular-nums", children: sliderVal ?? Math.round((currentQuestion.sliderConfig.min + currentQuestion.sliderConfig.max) / 2) }), _jsx("input", { type: "range", min: currentQuestion.sliderConfig.min, max: currentQuestion.sliderConfig.max, step: currentQuestion.sliderConfig.step, value: sliderVal ?? Math.round((currentQuestion.sliderConfig.min + currentQuestion.sliderConfig.max) / 2), onChange: (e) => setSliderVal(Number(e.target.value)), className: "w-full h-4 accent-brand-500", disabled: answerSubmitted, "aria-label": "Slider answer" }), _jsxs("div", { className: "flex justify-between text-sm text-gray-400 font-medium", children: [_jsx("span", { children: currentQuestion.sliderConfig.min }), _jsx("span", { children: currentQuestion.sliderConfig.max })] }), _jsx(Button, { fullWidth: true, size: "lg", disabled: answerSubmitted, onClick: handleSubmit, children: t.player_game.submit })] })), currentQuestion.type === "puzzle" && (_jsxs("div", { className: "w-full space-y-3", children: [_jsx("p", { className: "text-center text-sm text-gray-500", children: t.player_game.puzzle_hint }), _jsx(Reorder.Group, { axis: "y", values: puzzleItems, onReorder: setPuzzleItems, className: "space-y-2", children: puzzleItems.map((item) => (_jsxs(Reorder.Item, { value: item, className: "flex items-center gap-3 bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing select-none", children: [_jsx(GripVertical, { size: 20, className: "text-gray-400 shrink-0", "aria-hidden": true }), _jsx("span", { className: "font-medium text-gray-800 flex-1", children: item.text })] }, item.id))) }), !answerSubmitted && (_jsx(Button, { fullWidth: true, size: "lg", onClick: handleSubmit, children: t.player_game.submit }))] })), currentQuestion.type === "pinanswer" && currentQuestion.imageUrl && (_jsxs("div", { className: "w-full space-y-3", children: [_jsx("p", { className: "text-center text-sm text-gray-500", children: t.player_game.pin_hint }), _jsxs("div", { className: "relative w-full rounded-2xl overflow-hidden cursor-crosshair", onClick: (e) => {
                                            if (answerSubmitted)
                                                return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = (e.clientX - rect.left) / rect.width;
                                            const y = (e.clientY - rect.top) / rect.height;
                                            setPinCoords({ x, y });
                                            // Auto-submit on click
                                            if (!answerSubmitted) {
                                                const base = { type: "submit_answer", questionId: currentQuestion.id, clientTimestamp: Date.now() };
                                                send({ ...base, pinCoords: { x, y } });
                                            }
                                        }, role: "img", "aria-label": "Click to place your pin answer", children: [_jsx("img", { src: currentQuestion.imageUrl, alt: "", className: "w-full block" }), pinCoords && (_jsx("div", { className: "absolute text-3xl pointer-events-none -translate-x-1/2 -translate-y-full", style: { left: `${pinCoords.x * 100}%`, top: `${pinCoords.y * 100}%` }, children: "\uD83D\uDCCD" }))] })] }))] })), phase === "revealing" && (_jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, className: "flex flex-col items-center justify-center flex-1 gap-6 text-center", children: lastResult ? (_jsxs(_Fragment, { children: [lastResult.correct ? (_jsx(CheckCircle, { size: 80, className: "text-emerald-500", "aria-hidden": "true" })) : (_jsx(XCircle, { size: 80, className: "text-rose-500", "aria-hidden": "true" })), _jsxs("div", { children: [_jsx("p", { className: "font-display font-extrabold text-4xl text-gray-900", children: lastResult.correct ? t.player_game.correct : t.player_game.wrong }), lastResult.correct && (_jsx("p", { className: "text-2xl font-bold text-brand-600 mt-2", children: interp(t.player_game.plus_pts, {
                                                    pts: lastResult.pointsEarned.toLocaleString(),
                                                }) }))] }), _jsx("p", { className: "text-gray-500 font-medium", children: interp(t.player_game.total_score, {
                                            score: lastResult.totalScore.toLocaleString(),
                                        }) })] })) : (_jsxs("div", { className: "text-center text-gray-500", children: [_jsx(Clock, { size: 48, className: "mx-auto mb-4 text-gray-300", "aria-hidden": "true" }), _jsx("p", { children: t.player_game.times_up })] })) }) })), phase === "leaderboard" && (_jsxs("div", { className: "w-full space-y-4", children: [_jsx("h2", { className: "font-display font-bold text-2xl text-center text-gray-900", children: t.player_game.leaderboard }), _jsx(Leaderboard, { entries: leaderboard, currentPlayerId: playerId, compact: true })] })), phase === "ended" && (_jsxs("div", { className: "w-full space-y-6 flex flex-col items-center", children: [_jsx("h2", { className: "font-display font-bold text-3xl text-gray-900 text-center", children: t.player_game.game_over }), _jsx(Podium, { entries: leaderboard }), _jsx("div", { className: "w-full pt-2", children: _jsx(Leaderboard, { entries: leaderboard, currentPlayerId: playerId }) }), _jsx(Button, { fullWidth: true, size: "lg", onClick: () => navigate("/join"), children: t.player_game.play_again })] }))] }), phase !== "ended" && _jsx(GiphyChat, { send: send, variant: "player" })] }));
}
