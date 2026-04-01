import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
/** Merge Tailwind classes safely */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
/** Format a duration in seconds to mm:ss */
export function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0)
        return `${s}s`;
    return `${m}m ${s}s`;
}
/** Return a colour class for an answer option by index (4 canonical colours) */
export const ANSWER_COLORS = [
    { bg: "bg-rose-500", hover: "hover:bg-rose-600", light: "bg-rose-100", text: "text-rose-700" },
    { bg: "bg-blue-500", hover: "hover:bg-blue-600", light: "bg-blue-100", text: "text-blue-700" },
    {
        bg: "bg-amber-500",
        hover: "hover:bg-amber-600",
        light: "bg-amber-100",
        text: "text-amber-700",
    },
    {
        bg: "bg-emerald-500",
        hover: "hover:bg-emerald-600",
        light: "bg-emerald-100",
        text: "text-emerald-700",
    },
    {
        bg: "bg-purple-500",
        hover: "hover:bg-purple-600",
        light: "bg-purple-100",
        text: "text-purple-700",
    },
    {
        bg: "bg-teal-500",
        hover: "hover:bg-teal-600",
        light: "bg-teal-100",
        text: "text-teal-700",
    },
];
export const ANSWER_SHAPES = ["■", "●", "▲", "★", "◆", "♥"];
/** Clamp a number between min and max */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
/** Pluralise helper */
export function pluralise(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}
/** Generate a random colour for player avatars */
export const AVATAR_COLORS = [
    "bg-rose-400",
    "bg-orange-400",
    "bg-amber-400",
    "bg-lime-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
];
export function getAvatarColor(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
/** Avatar categories — each uses a different DiceBear style */
export const AVATAR_CATEGORIES = [
    {
        id: "characters",
        label: "Characters",
        icon: "🌟",
        avatars: [
            "adventurer:Luna", "adventurer:Max", "adventurer:Nova", "adventurer:Pixel",
            "adventurer:Sage", "adventurer:Storm", "adventurer:Ember", "adventurer:Blaze",
            "adventurer:Comet", "adventurer:River", "adventurer:Skye", "adventurer:Zara",
            "adventurer:Indigo", "adventurer:Felix",
        ],
    },
    {
        id: "animals",
        label: "Animals",
        icon: "🐾",
        avatars: [
            "🐼", "🦊", "🐸", "🐨",
            "🐯", "🦁", "🐻", "🐺",
            "🦋", "🐙", "🦄", "🐲",
            "🐹", "🐱",
        ],
    },
    {
        id: "robots",
        label: "Robots",
        icon: "🤖",
        avatars: [
            "bottts:Aneka", "bottts:Atlas", "bottts:Cosmo", "bottts:Dusk",
            "bottts:Echo", "bottts:Felix", "bottts:Frost", "bottts:Mochi",
            "bottts:Nova", "bottts:Orion", "bottts:Qubit", "bottts:Spark",
            "bottts:Titan", "bottts:Vega",
        ],
    },
    {
        id: "pixel",
        label: "Pixel Art",
        icon: "👾",
        avatars: [
            "pixel-art:Rio", "pixel-art:Ace", "pixel-art:Tide", "pixel-art:Zara",
            "pixel-art:Zen", "pixel-art:Swift", "pixel-art:Neon", "pixel-art:Spark",
            "pixel-art:Blaze", "pixel-art:Comet", "pixel-art:Luna", "pixel-art:Max",
            "pixel-art:Nova", "pixel-art:Storm",
        ],
    },
    {
        id: "fashion",
        label: "Hats & Caps",
        icon: "🎩",
        avatars: [
            "avataaars:Pixel", "avataaars:Luna", "avataaars:Max", "avataaars:Sage",
            "avataaars:Nova", "avataaars:Ember", "avataaars:Storm", "avataaars:Blaze",
            "avataaars:Comet", "avataaars:Tide", "avataaars:River", "avataaars:Skye",
            "avataaars:Felix", "avataaars:Mochi",
        ],
    },
    {
        id: "doodle",
        label: "Doodle",
        icon: "✏️",
        avatars: [
            "croodles:Aneka", "croodles:Atlas", "croodles:Cosmo", "croodles:Dusk",
            "croodles:Echo", "croodles:Felix", "croodles:Frost", "croodles:Mochi",
            "croodles:Nova", "croodles:Orion", "croodles:Spark", "croodles:Titan",
            "croodles:River", "croodles:Skye",
        ],
    },
    {
        id: "illustrated",
        label: "Illustrated",
        icon: "🎨",
        avatars: [
            "micah:Rio", "micah:Ace", "micah:Tide", "micah:Zara",
            "micah:Zen", "micah:Swift", "micah:Neon", "micah:Spark",
            "micah:Blaze", "micah:Comet", "micah:Luna", "micah:Max",
            "micah:Nova", "micah:Storm",
        ],
    },
    {
        id: "woodland",
        label: "Woodland",
        icon: "🌿",
        avatars: [
            "lorelei:Acorn", "lorelei:Birch", "lorelei:Cedar", "lorelei:Daisy",
            "lorelei:Elm", "lorelei:Fern", "lorelei:Grove", "lorelei:Hazel",
            "lorelei:Ivy", "lorelei:Juniper", "lorelei:Kestrel", "lorelei:Larch",
            "lorelei:Maple", "lorelei:Nettle",
        ],
    },
];
/** Flat list of all avatar IDs across every category */
export const AVATARS = AVATAR_CATEGORIES.flatMap((c) => [...c.avatars]);
/**
 * Build a DiceBear URL.
 * Accepts "style:seed" (new format) or a bare seed string (legacy adventurer).
 */
export function getAvatarUrl(avatar) {
    const bg = "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";
    if (avatar.includes(":")) {
        const colon = avatar.indexOf(":");
        const style = avatar.slice(0, colon);
        const seed = avatar.slice(colon + 1);
        return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}`;
    }
    // Legacy bare seed → adventurer
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(avatar)}&backgroundColor=${bg}`;
}
/** Returns true for DiceBear seeds (new or legacy) vs legacy emoji chars */
export function isAvatarSeed(value) {
    return /^[A-Za-z]/.test(value);
}
