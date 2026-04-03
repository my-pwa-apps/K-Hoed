import { motion, AnimatePresence } from "framer-motion";
import { useReactionStore } from "@/stores/reactionStore";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

/**
 * Floating GIF reactions that bubble up from the bottom of the host screen.
 * Up to 4 are shown at once; each auto-dismisses after 6 s.
 */
export function ReactionOverlay() {
  const reactions = useReactionStore((s) => s.reactions);
  const visible = reactions.filter((r) => Date.now() - r.receivedAt < 8_000).slice(-4);

  return (
    <div className="pointer-events-none fixed bottom-8 right-6 flex flex-col-reverse gap-3 z-50">
      <AnimatePresence mode="popLayout">
        {visible.map((r) => (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, y: 60, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, x: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="flex flex-col items-end gap-1"
          >
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full px-2 py-0.5">
              <PlayerAvatar value={r.avatarEmoji} name={r.displayName} size="xs" />
              <span className="font-semibold max-w-[80px] truncate">{r.displayName}</span>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/20 bg-black/40">
              <img
                src={r.gifUrl}
                alt={r.caption ?? ""}
                className="w-32 h-32 object-cover"
              />
              {r.caption && (
                <div className="max-w-32 px-2 py-1 text-[11px] leading-4 text-white/90 break-words">
                  {r.caption}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
