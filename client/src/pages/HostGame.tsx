import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Users, BarChart3, MessageSquare, X } from "lucide-react";
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
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, interp } = useI18n();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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
  const { send } = useHostGame({ sessionId: sessionId!, roomCode });

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
    revealData,
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
    setConfirmEnd(true);
  };

  const confirmEndGame = () => {
    send({ type: "end_game" });
    navigate(`/results/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 text-white flex flex-col">
      <ReactionOverlay />
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/20">
        <span className="text-sm font-medium text-white/70">
          {interp(t.host_game.question_progress, {
            n: currentQuestionIndex + 1,
            m: totalQuestions,
          })}
        </span>
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Users size={14} aria-hidden />
          {players.length}
        </div>
      </div>

      {/* Always-on join strip — compact QR + code visible even mid-game */}
      {roomCode && (
        <div className="px-4 pt-3">
          <JoinPanel roomCode={roomCode} dark compact />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 max-w-4xl mx-auto w-full gap-6">

        {/* LOBBY */}
        {phase === "lobby" && (
          <div className="text-center">
            <p className="text-white/60">{t.host_game.waiting}</p>
          </div>
        )}

        {/* QUESTION phase */}
        {(phase === "question" || phase === "revealing") && currentQuestion && (
          <>
            <div className="w-full bg-white/10 rounded-3xl p-6 text-center">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-white/60">
                  {interp(t.host_game.question_progress, { n: currentQuestionIndex + 1, m: totalQuestions })}
                </span>
                {phase === "question" && (
                  <Timer
                    timeLimit={timeLimit}
                    startTime={questionStartTime}
                    size={72}
                  />
                )}
                <div className="flex items-center gap-1 text-sm text-white/60">
                  <BarChart3 size={14} aria-hidden />
                  {interp(t.host_game.answer_count, { count: answerCount, total: players.length })}
                </div>
              </div>

              {currentQuestion.imageUrl && (
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question illustration"
                  className="max-h-48 mx-auto rounded-2xl object-cover mb-4"
                />
              )}

              {/* Media embed for audioclip / videoclip */}
              {(currentQuestion.type === "audioclip" || currentQuestion.type === "videoclip") && currentQuestion.mediaUrl && (
                <MediaEmbed url={currentQuestion.mediaUrl} type={currentQuestion.type} />
              )}

              <h2 className="font-display font-bold text-2xl sm:text-3xl text-shadow">
                {currentQuestion.text}
              </h2>
            </div>

            {/* Answer grid — only for choice-based types */}
            {(currentQuestion.type === "classic" || currentQuestion.type === "multiple" || currentQuestion.type === "truefalse") && (
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
            )}

            {/* Puzzle answer grid — show correct order on reveal, shuffled during question */}
            {currentQuestion.type === "puzzle" && (
              <div className="w-full space-y-2">
                {phase === "revealing" && revealData?.correctTexts ? (
                  <>
                    <p className="text-white/70 text-sm text-center">Correct order:</p>
                    {revealData.correctTexts.map((text, i) => (
                      <div key={i} className="flex items-center gap-3 bg-emerald-500/30 rounded-2xl px-4 py-3 text-white font-medium">
                        <span className="w-7 h-7 flex items-center justify-center bg-emerald-500 rounded-full text-sm font-bold shrink-0">{i + 1}</span>
                        <span>{text}</span>
                      </div>
                    ))}
                    <div className="text-white/60 text-sm text-center">{distribution.correct ?? 0}/{players.length} got it right</div>
                  </>
                ) : (
                  currentQuestion.answerOptions.map((opt, i) => {
                    const color = ANSWER_COLORS[i % ANSWER_COLORS.length]!;
                    return (
                      <div key={opt.id} className={`rounded-2xl p-3 flex items-center gap-3 font-medium text-white ${color.bg}`}>
                        <span className="text-lg shrink-0">≡</span>
                        <span className="text-sm">{opt.text}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Type answer reveal */}
            {currentQuestion.type === "typeanswer" && phase === "revealing" && revealData?.correctTexts && (
              <div className="w-full bg-white rounded-3xl p-4 space-y-2">
                <p className="font-semibold text-gray-700">✓ Accepted answers:</p>
                {revealData.correctTexts.map((text, i) => (
                  <div key={i} className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2 text-emerald-800 font-medium">{text}</div>
                ))}
                <p className="text-sm text-gray-400">{distribution[revealData.correctTexts[0]?.toLowerCase() ?? ""] ?? 0} exact matches recorded</p>
              </div>
            )}

            {/* Audioclip reveal */}
            {currentQuestion.type === "audioclip" && phase === "revealing" && revealData?.correctTexts && (
              <div className="w-full bg-white rounded-3xl p-4 space-y-2">
                <p className="font-semibold text-gray-700">🎵 Correct answer:</p>
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2 text-emerald-800 font-medium">
                  {revealData.correctTexts[0]}
                </div>
                {revealData.correctTexts[1] && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-2 text-amber-800 font-medium">
                    Artist: {revealData.correctTexts[1]}
                  </div>
                )}
              </div>
            )}

            {/* Videoclip reveal */}
            {currentQuestion.type === "videoclip" && phase === "revealing" && revealData?.correctTexts && (
              <div className="w-full bg-white rounded-3xl p-4 space-y-2">
                <p className="font-semibold text-gray-700">🎬 Correct answer:</p>
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2 text-emerald-800 font-medium">
                  {revealData.correctTexts[0]}
                </div>
              </div>
            )}

            {/* Slider reveal */}
            {currentQuestion.type === "slider" && (
              <div className="w-full bg-white rounded-3xl p-4 space-y-2">
                {phase === "revealing" && revealData?.sliderCorrect !== undefined ? (
                  <>
                    <p className="font-semibold text-gray-700">
                      Correct: <span className="text-emerald-600">{revealData.sliderCorrect}</span>
                      <span className="text-gray-400 text-sm ml-2">(±{revealData.sliderTolerance})</span>
                    </p>
                    <p className="text-sm text-gray-400">{distribution.correct ?? 0}/{players.length} within range</p>
                  </>
                ) : (
                  <p className="text-white/70 text-center">Waiting for slider answers…</p>
                )}
              </div>
            )}

            {/* Pin answer reveal */}
            {currentQuestion.type === "pinanswer" && currentQuestion.imageUrl && (
              <div className="w-full bg-white rounded-3xl overflow-hidden">
                <div className="relative inline-block w-full">
                  <img src={currentQuestion.imageUrl} alt="" className="w-full block" />
                  {phase === "revealing" && revealData?.pinHotspot && (
                    <div
                      className="absolute rounded-full border-4 border-emerald-500 bg-emerald-500/25 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${revealData.pinHotspot.x * 100}%`,
                        top: `${revealData.pinHotspot.y * 100}%`,
                        width: `${revealData.pinHotspot.radius * 2 * 100}%`,
                        aspectRatio: "1",
                      }}
                    />
                  )}
                </div>
                {phase === "revealing" && <p className="text-sm text-gray-500 p-3 text-center">{distribution.correct ?? 0}/{players.length} hit the target</p>}
              </div>
            )}

            {/* Distribution chart — only for choice-based types */}
            {phase === "revealing" && (currentQuestion.type === "classic" || currentQuestion.type === "multiple" || currentQuestion.type === "truefalse") && (
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
            <h2 className="font-display font-bold text-2xl text-center">{t.host_game.leaderboard}</h2>
            <Leaderboard entries={leaderboard} compact />
          </div>
        )}

        {/* ENDED phase */}
        {phase === "ended" && (
          <div className="w-full text-center space-y-4">
            <h2 className="font-display font-bold text-3xl">{t.host_game.game_over}</h2>
            <Podium entries={leaderboard} />
            <div className="pt-4">
              <Leaderboard entries={leaderboard} />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 mt-auto flex-wrap">
          {(phase === "revealing" || phase === "leaderboard") && (
            <Button
              size="lg"
              className="bg-accent-500 hover:bg-accent-600"
              onClick={handleNext}
            >
              {phase === "revealing" ? t.host_game.show_leaderboard : t.host_game.next_question}
              <ChevronRight size={20} aria-hidden />
            </Button>
          )}
          {phase !== "lobby" && phase !== "ended" && !confirmEnd && (
            <Button variant="ghost" className="text-white/60 hover:text-white" onClick={handleEnd}>
              {t.host_game.end_game}
            </Button>
          )}
          {/* GIF chat toggle for host */}
          {phase !== "ended" && (
            <Button
              variant="ghost"
              className="text-white/60 hover:text-white ml-auto"
              onClick={() => setChatOpen((v) => !v)}
              aria-label="GIF chat"
              aria-expanded={chatOpen}
            >
              {chatOpen ? <X size={18} aria-hidden /> : <MessageSquare size={18} aria-hidden />}
            </Button>
          )}
          {/* Inline confirm */}
          {confirmEnd && (
            <div className="flex items-center gap-2 bg-black/40 rounded-2xl px-4 py-2">
              <span className="text-sm text-white/80">{t.host_game.end_game_confirm}</span>
              <Button
                size="sm"
                className="bg-rose-500 hover:bg-rose-600"
                onClick={confirmEndGame}
              >
                {t.common.yes}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70"
                onClick={() => setConfirmEnd(false)}
              >
                {t.common.cancel}
              </Button>
            </div>
          )}
        </div>

        {/* GIF chat sidebar (slides in) */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-white z-40 shadow-2xl flex flex-col"
            >
              <GiphyChat send={send} variant="host" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
