import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/game/Timer";
import { Leaderboard } from "@/components/game/Leaderboard";
import { AnswerDistribution } from "@/components/game/AnswerDistribution";
import { useGameStore, initHostGame } from "@/stores/gameStore";
import { useHostGame } from "@/hooks/useGame";
import { useAuthStore } from "@/stores/authStore";
import { gameApi } from "@/lib/api";
import { ANSWER_COLORS, ANSWER_SHAPES } from "@/lib/utils";
export default function HostGame() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((s) => s.token);
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
    const { send } = useHostGame({ sessionId: sessionId, roomCode, token });
    if (store.role !== "host")
        return null;
    const { phase, currentQuestion, currentQuestionIndex, totalQuestions, questionStartTime, timeLimit, distribution, correctAnswerIds, leaderboard, answerCount, players, } = store;
    const handleNext = () => {
        if (phase === "revealing") {
            send({ type: "show_leaderboard" });
        }
        else if (phase === "leaderboard") {
            send({ type: "next_question" });
        }
    };
    const handleEnd = () => {
        if (confirm("End the game now?")) {
            send({ type: "end_game" });
            navigate(`/results/${sessionId}`);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 text-white flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-3 bg-black/20", children: [_jsxs("span", { className: "text-sm font-medium text-white/70", children: [currentQuestionIndex + 1, " / ", totalQuestions] }), _jsx("span", { className: "font-mono font-bold text-white/70 text-sm", children: roomCode }), _jsxs("div", { className: "flex items-center gap-2 text-white/70 text-sm", children: [_jsx(Users, { size: 14 }), players.length] })] }), _jsxs("div", { className: "flex-1 flex flex-col items-center justify-start px-4 py-8 max-w-4xl mx-auto w-full gap-6", children: [phase === "lobby" && (_jsx("div", { className: "text-center", children: _jsx("p", { className: "text-white/60", children: "Waiting in lobby\u2026" }) })), (phase === "question" || phase === "revealing") && currentQuestion && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "w-full bg-white/10 rounded-3xl p-6 text-center", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("span", { className: "text-sm text-white/60", children: ["Question ", currentQuestionIndex + 1] }), phase === "question" && (_jsx(Timer, { timeLimit: timeLimit, startTime: questionStartTime, size: 72 })), _jsxs("div", { className: "flex items-center gap-1 text-sm text-white/60", children: [_jsx(BarChart3, { size: 14 }), answerCount, " / ", players.length] })] }), currentQuestion.imageUrl && (_jsx("img", { src: currentQuestion.imageUrl, alt: "Question illustration", className: "max-h-48 mx-auto rounded-2xl object-cover mb-4" })), _jsx("h2", { className: "font-display font-bold text-2xl sm:text-3xl text-shadow", children: currentQuestion.text })] }), _jsx("div", { className: "grid grid-cols-2 gap-3 w-full", children: currentQuestion.answerOptions.map((opt, i) => {
                                    const color = ANSWER_COLORS[i % ANSWER_COLORS.length];
                                    const isCorrect = correctAnswerIds.includes(opt.id);
                                    const count = distribution[opt.id] ?? 0;
                                    return (_jsxs("div", { className: `rounded-2xl p-4 flex items-center gap-3 font-semibold text-white
                      ${phase === "revealing"
                                            ? isCorrect
                                                ? "bg-emerald-500 ring-4 ring-emerald-300"
                                                : "bg-white/20 opacity-60"
                                            : `${color.bg}`}`, children: [_jsx("span", { className: "text-xl shrink-0", children: ANSWER_SHAPES[i] }), _jsx("span", { className: "flex-1 text-sm", children: opt.text }), phase === "revealing" && (_jsx("span", { className: "font-bold text-lg", children: count }))] }, opt.id));
                                }) }), phase === "revealing" && (_jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "w-full bg-white rounded-3xl p-4", children: _jsx(AnswerDistribution, { distribution: distribution, question: currentQuestion, correctAnswerIds: correctAnswerIds }) }) }))] })), phase === "leaderboard" && (_jsxs("div", { className: "w-full space-y-4", children: [_jsx("h2", { className: "font-display font-bold text-2xl text-center", children: "Leaderboard" }), _jsx(Leaderboard, { entries: leaderboard, compact: true })] })), phase === "ended" && (_jsxs("div", { className: "w-full text-center space-y-6", children: [_jsx("h2", { className: "font-display font-bold text-3xl", children: "Game over! \uD83C\uDF89" }), _jsx(Leaderboard, { entries: leaderboard })] })), _jsxs("div", { className: "flex gap-3 mt-auto", children: [(phase === "revealing" || phase === "leaderboard") && (_jsxs(Button, { size: "lg", className: "bg-accent-500 hover:bg-accent-600", onClick: handleNext, children: [phase === "revealing" ? "Show Leaderboard" : "Next Question", _jsx(ChevronRight, { size: 20 })] })), phase !== "lobby" && phase !== "ended" && (_jsx(Button, { variant: "ghost", className: "text-white/60 hover:text-white", onClick: handleEnd, children: "End game" }))] })] })] }));
}
