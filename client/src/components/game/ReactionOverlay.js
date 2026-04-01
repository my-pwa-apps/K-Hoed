import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReactionStore } from "@/stores/reactionStore";
/**
 * Floating GIF reactions that bubble up from the bottom of the host screen.
 * Up to 4 are shown at once; each auto-dismisses after 6 s.
 */
export function ReactionOverlay() {
    const { reactions, pruneOld } = useReactionStore();
    // Periodic cleanup
    useEffect(() => {
        const id = setInterval(pruneOld, 2000);
        return () => clearInterval(id);
    }, [pruneOld]);
    const visible = reactions.slice(-4);
    return (_jsx("div", { className: "pointer-events-none fixed bottom-8 right-6 flex flex-col-reverse gap-3 z-50", children: _jsx(AnimatePresence, { mode: "popLayout", children: visible.map((r) => (_jsxs(motion.div, { layout: true, initial: { opacity: 0, y: 60, scale: 0.7 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 0.8, x: 40 }, transition: { type: "spring", stiffness: 300, damping: 24 }, className: "flex flex-col items-end gap-1", children: [_jsxs("div", { className: "flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full px-2 py-0.5", children: [_jsx("span", { "aria-hidden": true, children: r.avatarEmoji }), _jsx("span", { className: "font-semibold max-w-[80px] truncate", children: r.displayName })] }), _jsx("img", { src: r.gifUrl, alt: r.caption ?? "", className: "w-32 h-32 rounded-2xl object-cover shadow-xl border-2 border-white/20" })] }, r.id))) }) }));
}
