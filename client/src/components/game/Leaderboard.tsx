import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string;
  compact?: boolean;
}

export function Leaderboard({
  entries,
  currentPlayerId,
  compact = false,
}: LeaderboardProps) {
  const top = compact ? entries.slice(0, 5) : entries;

  return (
    <div className="w-full space-y-2">
      <AnimatePresence mode="popLayout">
        {top.map((entry, i) => (
          <motion.div
            key={entry.playerId}
            layout
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 font-medium",
              entry.playerId === currentPlayerId
                ? "bg-brand-100 border-2 border-brand-400 text-brand-900"
                : "bg-white border border-gray-100 shadow-sm text-gray-800",
              i === 0 && "bg-amber-50 border-amber-300",
            )}
          >
            {/* Rank */}
            <div className="w-8 shrink-0 text-center">
              {i === 0 ? (
                <Crown className="text-amber-500 mx-auto" size={20} />
              ) : (
                <span className="text-sm font-bold text-gray-500">#{entry.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <PlayerAvatar
              value={entry.avatarEmoji ?? ""}
              playerId={entry.playerId}
              name={entry.displayName}
              size="md"
              aria-hidden
            />

            {/* Name */}
            <span className="flex-1 truncate text-sm font-semibold">{entry.displayName}</span>

            {/* Score */}
            <span className="font-bold tabular-nums text-base shrink-0">
              {entry.score.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {compact && entries.length > 5 && (
        <p className="text-center text-sm text-gray-500">
          +{entries.length - 5} more players
        </p>
      )}
    </div>
  );
}

/** Podium display for the top-3 at game end */
export function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const top3 = entries.slice(0, 3);
  const [first, second, third] = [top3[0], top3[1], top3[2]];

  const order = [second, first, third].filter(Boolean) as LeaderboardEntry[];

  return (
    <div className="flex items-end justify-center gap-4 pt-8">
      {order.map((entry) => {
        const isFirst = entry.rank === 1;
        const height = isFirst ? "h-36" : entry.rank === 2 ? "h-28" : "h-20";
        const bgColor = isFirst
          ? "bg-amber-400"
          : entry.rank === 2
          ? "bg-gray-300"
          : "bg-amber-700/60";

        return (
          <motion.div
            key={entry.playerId}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: entry.rank * 0.15, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center gap-2"
          >
            <PlayerAvatar
              value={entry.avatarEmoji ?? ""}
              playerId={entry.playerId}
              name={entry.displayName}
              size="lg"
            />
            <span className="text-sm font-semibold text-gray-800 text-center max-w-[80px] truncate">
              {entry.displayName}
            </span>
            <span className="text-xs font-bold text-gray-600">
              {entry.score.toLocaleString()}
            </span>
            <div
              className={cn(
                "w-20 rounded-t-2xl flex items-start justify-center pt-2 text-white font-bold text-xl",
                bgColor,
                height,
              )}
            >
              {entry.rank === 1 ? (
                <Crown size={24} className="text-white" />
              ) : (
                `#${entry.rank}`
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
