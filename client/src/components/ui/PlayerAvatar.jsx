import { jsx as _jsx } from "react/jsx-runtime";
import { getAvatarUrl, isAvatarSeed, getAvatarColor } from "@/lib/utils";
const sizeClasses = {
    xs: "w-5 h-5 text-xs",
    sm: "w-7 h-7 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-xl",
};
export function PlayerAvatar({ value, playerId = "", name = "", size = "md", className = "", }) {
    const base = `rounded-full flex items-center justify-center shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`;
    if (value && isAvatarSeed(value)) {
        return (_jsx("img", { src: getAvatarUrl(value), alt: name || value, className: `${base} object-cover`, "aria-hidden": true }));
    }
    if (value) {
        // Legacy emoji
        return (_jsx("span", { className: `${base} bg-white`, "aria-hidden": true, children: value }));
    }
    // Fallback: coloured circle with initial
    return (_jsx("span", { className: `${base} ${getAvatarColor(playerId)} text-white font-bold`, "aria-hidden": true, children: name[0]?.toUpperCase() ?? "?" }));
}
