import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Users, BarChart3, SkipForward, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/game/Timer";
import { Leaderboard, Podium } from "@/components/game/Leaderboard";
import { AnswerDistribution } from "@/components/game/AnswerDistribution";
import { GiphyChat } from "@/components/game/GiphyChat";
import { ReactionOverlay } from "@/components/game/ReactionOverlay";
import { useGameStore, initHostGame } from "@/stores/gameStore";
import { useHostGame } from "@/hooks/useGame";
import { gameApi } from "@/lib/api";
import { JoinPanel } from "@/components/game/JoinPanel";
import { MediaEmbed } from "@/components/game/MediaEmbed";
import { useI18n } from "@/i18n";
import { ANSWER_COLORS, ANSWER_SHAPES } from "@/lib/utils";
export default function HostGame() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { t, interp } = useI18n();
    const [confirmEnd, setConfirmEnd] = useState(false);
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
    const { send } = useHostGame({ sessionId: sessionId, roomCode });
    if (store.role !== "host")
        return null;
    const { phase, currentQuestion, currentQuestionIndex, totalQuestions, questionStartTime, timeLimit, distribution, correctAnswerIds, revealData, leaderboard, answerCount, players, } = store;
    const handleForceReveal = () => {
        send({ type: "force_reveal" });
    };
    const handleNext = () => {
        if (phase === "revealing") {
            send({ type: "show_leaderboard" });
        }
        else if (phase === "leaderboard") {
            send({ type: "next_question" });
        }
    };
    const handleEnd = () => {
        setConfirmEnd(true);
    };
    const confirmEndGame = () => {
        send({ type: "end_game" });
        navigate(`/results/${sessionId}`);
    };
    const allAnswered = players.length > 0 && answerCount >= players.length;
    return (_jsxs("div", { className: "h-[100dvh] overflow-hidden bg-gradient-to-br from-brand-950 to-brand-800 text-white flex flex-col", children: [_jsx(ReactionOverlay, {}), _jsxs("div", { className: "flex items-center justify-between px-4 py-2 bg-black/20 shrink-0 gap-2 sm:gap-3", children: [_jsx("span", { className: "text-xs sm:text-sm font-medium text-white/70 shrink-0", children: interp(t.host_game.question_progress, {
                            n: currentQuestionIndex + 1,
                            m: totalQuestions,
                        }) }), phase === "question" && questionStartTime > 0 && (_jsx(Timer, { timeLimit: timeLimit, startTime: questionStartTime, size: 44 })), _jsxs("div", { className: "flex items-center gap-2 sm:gap-3 shrink-0", children: [allAnswered && phase === "question" && (_jsxs("span", { className: "hidden sm:flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded-full", children: [_jsx(CheckCircle2, { size: 12, "aria-hidden": true }), " Iedereen heeft geantwoord"] })), phase === "question" && (_jsxs("span", { className: "flex items-center gap-1 text-xs sm:text-sm text-white/60", children: [_jsx(BarChart3, { size: 12, "aria-hidden": true }), answerCount, "/", players.length] })), _jsxs("span", { className: "flex items-center gap-1 text-xs sm:text-sm text-white/60 shrink-0", children: [_jsx(Users, { size: 12, "aria-hidden": true }), players.length] })] })] }), roomCode && (_jsx("div", { className: "px-4 pt-3 shrink-0", children: _jsx(JoinPanel, { roomCode: roomCode, dark: true, compact: true }) })), _jsxs("div", { className: "flex-1 flex min-h-0", children: [_jsxs("div", { className: "flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full", children: [_jsxs("div", { className: "flex-1 overflow-y-auto px-4 py-4 space-y-4", children: [phase === "lobby" && (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-white/60", children: t.host_game.waiting }) })), (phase === "question" || phase === "revealing") && currentQuestion && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "w-full bg-white/10 rounded-2xl px-4 py-4 sm:px-5", children: [_jsx("h2", { className: "font-display font-bold text-lg sm:text-2xl text-center leading-snug text-balance", children: currentQuestion.text }), currentQuestion.imageUrl && (_jsx("img", { src: currentQuestion.imageUrl, alt: "Question illustration", className: "w-full max-h-40 sm:max-h-56 mx-auto rounded-xl object-cover mt-3" })), (currentQuestion.type === "audioclip" || currentQuestion.type === "videoclip") && currentQuestion.mediaUrl && (_jsx("div", { className: "mt-3", children: _jsx(MediaEmbed, { url: currentQuestion.mediaUrl, type: currentQuestion.type }) }))] }), (currentQuestion.type === "classic" || currentQuestion.type === "multiple" || currentQuestion.type === "truefalse") && (_jsx("div", { className: "grid grid-cols-2 gap-3 w-full", children: currentQuestion.answerOptions.map((opt, i) => {
                                                    const color = ANSWER_COLORS[i % ANSWER_COLORS.length];
                                                    const isCorrect = correctAnswerIds.includes(opt.id);
                                                    const count = distribution[opt.id] ?? 0;
                                                    return (_jsxs("div", { className: `rounded-2xl p-4 flex items-center gap-3 font-semibold text-white
                      ${phase === "revealing"
                                                            ? isCorrect
                                                                ? "bg-emerald-500 ring-4 ring-emerald-300"
                                                                : "bg-white/20 opacity-60"
                                                            : `${color.bg}`}`, children: [_jsx("span", { className: "text-xl shrink-0", children: ANSWER_SHAPES[i] }), _jsx("span", { className: "flex-1 text-sm leading-snug", children: opt.text }), phase === "revealing" && (_jsx("span", { className: "font-bold text-lg", children: count }))] }, opt.id));
                                                }) })), currentQuestion.type === "puzzle" && (_jsx("div", { className: "w-full space-y-2", children: phase === "revealing" && revealData?.correctTexts ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-white/70 text-sm text-center", children: "Correct order:" }), revealData.correctTexts.map((text, i) => (_jsxs("div", { className: "flex items-center gap-3 bg-emerald-500/30 rounded-2xl px-4 py-3 text-white font-medium", children: [_jsx("span", { className: "w-7 h-7 flex items-center justify-center bg-emerald-500 rounded-full text-sm font-bold shrink-0", children: i + 1 }), _jsx("span", { children: text })] }, i))), _jsxs("div", { className: "text-white/60 text-sm text-center", children: [distribution.correct ?? 0, "/", players.length, " got it right"] })] })) : (currentQuestion.answerOptions.map((opt, i) => {
                                                    const color = ANSWER_COLORS[i % ANSWER_COLORS.length];
                                                    return (_jsxs("div", { className: `rounded-2xl p-3 flex items-center gap-3 font-medium text-white ${color.bg}`, children: [_jsx("span", { className: "text-lg shrink-0", children: "\u2261" }), _jsx("span", { className: "text-sm", children: opt.text })] }, opt.id));
                                                })) })), currentQuestion.type === "typeanswer" && phase === "revealing" && revealData?.correctTexts && (_jsxs("div", { className: "w-full bg-white rounded-3xl p-4 space-y-2", children: [_jsx("p", { className: "font-semibold text-gray-700", children: "\u2713 Accepted answers:" }), revealData.correctTexts.map((text, i) => (_jsx("div", { className: "bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2 text-emerald-800 font-medium", children: text }, i))), _jsxs("p", { className: "text-sm text-gray-400", children: [distribution[revealData.correctTexts[0]?.toLowerCase() ?? ""] ?? 0, " exact matches recorded"] })] })), currentQuestion.type === "audioclip" && phase === "revealing" && revealData?.correctTexts && (_jsxs("div", { className: "w-full bg-white rounded-3xl p-4 space-y-2", children: [_jsx("p", { className: "font-semibold text-gray-700", children: "\uD83C\uDFB5 Correct answer:" }), _jsx("div", { className: "bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2 text-emerald-800 font-medium", children: revealData.correctTexts[0] }), revealData.correctTexts[1] && (_jsxs("div", { className: "bg-amber-50 border border-amber-300 rounded-xl px-4 py-2 text-amber-800 font-medium", children: ["Artist: ", revealData.correctTexts[1]] }))] })), currentQuestion.type === "videoclip" && phase === "revealing" && revealData?.correctTexts && (_jsxs("div", { className: "w-full bg-white rounded-3xl p-4 space-y-2", children: [_jsx("p", { className: "font-semibold text-gray-700", children: "\uD83C\uDFAC Correct answer:" }), _jsx("div", { className: "bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2 text-emerald-800 font-medium", children: revealData.correctTexts[0] })] })), currentQuestion.type === "slider" && (_jsx("div", { className: "w-full bg-white rounded-3xl p-4 space-y-2", children: phase === "revealing" && revealData?.sliderCorrect !== undefined ? (_jsxs(_Fragment, { children: [_jsxs("p", { className: "font-semibold text-gray-700", children: ["Correct: ", _jsx("span", { className: "text-emerald-600", children: revealData.sliderCorrect }), _jsxs("span", { className: "text-gray-400 text-sm ml-2", children: ["(\u00B1", revealData.sliderTolerance, ")"] })] }), _jsxs("p", { className: "text-sm text-gray-400", children: [distribution.correct ?? 0, "/", players.length, " within range"] })] })) : (_jsx("p", { className: "text-white/70 text-center", children: "Waiting for slider answers\u2026" })) })), currentQuestion.type === "pinanswer" && currentQuestion.imageUrl && (_jsxs("div", { className: "w-full bg-white rounded-3xl overflow-hidden", children: [_jsxs("div", { className: "relative inline-block w-full", children: [_jsx("img", { src: currentQuestion.imageUrl, alt: "", className: "w-full block" }), phase === "revealing" && revealData?.pinHotspot && (_jsx("div", { className: "absolute rounded-full border-4 border-emerald-500 bg-emerald-500/25 pointer-events-none -translate-x-1/2 -translate-y-1/2", style: {
                                                                    left: `${revealData.pinHotspot.x * 100}%`,
                                                                    top: `${revealData.pinHotspot.y * 100}%`,
                                                                    width: `${revealData.pinHotspot.radius * 2 * 100}%`,
                                                                    aspectRatio: "1",
                                                                } }))] }), phase === "revealing" && _jsxs("p", { className: "text-sm text-gray-500 p-3 text-center", children: [distribution.correct ?? 0, "/", players.length, " hit the target"] })] })), phase === "revealing" && (currentQuestion.type === "classic" || currentQuestion.type === "multiple" || currentQuestion.type === "truefalse") && (_jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "w-full bg-white rounded-3xl p-4", children: _jsx(AnswerDistribution, { distribution: distribution, question: currentQuestion, correctAnswerIds: correctAnswerIds }) }) }))] })), phase === "leaderboard" && (_jsxs("div", { className: "w-full space-y-4", children: [_jsx("h2", { className: "font-display font-bold text-2xl text-center", children: t.host_game.leaderboard }), _jsx(Leaderboard, { entries: leaderboard, compact: true })] })), phase === "ended" && (_jsxs("div", { className: "w-full text-center space-y-4", children: [_jsx("h2", { className: "font-display font-bold text-3xl", children: t.host_game.game_over }), _jsx(Podium, { entries: leaderboard }), _jsx("div", { className: "pt-4", children: _jsx(Leaderboard, { entries: leaderboard }) })] }))] }), _jsxs("div", { className: "shrink-0 px-4 py-3 bg-black/30 border-t border-white/10 flex items-center gap-3 flex-wrap", children: [phase === "question" && (_jsxs(Button, { size: "lg", className: `w-full sm:w-auto ${allAnswered ? "bg-emerald-500 hover:bg-emerald-600" : "bg-white/20 hover:bg-white/30"}`, onClick: handleForceReveal, children: [_jsx(SkipForward, { size: 18, "aria-hidden": true }), allAnswered ? "Toon antwoord" : "Sla over"] })), (phase === "revealing" || phase === "leaderboard") && (_jsxs(Button, { size: "lg", className: "w-full sm:w-auto bg-accent-500 hover:bg-accent-600", onClick: handleNext, children: [phase === "revealing" ? t.host_game.show_leaderboard : t.host_game.next_question, _jsx(ChevronRight, { size: 20, "aria-hidden": true })] })), phase !== "lobby" && phase !== "ended" && !confirmEnd && (_jsx(Button, { variant: "ghost", className: "w-full sm:w-auto text-white/60 hover:text-white sm:ml-auto", onClick: handleEnd, children: t.host_game.end_game })), confirmEnd && (_jsxs("div", { className: "flex w-full sm:w-auto flex-wrap items-center gap-2 bg-black/40 rounded-2xl px-4 py-2", children: [_jsx("span", { className: "text-sm text-white/80", children: t.host_game.end_game_confirm }), _jsx(Button, { size: "sm", className: "bg-rose-500 hover:bg-rose-600", onClick: confirmEndGame, children: t.common.yes }), _jsx(Button, { size: "sm", variant: "ghost", className: "text-white/70", onClick: () => setConfirmEnd(false), children: t.common.cancel })] }))] })] }), phase !== "ended" && (_jsxs("div", { className: "hidden lg:flex w-80 bg-white/5 border-l border-white/10 flex-col shrink-0", children: [_jsx("p", { className: "text-xs font-semibold text-white/40 uppercase tracking-widest px-4 pt-4 pb-2", children: "GIF chat" }), _jsx("div", { className: "flex-1 min-h-0", children: _jsx(GiphyChat, { send: send, variant: "host" }) })] }))] })] }));
}
