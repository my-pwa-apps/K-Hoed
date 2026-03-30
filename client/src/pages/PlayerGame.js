import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/game/Timer";
import { Leaderboard } from "@/components/game/Leaderboard";
import { useGameStore } from "@/stores/gameStore";
import { usePlayerGame } from "@/hooks/useGame";
import { ANSWER_COLORS, ANSWER_SHAPES } from "@/lib/utils";
export default function PlayerGame() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state;
    const store = useGameStore();
    useEffect(() => {
        if (!state?.sessionId)
            navigate("/join", { replace: true });
    }, [state, navigate]);
    const { status, send } = usePlayerGame({
        sessionId: state?.sessionId ?? "",
        roomCode: state?.roomCode ?? "",
        displayName: store.role === "player" ? store.displayName : "",
        playerId: store.role === "player" ? store.playerId : "",
    });
    if (store.role !== "player")
        return null;
    const { phase, currentQuestion, currentQuestionIndex, totalQuestions, questionStartTime, timeLimit, selectedAnswerIds, answerSubmitted, lastResult, leaderboard, totalScore, playerId, } = store;
    const handleSelectAnswer = (answerId) => {
        if (answerSubmitted || phase !== "question")
            return;
        store.selectAnswer(answerId);
    };
    const handleSubmit = () => {
        if (!currentQuestion || answerSubmitted || selectedAnswerIds.length === 0)
            return;
        send({
            type: "submit_answer",
            questionId: currentQuestion.id,
            answerIds: selectedAnswerIds,
            clientTimestamp: Date.now(),
        });
    };
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
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 flex flex-col", children: [_jsxs("div", { className: "bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-medium text-gray-500", children: currentQuestionIndex >= 0
                            ? `Question ${currentQuestionIndex + 1} / ${totalQuestions}`
                            : "Waiting…" }), _jsxs("span", { className: "font-bold text-brand-600 tabular-nums", children: [totalScore.toLocaleString(), " pts"] })] }), _jsxs("div", { className: "flex-1 flex flex-col items-center p-4 gap-4 max-w-lg mx-auto w-full", children: [phase === "lobby" && (_jsxs("div", { className: "flex flex-col items-center justify-center flex-1 text-center gap-4", children: [_jsx("div", { className: "animate-pulse text-5xl", children: "\u23F3" }), _jsx("h2", { className: "font-display font-bold text-2xl text-gray-800", children: "Get ready!" }), _jsx("p", { className: "text-gray-500", children: "Waiting for host to start\u2026" }), status !== "open" && (_jsxs("p", { className: "text-xs text-amber-500 flex items-center gap-1", children: [_jsx(Clock, { size: 12 }), " Reconnecting\u2026"] }))] })), phase === "question" && currentQuestion && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "w-full flex items-center justify-between", children: [_jsx(Timer, { timeLimit: timeLimit, startTime: questionStartTime, size: 60, onExpire: () => {
                                            if (!answerSubmitted) {
                                                // Time expired — submit empty to mark as missed
                                            }
                                        } }), _jsxs("div", { className: "flex-1 px-4", children: [currentQuestion.imageUrl && (_jsx("img", { src: currentQuestion.imageUrl, alt: "Question illustration", className: "max-h-28 mx-auto rounded-xl object-cover mb-2" })), _jsx("p", { className: "font-display font-bold text-xl text-gray-900 text-center", children: currentQuestion.text })] })] }), _jsx("div", { className: `grid gap-3 w-full ${currentQuestion.answerOptions.length <= 2 ? "grid-cols-1" : "grid-cols-2"}`, children: currentQuestion.answerOptions.map((opt, i) => {
                                    const color = ANSWER_COLORS[i % ANSWER_COLORS.length];
                                    const selected = selectedAnswerIds.includes(opt.id);
                                    return (_jsxs(motion.button, { whileTap: { scale: 0.96 }, onClick: () => handleSelectAnswer(opt.id), disabled: answerSubmitted, "aria-pressed": selected, className: `flex items-center gap-3 rounded-2xl px-4 py-5 font-semibold text-white text-left w-full
                      transition-all duration-150 min-h-[72px]
                      ${color.bg} ${selected ? "ring-4 ring-white/60 brightness-110" : ""}
                      ${answerSubmitted ? "opacity-50 cursor-not-allowed" : color.hover}
                    `, children: [_jsx("span", { className: "text-2xl shrink-0", children: ANSWER_SHAPES[i] }), _jsx("span", { className: "text-base leading-snug", children: opt.text })] }, opt.id));
                                }) }), currentQuestion.type === "multiple" && !answerSubmitted && (_jsxs(Button, { fullWidth: true, size: "lg", disabled: selectedAnswerIds.length < 2, onClick: handleSubmit, children: ["Submit answers (", selectedAnswerIds.length, " selected)"] }))] })), phase === "revealing" && currentQuestion && (_jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, className: "flex flex-col items-center justify-center flex-1 gap-6 text-center", children: lastResult ? (_jsxs(_Fragment, { children: [lastResult.correct ? (_jsx(CheckCircle, { size: 72, className: "text-emerald-500" })) : (_jsx(XCircle, { size: 72, className: "text-rose-500" })), _jsxs("div", { children: [_jsx("p", { className: "font-display font-extrabold text-4xl text-gray-900", children: lastResult.correct ? "Correct! 🎉" : "Wrong!" }), lastResult.correct && (_jsxs("p", { className: "text-2xl font-bold text-brand-600 mt-2", children: ["+", lastResult.pointsEarned.toLocaleString(), " pts"] }))] }), _jsxs("p", { className: "text-gray-500 font-medium", children: ["Total: ", _jsx("strong", { className: "text-gray-800", children: lastResult.totalScore.toLocaleString() })] })] })) : (_jsxs("div", { className: "text-center text-gray-500", children: [_jsx(Clock, { size: 48, className: "mx-auto mb-4 text-gray-300" }), _jsx("p", { children: "Time's up \u2014 waiting for results\u2026" })] })) }) })), phase === "leaderboard" && (_jsxs("div", { className: "w-full space-y-4", children: [_jsx("h2", { className: "font-display font-bold text-2xl text-center text-gray-900", children: "Leaderboard" }), _jsx(Leaderboard, { entries: leaderboard, currentPlayerId: playerId, compact: true })] })), phase === "ended" && (_jsxs("div", { className: "w-full space-y-6 flex flex-col items-center", children: [_jsx("h2", { className: "font-display font-bold text-3xl text-gray-900 text-center", children: "Game over! \uD83C\uDF8A" }), _jsx(Leaderboard, { entries: leaderboard, currentPlayerId: playerId }), _jsx(Button, { fullWidth: true, size: "lg", onClick: () => navigate("/join"), children: "Play again" })] }))] })] }));
}
