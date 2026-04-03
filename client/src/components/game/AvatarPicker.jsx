import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { motion } from "framer-motion";
import { AVATAR_CATEGORIES, getAvatarUrl, isAvatarSeed } from "@/lib/utils";
export function AvatarPicker({ selected, onSelect }) {
    const defaultTab = Math.max(0, AVATAR_CATEGORIES.findIndex((c) => c.avatars.includes(selected)));
    const [activeTab, setActiveTab] = useState(defaultTab);
    const category = AVATAR_CATEGORIES[activeTab];
    return (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "flex gap-1.5 overflow-x-auto pb-1", children: AVATAR_CATEGORIES.map((cat, i) => (_jsxs("button", { type: "button", onClick: () => setActiveTab(i), className: [
                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                        activeTab === i
                            ? "bg-brand-500 text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    ].join(" "), children: [_jsx("span", { children: cat.icon }), cat.label] }, cat.id))) }), _jsx("div", { className: "grid grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1 rounded-xl", role: "group", "aria-label": `Choose avatar — ${category.label}`, children: category.avatars.map((seed) => (_jsx(motion.button, { type: "button", whileTap: { scale: 0.85 }, whileHover: { scale: 1.08 }, onClick: () => onSelect(seed), "aria-pressed": selected === seed, "aria-label": `Avatar ${seed.split(":")[1] ?? seed}`, className: [
                        "rounded-2xl overflow-hidden aspect-square transition-all duration-100",
                        selected === seed
                            ? "ring-4 ring-brand-500 ring-offset-2 scale-110 shadow-xl"
                            : "opacity-75 hover:opacity-100 hover:shadow-md",
                    ].join(" "), children: isAvatarSeed(seed) ? (_jsx("img", { src: getAvatarUrl(seed), alt: seed.split(":")[1] ?? seed, className: "w-full h-full object-cover", loading: "lazy" })) : (_jsx("span", { className: "w-full h-full flex items-center justify-center text-4xl bg-white select-none", children: seed })) }, seed))) })] }));
}
