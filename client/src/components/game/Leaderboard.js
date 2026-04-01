import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, TrendingUp, Minus, TrendingDown } from "lucide-react";
import { cn, getAvatarColor } from "@/lib/utils";
export function Leaderboard({ entries, currentPlayerId, showDelta = true, compact = false, }) {
    const top = compact ? entries.slice(0, 5) : entries;
    return (_jsxs("div", { className: "w-full space-y-2", children: [_jsx(AnimatePresence, { mode: "popLayout", children: top.map((entry, i) => (_jsxs(motion.div, { layout: true, initial: { opacity: 0, x: -20, scale: 0.95 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, scale: 0.9 }, transition: { delay: i * 0.05, type: "spring", stiffness: 300, damping: 30 }, className: cn("flex items-center gap-3 rounded-2xl px-4 py-3 font-medium", entry.playerId === currentPlayerId
                        ? "bg-brand-100 border-2 border-brand-400 text-brand-900"
                        : "bg-white border border-gray-100 shadow-sm text-gray-800", i === 0 && "bg-amber-50 border-amber-300"), children: [_jsx("div", { className: "w-8 shrink-0 text-center", children: i === 0 ? (_jsx(Crown, { className: "text-amber-500 mx-auto", size: 20 })) : (_jsxs("span", { className: "text-sm font-bold text-gray-500", children: ["#", entry.rank] })) }), _jsx("div", { className: cn("w-9 h-9 rounded-full flex items-center justify-center text-xl shrink-0", entry.avatarEmoji ? "" : getAvatarColor(entry.playerId)), "aria-hidden": true, children: entry.avatarEmoji ?? entry.displayName[0]?.toUpperCase() }), _jsx("span", { className: "flex-1 truncate text-sm font-semibold", children: entry.displayName }), showDelta && entry.delta !== 0 && (_jsx(DeltaBadge, { delta: entry.delta })), _jsx("span", { className: "font-bold tabular-nums text-base shrink-0", children: entry.score.toLocaleString() })] }, entry.playerId))) }), compact && entries.length > 5 && (_jsxs("p", { className: "text-center text-sm text-gray-500", children: ["+", entries.length - 5, " more players"] }))] }));
}
function DeltaBadge({ delta }) {
    if (delta === 0)
        return (_jsxs("span", { className: "flex items-center gap-0.5 text-gray-400 text-xs", children: [_jsx(Minus, { size: 12 }), _jsx("span", { children: "0" })] }));
    if (delta > 0)
        return (_jsxs("span", { className: "flex items-center gap-0.5 text-emerald-600 text-xs font-semibold", children: [_jsx(TrendingUp, { size: 12 }), "+", delta] }));
    return (_jsxs("span", { className: "flex items-center gap-0.5 text-rose-500 text-xs font-semibold", children: [_jsx(TrendingDown, { size: 12 }), delta] }));
}
/** Podium display for the top-3 at game end */
export function Podium({ entries }) {
    const top3 = entries.slice(0, 3);
    const [first, second, third] = [top3[0], top3[1], top3[2]];
    const order = [second, first, third].filter(Boolean);
    return (_jsx("div", { className: "flex items-end justify-center gap-4 pt-8", children: order.map((entry) => {
            const isFirst = entry.rank === 1;
            const height = isFirst ? "h-36" : entry.rank === 2 ? "h-28" : "h-20";
            const bgColor = isFirst
                ? "bg-amber-400"
                : entry.rank === 2
                    ? "bg-gray-300"
                    : "bg-amber-700/60";
            return (_jsxs(motion.div, { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, transition: { delay: entry.rank * 0.15, type: "spring", stiffness: 200 }, className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl", entry.avatarEmoji ? "" : getAvatarColor(entry.playerId)), children: entry.avatarEmoji ?? entry.displayName[0]?.toUpperCase() }), _jsx("span", { className: "text-sm font-semibold text-gray-800 text-center max-w-[80px] truncate", children: entry.displayName }), _jsx("span", { className: "text-xs font-bold text-gray-600", children: entry.score.toLocaleString() }), _jsx("div", { className: cn("w-20 rounded-t-2xl flex items-start justify-center pt-2 text-white font-bold text-xl", bgColor, height), children: entry.rank === 1 ? (_jsx(Crown, { size: 24, className: "text-white" })) : (`#${entry.rank}`) })] }, entry.playerId));
        }) }));
}
