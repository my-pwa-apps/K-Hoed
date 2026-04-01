import { jsx as _jsx } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { AVATARS } from "@/lib/utils";
export function AvatarPicker({ selected, onSelect }) {
    return (_jsx("div", { className: "grid grid-cols-8 gap-2", role: "group", "aria-label": "Choose avatar", children: AVATARS.map((emoji) => (_jsx(motion.button, { type: "button", whileTap: { scale: 0.85 }, onClick: () => onSelect(emoji), "aria-pressed": selected === emoji, "aria-label": `Avatar ${emoji}`, className: [
                "w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all duration-100",
                selected === emoji
                    ? "ring-2 ring-brand-500 bg-brand-50 scale-110"
                    : "hover:bg-gray-100 active:scale-95",
            ].join(" "), children: emoji }, emoji))) }));
}
