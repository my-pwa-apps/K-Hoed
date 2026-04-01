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
import { AVATARS, type AvatarEmoji } from "@/lib/utils";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

type Step = "info" | "avatar";

export default function PlayerJoin() {
  const { code: codeFromUrl } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const kicked = new URLSearchParams(location.search).has("kicked");

  const [step, setStep] = useState<Step>("info");

  // Determine if we have a localStorage-saved game session for reconnect hint
  const savedSession = (() => {
    if (codeFromUrl) return null;
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("player-"));
    for (const key of keys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { playerId?: string; displayName?: string };
          if (parsed.playerId) return { roomCode: key.replace("player-", "").toUpperCase(), displayName: parsed.displayName };
        } catch { /* ignore */ }
      }
    }
    return null;
  })();

  const [code, setCode] = useState<string>(
    () => codeFromUrl?.toUpperCase() ?? savedSession?.roomCode ?? "",
  );
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("k-hoed-display-name") ?? "",
  );
  const [avatar, setAvatar] = useState<AvatarEmoji | "">(
    () => (localStorage.getItem("k-hoed-avatar") as AvatarEmoji | null)
      ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]!,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(kicked ? t.join.kicked : null);

  const handleSelectAvatar = (a: AvatarEmoji | "") => {
    setAvatar(a);
    if (a) localStorage.setItem("k-hoed-avatar", a as string);
  };

  const goToAvatar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !displayName.trim()) return;
    setStep("avatar");
  };

  const handleJoin = async () => {
    if (!avatar) return;
    const trimCode = code.trim().toUpperCase();
    const trimName = displayName.trim();
    setError(null);
    setLoading(true);

    try {
      const session = await gameApi.lookupByCode(trimCode);

      const storageKey = `player-${session.room_code}`;
      let playerId: string;
      try {
        // Use localStorage so reconnection survives browser close (e.g. dead battery)
        const raw = localStorage.getItem(storageKey);
        const stored = raw ? (JSON.parse(raw) as { playerId?: string }) : {};
        playerId = stored.playerId ?? crypto.randomUUID();
      } catch {
        playerId = crypto.randomUUID();
      }

      initPlayerGame(session.session_id, session.room_code, playerId, trimName, avatar);
      localStorage.setItem(
        storageKey,
        JSON.stringify({ playerId, displayName: trimName, avatarEmoji: avatar }),
      );

      navigate("/play", {
        state: { sessionId: session.session_id, roomCode: session.room_code },
      });
    } catch {
      setError(t.join.room_not_found);
      setStep("info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 to-accent-600 flex flex-col items-center justify-center p-4">
      {/* Language picker top-right */}
      <div className="absolute top-4 right-4">
        <LanguagePicker light />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="K-Hoed" className="h-28 w-28 mx-auto object-contain" />
          <h1 className="mt-2 font-display font-extrabold text-4xl text-white">K-Hoed</h1>
          <p className="text-white/70 mt-2">{t.join.subtitle}</p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Name + Room code ── */}
          {step === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="bg-white rounded-3xl shadow-2xl p-8 space-y-4"
            >
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 text-sm text-danger-600 bg-danger-50 rounded-xl p-3"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden />
                  {error}
                </div>
              )}

              <form onSubmit={goToAvatar} className="space-y-4">
                <div>
                  <label className="label" htmlFor="room-code">
                    {t.join.room_code_label}
                  </label>
                  <input
                    id="room-code"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    className="input text-2xl font-mono font-bold tracking-widest uppercase text-center"
                    placeholder="ABCD12"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                    aria-describedby="room-code-hint"
                  />
                  <p id="room-code-hint" className="mt-1 text-xs text-gray-400 text-center">
                    {t.join.room_code_hint}
                  </p>
                  {savedSession && code.toUpperCase() === savedSession.roomCode && (
                    <p className="mt-1 text-xs text-indigo-500 font-medium text-center">
                      👋 Welcome back{savedSession.displayName ? `, ${savedSession.displayName}` : ""}! Tap <em>Next</em> to rejoin.
                    </p>
                  )}
                </div>

                <Input
                  label={t.join.nickname_label}
                  type="text"
                  required
                  placeholder={t.join.nickname_placeholder}
                  maxLength={30}
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    localStorage.setItem("k-hoed-display-name", e.target.value);
                  }}
                />

                <Button type="submit" fullWidth size="lg">
                  {t.join.next ?? "Next"}
                  <ArrowRight size={18} aria-hidden />
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Avatar picker ── */}
          {step === "avatar" && (
            <motion.div
              key="avatar"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="bg-white rounded-3xl shadow-2xl p-8 space-y-5"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep("info")}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <p className="font-display font-bold text-lg text-gray-900">
                    {t.chat.pick_avatar}
                  </p>
                  <p className="text-sm text-gray-500">{displayName}</p>
                </div>
                <span className="ml-auto">
                  {avatar && <PlayerAvatar value={avatar} name={displayName} size="lg" />}
                </span>
              </div>

              <AvatarPicker
                selected={avatar}
                onSelect={(a) => handleSelectAvatar(a)}
              />

              <Button
                fullWidth
                size="lg"
                onClick={handleJoin}
                loading={loading}
                disabled={!avatar}
              >
                {t.join.join_button}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

