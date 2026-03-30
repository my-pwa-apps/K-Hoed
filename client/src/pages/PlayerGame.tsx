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

interface LocationState {
  sessionId: string;
  roomCode: string;
}

export default function PlayerGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const store = useGameStore();

  useEffect(() => {
    if (!state?.sessionId) navigate("/join", { replace: true });
  }, [state, navigate]);

  const { status, send } = usePlayerGame({
    sessionId: state?.sessionId ?? "",
    roomCode: state?.roomCode ?? "",
    displayName: store.role === "player" ? store.displayName : "",
    playerId: store.role === "player" ? store.playerId : "",
  });

  if (store.role !== "player") return null;

  const {
    phase,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    questionStartTime,
    timeLimit,
    selectedAnswerIds,
    answerSubmitted,
    lastResult,
    leaderboard,
    totalScore,
    playerId,
  } = store;

  const handleSelectAnswer = (answerId: string) => {
    if (answerSubmitted || phase !== "question") return;
    store.selectAnswer(answerId);
  };

  const handleSubmit = () => {
    if (!currentQuestion || answerSubmitted || selectedAnswerIds.length === 0) return;
    send({
      type: "submit_answer",
      questionId: currentQuestion.id,
      answerIds: selectedAnswerIds,
      clientTimestamp: Date.now(),
    });
  };

  // Auto-submit for single-answer questions on selection
  useEffect(() => {
    if (
      currentQuestion &&
      !answerSubmitted &&
      selectedAnswerIds.length === 1 &&
      (currentQuestion.type === "classic" || currentQuestion.type === "truefalse")
    ) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnswerIds]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          {currentQuestionIndex >= 0
            ? `Question ${currentQuestionIndex + 1} / ${totalQuestions}`
            : "Waiting…"}
        </span>
        <span className="font-bold text-brand-600 tabular-nums">
          {totalScore.toLocaleString()} pts
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 gap-4 max-w-lg mx-auto w-full">

        {/* LOBBY */}
        {phase === "lobby" && (
          <div className="flex flex-col items-center justify-center flex-1 text-center gap-4">
            <div className="animate-pulse text-5xl">⏳</div>
            <h2 className="font-display font-bold text-2xl text-gray-800">
              Get ready!
            </h2>
            <p className="text-gray-500">Waiting for host to start…</p>
            {status !== "open" && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <Clock size={12} /> Reconnecting…
              </p>
            )}
          </div>
        )}

        {/* QUESTION phase */}
        {phase === "question" && currentQuestion && (
          <>
            <div className="w-full flex items-center justify-between">
              <Timer
                timeLimit={timeLimit}
                startTime={questionStartTime}
                size={60}
                onExpire={() => {
                  if (!answerSubmitted) {
                    // Time expired — submit empty to mark as missed
                  }
                }}
              />
              <div className="flex-1 px-4">
                {currentQuestion.imageUrl && (
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question illustration"
                    className="max-h-28 mx-auto rounded-xl object-cover mb-2"
                  />
                )}
                <p className="font-display font-bold text-xl text-gray-900 text-center">
                  {currentQuestion.text}
                </p>
              </div>
            </div>

            <div
              className={`grid gap-3 w-full ${
                currentQuestion.answerOptions.length <= 2 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {currentQuestion.answerOptions.map((opt, i) => {
                const color = ANSWER_COLORS[i % ANSWER_COLORS.length]!;
                const selected = selectedAnswerIds.includes(opt.id);
                return (
                  <motion.button
                    key={opt.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSelectAnswer(opt.id)}
                    disabled={answerSubmitted}
                    aria-pressed={selected}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-5 font-semibold text-white text-left w-full
                      transition-all duration-150 min-h-[72px]
                      ${color.bg} ${selected ? "ring-4 ring-white/60 brightness-110" : ""}
                      ${answerSubmitted ? "opacity-50 cursor-not-allowed" : color.hover}
                    `}
                  >
                    <span className="text-2xl shrink-0">{ANSWER_SHAPES[i]}</span>
                    <span className="text-base leading-snug">{opt.text}</span>
                  </motion.button>
                );
              })}
            </div>

            {currentQuestion.type === "multiple" && !answerSubmitted && (
              <Button
                fullWidth
                size="lg"
                disabled={selectedAnswerIds.length < 2}
                onClick={handleSubmit}
              >
                Submit answers ({selectedAnswerIds.length} selected)
              </Button>
            )}
          </>
        )}

        {/* REVEALING phase — show result */}
        {phase === "revealing" && currentQuestion && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center flex-1 gap-6 text-center"
            >
              {lastResult ? (
                <>
                  {lastResult.correct ? (
                    <CheckCircle size={72} className="text-emerald-500" />
                  ) : (
                    <XCircle size={72} className="text-rose-500" />
                  )}
                  <div>
                    <p className="font-display font-extrabold text-4xl text-gray-900">
                      {lastResult.correct ? "Correct! 🎉" : "Wrong!"}
                    </p>
                    {lastResult.correct && (
                      <p className="text-2xl font-bold text-brand-600 mt-2">
                        +{lastResult.pointsEarned.toLocaleString()} pts
                      </p>
                    )}
                  </div>
                  <p className="text-gray-500 font-medium">
                    Total: <strong className="text-gray-800">{lastResult.totalScore.toLocaleString()}</strong>
                  </p>
                </>
              ) : (
                <div className="text-center text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Time's up — waiting for results…</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* LEADERBOARD */}
        {phase === "leaderboard" && (
          <div className="w-full space-y-4">
            <h2 className="font-display font-bold text-2xl text-center text-gray-900">
              Leaderboard
            </h2>
            <Leaderboard entries={leaderboard} currentPlayerId={playerId} compact />
          </div>
        )}

        {/* ENDED */}
        {phase === "ended" && (
          <div className="w-full space-y-6 flex flex-col items-center">
            <h2 className="font-display font-bold text-3xl text-gray-900 text-center">
              Game over! 🎊
            </h2>
            <Leaderboard entries={leaderboard} currentPlayerId={playerId} />
            <Button fullWidth size="lg" onClick={() => navigate("/join")}>
              Play again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
