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
/** 40 fun emoji avatars for players to choose from */
export const AVATARS = [
    // Animals
    "🦊", "🐼", "🦁", "🐯", "🐻", "🦝", "🐨", "🐸",
    "🐧", "🦉", "🦆", "🐙", "🦈", "🦋", "🐬", "🦄",
    // Food & fun
    "🍕", "🌮", "🍣", "🧁", "🍦", "🎂", "🍩", "🌈",
    // Objects
    "🚀", "🎸", "🎮", "🎯", "🏆", "⚡", "🔮", "🎪",
    // Faces
    "😎", "🤩", "🥳", "😈", "🤖", "👾", "🎭", "🤡",
];
