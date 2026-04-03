import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, MessageSquare, X } from "lucide-react";
import { useReactionStore } from "@/stores/reactionStore";
import { useI18n } from "@/i18n";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
// ─────────────────────────────────────────────────────────────────────────────
// Tenor v1 API (public demo key — replace with your own from tenor.com)
// https://tenor.com/gifapi/documentation
// ─────────────────────────────────────────────────────────────────────────────
const TENOR_KEY = "LIVDSRZULELA";
async function searchGifs(query, limit = 12) {
    const url = new URL(query.trim() === "" ? "https://g.tenor.com/v1/trending" : "https://g.tenor.com/v1/search");
    url.searchParams.set("key", TENOR_KEY);
    if (query.trim() !== "") {
        url.searchParams.set("q", query);
    }
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("contentfilter", "low");
    url.searchParams.set("media_filter", "minimal");
    url.searchParams.set("ar_range", "all");
    const res = await fetch(url.toString());
    if (!res.ok)
        return [];
    const json = (await res.json());
    return json.results.map((g) => ({
        id: g.id,
        url: g.media[0]?.tinygif?.url ?? g.media[0]?.gif?.url ?? "",
        title: g.title,
    })).filter((g) => g.url);
}
export function GiphyChat({ send, variant = "player" }) {
    const { t } = useI18n();
    const reactions = useReactionStore((s) => s.reactions);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastSent, setLastSent] = useState(0);
    const inputRef = useRef(null);
    const search = useCallback(async (q) => {
        setLoading(true);
        try {
            const gifs = await searchGifs(q);
            setResults(gifs);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Fetch trending on open
    useEffect(() => {
        if (variant === "player" && open && results.length === 0) {
            void search("");
        }
    }, [open, variant, results.length, search]);
    const sendGif = useCallback((gif) => {
        // Rate-limit: max 1 gif per 3 seconds
        if (Date.now() - lastSent < 3000)
            return;
        send({ type: "send_reaction", gifUrl: gif.url, caption: gif.title });
        setLastSent(Date.now());
        setOpen(false);
    }, [send, lastSent]);
    const panel = (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.92, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.92, y: 8 }, className: [
            "bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col",
            variant === "player"
                ? "fixed bottom-20 right-4 w-80 z-50 max-h-[70vh]"
                : "w-full h-full border-0 shadow-none",
        ].join(" "), children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0", children: [_jsx("span", { className: "font-semibold text-gray-800 text-sm", children: variant === "player" ? t.chat.search_gif : "GIF feed" }), variant === "player" && (_jsx("button", { onClick: () => setOpen(false), "aria-label": "Close", className: "p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100", children: _jsx(X, { size: 16 }) }))] }), variant === "player" && (_jsxs(_Fragment, { children: [_jsx("div", { className: "px-3 py-2 border-b border-gray-100 shrink-0", children: _jsxs("form", { onSubmit: (e) => {
                                e.preventDefault();
                                void search(query);
                            }, className: "relative", children: [_jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" }), _jsx("input", { ref: inputRef, value: query, onChange: (e) => setQuery(e.target.value), placeholder: t.chat.search_placeholder, className: "w-full pl-8 pr-10 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400" }), _jsx("button", { type: "submit", "aria-label": t.chat.search_gif, className: "absolute right-2 top-1/2 -translate-y-1/2 p-1 text-brand-600 hover:text-brand-800", children: _jsx(Send, { size: 14 }) })] }) }), _jsxs("div", { className: "overflow-y-auto flex-1 p-2", children: [loading && (_jsx("p", { className: "text-center text-xs text-gray-400 py-4", children: t.common.loading })), !loading && results.length === 0 && (_jsx("p", { className: "text-center text-xs text-gray-400 py-4", children: t.chat.search_hint })), _jsx("div", { className: "grid grid-cols-3 gap-1.5", children: results.map((gif) => (_jsx("button", { onClick: () => sendGif(gif), "aria-label": gif.title, className: "aspect-square rounded-xl overflow-hidden hover:ring-2 hover:ring-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all active:scale-95", children: _jsx("img", { src: gif.url, alt: gif.title, className: "w-full h-full object-cover", loading: "lazy" }) }, gif.id))) })] })] })), reactions.length > 0 ? (_jsx("div", { className: `px-3 py-2 shrink-0 overflow-y-auto space-y-2 ${variant === "player" ? "border-t border-gray-100 max-h-32" : "flex-1"}`, children: reactions
                    .slice()
                    .reverse()
                    .slice(0, variant === "player" ? 3 : 50)
                    .map((r) => (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-xl p-2", children: [_jsx(PlayerAvatar, { value: r.avatarEmoji, name: r.displayName, size: "sm" }), _jsx("span", { className: "font-semibold truncate max-w-[80px]", children: r.displayName }), _jsx("img", { src: r.gifUrl, alt: r.caption, className: "h-10 rounded-lg object-cover ml-auto" })] }, r.id))) })) : (variant === "host" && (_jsx("p", { className: "text-center text-xs text-gray-400 py-4", children: "No GIFs sent yet" })))] }, "panel"));
    if (variant === "host") {
        return panel;
    }
    // Player variant — floating button
    return (_jsxs(_Fragment, { children: [_jsx(AnimatePresence, { children: open && panel }), _jsxs(motion.button, { whileTap: { scale: 0.9 }, onClick: () => {
                    setOpen((v) => !v);
                    setTimeout(() => inputRef.current?.focus(), 100);
                }, "aria-label": t.chat.open, "aria-expanded": open, className: "fixed bottom-4 right-4 w-12 h-12 rounded-full bg-brand-600 text-white shadow-lg flex items-center justify-center z-40 hover:bg-brand-700 transition-colors", children: [_jsx(MessageSquare, { size: 22 }), reactions.length > 0 && (_jsx("span", { className: "absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center", children: reactions.length > 9 ? "9+" : reactions.length }))] })] }));
}
