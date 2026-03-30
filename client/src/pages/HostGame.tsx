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
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token)!;

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
  const { send } = useHostGame({ sessionId: sessionId!, roomCode, token });

  if (store.role !== "host") return null;

  const {
    phase,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    questionStartTime,
    timeLimit,
    distribution,
    correctAnswerIds,
    leaderboard,
    answerCount,
    players,
  } = store;

  const handleNext = () => {
    if (phase === "revealing") {
      send({ type: "show_leaderboard" });
    } else if (phase === "leaderboard") {
      send({ type: "next_question" });
    }
  };

  const handleEnd = () => {
    if (confirm("End the game now?")) {
      send({ type: "end_game" });
      navigate(`/results/${sessionId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 text-white flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/20">
        <span className="text-sm font-medium text-white/70">
          {currentQuestionIndex + 1} / {totalQuestions}
        </span>
        <span className="font-mono font-bold text-white/70 text-sm">
          {roomCode}
        </span>
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Users size={14} />
          {players.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 max-w-4xl mx-auto w-full gap-6">

        {/* LOBBY */}
        {phase === "lobby" && (
          <div className="text-center">
            <p className="text-white/60">Waiting in lobby…</p>
          </div>
        )}

        {/* QUESTION phase */}
        {(phase === "question" || phase === "revealing") && currentQuestion && (
          <>
            <div className="w-full bg-white/10 rounded-3xl p-6 text-center">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-white/60">Question {currentQuestionIndex + 1}</span>
                {phase === "question" && (
                  <Timer
                    timeLimit={timeLimit}
                    startTime={questionStartTime}
                    size={72}
                  />
                )}
                <div className="flex items-center gap-1 text-sm text-white/60">
                  <BarChart3 size={14} />
                  {answerCount} / {players.length}
                </div>
              </div>

              {currentQuestion.imageUrl && (
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question illustration"
                  className="max-h-48 mx-auto rounded-2xl object-cover mb-4"
                />
              )}

              <h2 className="font-display font-bold text-2xl sm:text-3xl text-shadow">
                {currentQuestion.text}
              </h2>
            </div>

            {/* Answer grid */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {currentQuestion.answerOptions.map((opt, i) => {
                const color = ANSWER_COLORS[i % ANSWER_COLORS.length]!;
                const isCorrect = correctAnswerIds.includes(opt.id);
                const count = distribution[opt.id] ?? 0;
                return (
                  <div
                    key={opt.id}
                    className={`rounded-2xl p-4 flex items-center gap-3 font-semibold text-white
                      ${phase === "revealing"
                        ? isCorrect
                          ? "bg-emerald-500 ring-4 ring-emerald-300"
                          : "bg-white/20 opacity-60"
                        : `${color.bg}`
                      }`}
                  >
                    <span className="text-xl shrink-0">{ANSWER_SHAPES[i]}</span>
                    <span className="flex-1 text-sm">{opt.text}</span>
                    {phase === "revealing" && (
                      <span className="font-bold text-lg">{count}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Distribution chart in revealing phase */}
            {phase === "revealing" && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-white rounded-3xl p-4"
                >
                  <AnswerDistribution
                    distribution={distribution}
                    question={currentQuestion}
                    correctAnswerIds={correctAnswerIds}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </>
        )}

        {/* LEADERBOARD phase */}
        {phase === "leaderboard" && (
          <div className="w-full space-y-4">
            <h2 className="font-display font-bold text-2xl text-center">Leaderboard</h2>
            <Leaderboard entries={leaderboard} compact />
          </div>
        )}

        {/* ENDED phase */}
        {phase === "ended" && (
          <div className="w-full text-center space-y-6">
            <h2 className="font-display font-bold text-3xl">Game over! 🎉</h2>
            <Leaderboard entries={leaderboard} />
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 mt-auto">
          {(phase === "revealing" || phase === "leaderboard") && (
            <Button
              size="lg"
              className="bg-accent-500 hover:bg-accent-600"
              onClick={handleNext}
            >
              {phase === "revealing" ? "Show Leaderboard" : "Next Question"}
              <ChevronRight size={20} />
            </Button>
          )}
          {phase !== "lobby" && phase !== "ended" && (
            <Button variant="ghost" className="text-white/60 hover:text-white" onClick={handleEnd}>
              End game
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
