import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { CheckCircle, XCircle, Clock, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/game/Timer";
import { Leaderboard, Podium } from "@/components/game/Leaderboard";
import { GiphyChat } from "@/components/game/GiphyChat";
import { useGameStore } from "@/stores/gameStore";
import { usePlayerGame } from "@/hooks/useGame";
import { useI18n } from "@/i18n";
import { ANSWER_COLORS, ANSWER_SHAPES } from "@/lib/utils";

interface LocationState {
  sessionId: string;
  roomCode: string;
}

export default function PlayerGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { t, interp } = useI18n();

  // Local state for new question types
  const [textAnswer, setTextAnswer] = useState("");
  const [sliderVal, setSliderVal] = useState<number | null>(null);
  const [puzzleItems, setPuzzleItems] = useState<{ id: string; text: string }[]>([]);
  const [pinCoords, setPinCoords] = useState<{ x: number; y: number } | null>(null);
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

  // Reset per-type state when question changes
  useEffect(() => {
    if (!currentQuestion) return;
    setTextAnswer("");
    setSliderVal(null);
    setPinCoords(null);
    if (currentQuestion.type === "puzzle") {
      setPuzzleItems([...currentQuestion.answerOptions]);
    } else {
      setPuzzleItems([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  const handleSelectAnswer = (answerId: string) => {
    if (answerSubmitted || phase !== "question") return;
    store.selectAnswer(answerId);
  };

  const handleSubmit = () => {
    if (!currentQuestion || answerSubmitted) return;
    const base = { type: "submit_answer" as const, questionId: currentQuestion.id, clientTimestamp: Date.now() };
    switch (currentQuestion.type) {
      case "classic":
      case "multiple":
      case "truefalse":
        if (selectedAnswerIds.length === 0) return;
        send({ ...base, answerIds: selectedAnswerIds });
        break;
      case "puzzle":
        send({ ...base, answerIds: puzzleItems.map((it) => it.id) });
        break;
      case "typeanswer":
        if (!textAnswer.trim()) return;
        send({ ...base, answerText: textAnswer.trim() });
        break;
      case "slider":
        if (sliderVal === null) return;
        send({ ...base, sliderValue: sliderVal });
        break;
      case "pinanswer":
        if (!pinCoords) return;
        send({ ...base, pinCoords });
        break;
    }
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

  const isClassicType = currentQuestion?.type === "classic" ||
    currentQuestion?.type === "multiple" ||
    currentQuestion?.type === "truefalse";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          {currentQuestionIndex >= 0
            ? interp(t.player_game.question_progress, {
                n: currentQuestionIndex + 1,
                m: totalQuestions,
              })
            : "…"}
        </span>
        <span className="font-bold text-brand-600 tabular-nums">
          {totalScore.toLocaleString()}&nbsp;{t.player_game.pts}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 gap-4 max-w-lg mx-auto w-full">

        {/* ── LOBBY phase ── */}
        {phase === "lobby" && (
          <div className="flex flex-col items-center justify-center flex-1 text-center gap-4">
            <div className="animate-pulse text-5xl" aria-hidden="true">⏳</div>
            <h2 className="font-display font-bold text-2xl text-gray-800">
              {t.player_game.waiting_title}
            </h2>
            <p className="text-gray-500">{t.player_game.waiting_sub}</p>
            {status !== "open" && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <Clock size={12} aria-hidden="true" /> {t.player_game.reconnecting}
              </p>
            )}
          </div>
        )}

        {/* ── QUESTION phase ── */}
        {phase === "question" && currentQuestion && (
          <>
            <div className="w-full flex items-start gap-3">
              <Timer
                timeLimit={timeLimit}
                startTime={questionStartTime}
                size={60}
                onExpire={() => {
                  // Server will advance phase via alarm; client does nothing
                }}
              />
              <div className="flex-1">
                {currentQuestion.imageUrl && (
                  <img
                    src={currentQuestion.imageUrl}
                    alt=""
                    className="max-h-28 mx-auto rounded-xl object-cover mb-2"
                  />
                )}
                <p className="font-display font-bold text-xl text-gray-900 text-center leading-snug">
                  {currentQuestion.text}
                </p>
              </div>
            </div>

            {/* Classic / multiple / truefalse answer grid */}
            {isClassicType && (
              <>
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
                        aria-label={opt.text}
                        className={[
                          "flex items-center gap-3 rounded-2xl px-4 py-5 font-semibold text-white",
                          "text-left w-full transition-all duration-150 min-h-[72px] touch-manipulation",
                          color.bg,
                          selected ? "ring-4 ring-white/60 brightness-110 scale-[1.02]" : "",
                          answerSubmitted
                            ? "opacity-50 cursor-not-allowed"
                            : color.hover + " active:scale-95",
                        ].join(" ")}
                      >
                        <span className="text-2xl shrink-0" aria-hidden="true">{ANSWER_SHAPES[i]}</span>
                        <span className="text-base leading-snug">{opt.text}</span>
                      </motion.button>
                    );
                  })}
                </div>
                {currentQuestion.type === "multiple" && !answerSubmitted && (
                  <Button fullWidth size="lg" disabled={selectedAnswerIds.length < 2} onClick={handleSubmit}>
                    {interp(t.player_game.submit_answers, { count: selectedAnswerIds.length })}
                  </Button>
                )}
              </>
            )}

            {/* Type answer */}
            {currentQuestion.type === "typeanswer" && (
              <div className="w-full space-y-3">
                <input
                  type="text"
                  className="input w-full text-lg py-4 text-center"
                  placeholder={t.player_game.type_answer_placeholder}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  disabled={answerSubmitted}
                  autoFocus
                  aria-label="Type your answer"
                />
                <Button fullWidth size="lg" disabled={!textAnswer.trim() || answerSubmitted} onClick={handleSubmit}>
                  {t.player_game.submit}
                </Button>
              </div>
            )}

            {/* Slider */}
            {currentQuestion.type === "slider" && currentQuestion.sliderConfig && (
              <div className="w-full space-y-4">
                <div className="text-center text-5xl font-bold text-brand-600 tabular-nums">
                  {sliderVal ?? Math.round((currentQuestion.sliderConfig.min + currentQuestion.sliderConfig.max) / 2)}
                </div>
                <input
                  type="range"
                  min={currentQuestion.sliderConfig.min}
                  max={currentQuestion.sliderConfig.max}
                  step={currentQuestion.sliderConfig.step}
                  value={sliderVal ?? Math.round((currentQuestion.sliderConfig.min + currentQuestion.sliderConfig.max) / 2)}
                  onChange={(e) => setSliderVal(Number(e.target.value))}
                  className="w-full h-4 accent-brand-500"
                  disabled={answerSubmitted}
                  aria-label="Slider answer"
                />
                <div className="flex justify-between text-sm text-gray-400 font-medium">
                  <span>{currentQuestion.sliderConfig.min}</span>
                  <span>{currentQuestion.sliderConfig.max}</span>
                </div>
                <Button fullWidth size="lg" disabled={answerSubmitted} onClick={handleSubmit}>
                  {t.player_game.submit}
                </Button>
              </div>
            )}

            {/* Puzzle — drag to reorder */}
            {currentQuestion.type === "puzzle" && (
              <div className="w-full space-y-3">
                <p className="text-center text-sm text-gray-500">{t.player_game.puzzle_hint}</p>
                <Reorder.Group
                  axis="y"
                  values={puzzleItems}
                  onReorder={setPuzzleItems}
                  className="space-y-2"
                >
                  {puzzleItems.map((item) => (
                    <Reorder.Item
                      key={item.id}
                      value={item}
                      className="flex items-center gap-3 bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing select-none"
                    >
                      <GripVertical size={20} className="text-gray-400 shrink-0" aria-hidden />
                      <span className="font-medium text-gray-800 flex-1">{item.text}</span>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                {!answerSubmitted && (
                  <Button fullWidth size="lg" onClick={handleSubmit}>
                    {t.player_game.submit}
                  </Button>
                )}
              </div>
            )}

            {/* Pin answer */}
            {currentQuestion.type === "pinanswer" && currentQuestion.imageUrl && (
              <div className="w-full space-y-3">
                <p className="text-center text-sm text-gray-500">{t.player_game.pin_hint}</p>
                <div
                  className="relative w-full rounded-2xl overflow-hidden cursor-crosshair"
                  onClick={(e) => {
                    if (answerSubmitted) return;
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    setPinCoords({ x, y });
                    // Auto-submit on click
                    if (!answerSubmitted) {
                      const base = { type: "submit_answer" as const, questionId: currentQuestion.id, clientTimestamp: Date.now() };
                      send({ ...base, pinCoords: { x, y } });
                    }
                  }}
                  role="img"
                  aria-label="Click to place your pin answer"
                >
                  <img src={currentQuestion.imageUrl} alt="" className="w-full block" />
                  {pinCoords && (
                    <div
                      className="absolute text-3xl pointer-events-none -translate-x-1/2 -translate-y-full"
                      style={{ left: `${pinCoords.x * 100}%`, top: `${pinCoords.y * 100}%` }}
                    >
                      📍
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── REVEALING phase ── */}
        {phase === "revealing" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center flex-1 gap-6 text-center"
            >
              {lastResult ? (
                <>
                  {lastResult.correct ? (
                    <CheckCircle size={80} className="text-emerald-500" aria-hidden="true" />
                  ) : (
                    <XCircle size={80} className="text-rose-500" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-display font-extrabold text-4xl text-gray-900">
                      {lastResult.correct ? t.player_game.correct : t.player_game.wrong}
                    </p>
                    {lastResult.correct && (
                      <p className="text-2xl font-bold text-brand-600 mt-2">
                        {interp(t.player_game.plus_pts, {
                          pts: lastResult.pointsEarned.toLocaleString(),
                        })}
                      </p>
                    )}
                  </div>
                  <p className="text-gray-500 font-medium">
                    {interp(t.player_game.total_score, {
                      score: lastResult.totalScore.toLocaleString(),
                    })}
                  </p>
                </>
              ) : (
                <div className="text-center text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 text-gray-300" aria-hidden="true" />
                  <p>{t.player_game.times_up}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── LEADERBOARD phase ── */}
        {phase === "leaderboard" && (
          <div className="w-full space-y-4">
            <h2 className="font-display font-bold text-2xl text-center text-gray-900">
              {t.player_game.leaderboard}
            </h2>
            <Leaderboard entries={leaderboard} currentPlayerId={playerId} compact />
          </div>
        )}

        {/* ── ENDED phase ── */}
        {phase === "ended" && (
          <div className="w-full space-y-6 flex flex-col items-center">
            <h2 className="font-display font-bold text-3xl text-gray-900 text-center">
              {t.player_game.game_over}
            </h2>
            <Podium entries={leaderboard} />
            <div className="w-full pt-2">
              <Leaderboard entries={leaderboard} currentPlayerId={playerId} />
            </div>
            <Button fullWidth size="lg" onClick={() => navigate("/join")}>
              {t.player_game.play_again}
            </Button>
          </div>
        )}
      </div>

      {/* Floating GIF chat button (player) — hidden during ended phase */}
      {phase !== "ended" && <GiphyChat send={send} variant="player" />}
    </div>
  );
}
