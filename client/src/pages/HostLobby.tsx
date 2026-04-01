import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGameStore, initHostGame } from "@/stores/gameStore";
import { useHostGame } from "@/hooks/useGame";
import { gameApi } from "@/lib/api";
import { useI18n, plural } from "@/i18n";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { JoinPanel } from "@/components/game/JoinPanel";

export default function HostLobby() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();;

  const { data: _session } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => gameApi.lookupByCode(""),
    enabled: false,
  });

  // We need the room code — get it from the session
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
  const { status, send } = useHostGame({
    sessionId: sessionId!,
    roomCode,
  });
  const { t } = useI18n();

  const players = store.role === "host" ? store.players : [];
  void store.phase;

  const handleStart = () => {
    if (store.role === "host" && store.players.length === 0) return;
    send({ type: "start_game" });
    navigate(`/host/${sessionId}/game`);
  };

  if (!roomCode) {
    return <div className="text-center py-20 text-white/40">{t.common.loading}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Join panel — QR code + tinyurl + room code */}
        <JoinPanel roomCode={roomCode} dark />

        {/* Player list */}
        <div className="bg-white/10 backdrop-blur rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users size={18} aria-hidden />
              {plural(t.lobby, "players", players.length)}
            </h2>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                status === "open"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-yellow-500/20 text-yellow-300"
              }`}
            >
              {status === "open" ? "Connected" : status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-h-[80px]">
            <AnimatePresence>
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2"
                >
                  <PlayerAvatar
                    value={p.avatarEmoji ?? ""}
                    playerId={p.id}
                    name={p.displayName}
                    size="sm"
                  />
                  <span className="text-white text-sm font-medium truncate">{p.displayName}</span>
                </motion.div>
              ))}
            </AnimatePresence>

            {players.length === 0 && (
              <div className="col-span-3 text-center text-white/40 py-4 text-sm">
                {t.lobby.players_zero}
              </div>
            )}
          </div>
        </div>

        {/* Start */}
        <Button
          size="xl"
          fullWidth
          className="bg-accent-500 hover:bg-accent-600 text-white shadow-xl text-xl"
          onClick={handleStart}
          disabled={players.length === 0 || status !== "open"}
        >
          <Play size={24} aria-hidden />
          {t.lobby.start_game} &mdash; {plural(t.lobby, "players", players.length)}
        </Button>
      </div>
    </div>
  );
}
