import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, MessageSquare, X } from "lucide-react";
import type { ClientMessage } from "@/lib/types";
import { useReactionStore } from "@/stores/reactionStore";
import { useI18n } from "@/i18n";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

// ─────────────────────────────────────────────────────────────────────────────
// Tenor v1 API (public demo key — replace with your own from tenor.com)
// https://tenor.com/gifapi/documentation
// ─────────────────────────────────────────────────────────────────────────────
const TENOR_KEY = "LIVDSRZULELA";

interface GifResult {
  id: string;
  url: string;
  title: string;
}

async function searchGifs(query: string, limit = 12): Promise<GifResult[]> {
  const url = new URL("https://g.tenor.com/v1/search");
  url.searchParams.set("key", TENOR_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("contentfilter", "low");
  url.searchParams.set("media_filter", "minimal");
  url.searchParams.set("ar_range", "all");

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const json = (await res.json()) as {
    results: Array<{
      id: string;
      title: string;
      media: Array<{ tinygif?: { url: string }; gif?: { url: string } }>;
    }>;
  };

  return json.results.map((g) => ({
    id: g.id,
    url: g.media[0]?.tinygif?.url ?? g.media[0]?.gif?.url ?? "",
    title: g.title,
  })).filter((g) => g.url);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GiphyChatProps {
  send: (msg: ClientMessage) => void;
  /** Compact mode for player (floating button only) vs full sidebar for host */
  variant?: "player" | "host";
}

export function GiphyChat({ send, variant = "player" }: GiphyChatProps) {
  const { t } = useI18n();
  const reactions = useReactionStore((s) => s.reactions);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSent, setLastSent] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const gifs = await searchGifs(q);
      setResults(gifs);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendGif = useCallback(
    (gif: GifResult) => {
      // Rate-limit: max 1 gif per 3 seconds
      if (Date.now() - lastSent < 3000) return;
      send({ type: "send_reaction", gifUrl: gif.url, caption: gif.title });
      setLastSent(Date.now());
      setOpen(false);
    },
    [send, lastSent],
  );

  const panel = (
    <motion.div
      key="panel"
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      className={[
        "bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col",
        variant === "player"
          ? "fixed bottom-20 right-4 w-80 z-50 max-h-[70vh]"
          : "w-full h-full",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <span className="font-semibold text-gray-800 text-sm">{t.chat.search_gif}</span>
        {variant === "player" && (
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-100 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search(query);
          }}
          className="relative"
        >
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.chat.search_placeholder}
            className="w-full pl-8 pr-10 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
          />
          <button
            type="submit"
            aria-label={t.chat.search_gif}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-brand-600 hover:text-brand-800"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* GIF grid */}
      <div className="overflow-y-auto flex-1 p-2">
        {loading && (
          <p className="text-center text-xs text-gray-400 py-4">{t.common.loading}</p>
        )}
        {!loading && results.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-4">{t.chat.search_hint}</p>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          {results.map((gif) => (
            <button
              key={gif.id}
              onClick={() => sendGif(gif)}
              aria-label={gif.title}
              className="aspect-square rounded-xl overflow-hidden hover:ring-2 hover:ring-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all active:scale-95"
            >
              <img
                src={gif.url}
                alt={gif.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Recent reactions feed */}
      {reactions.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-2 shrink-0 max-h-32 overflow-y-auto space-y-1">
          {reactions
            .slice()
            .reverse()
            .slice(0, 3)
            .map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs text-gray-500">
                <PlayerAvatar value={r.avatarEmoji} name={r.displayName} size="xs" />
                <span className="font-medium truncate max-w-[80px]">{r.displayName}</span>
                <img src={r.gifUrl} alt={r.caption} className="h-8 rounded-lg object-cover" />
              </div>
            ))}
        </div>
      )}
    </motion.div>
  );

  if (variant === "host") {
    return panel;
  }

  // Player variant — floating button
  return (
    <>
      <AnimatePresence>{open && panel}</AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        aria-label={t.chat.open}
        aria-expanded={open}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-brand-600 text-white shadow-lg flex items-center justify-center z-40 hover:bg-brand-700 transition-colors"
      >
        <MessageSquare size={22} />
        {reactions.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {reactions.length > 9 ? "9+" : reactions.length}
          </span>
        )}
      </motion.button>
    </>
  );
}
