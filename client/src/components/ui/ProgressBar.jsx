import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function ProgressBar({ value, max = 100, className, colorClass = "bg-brand-500", label, animated = false, }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (_jsx("div", { className: cn("w-full bg-gray-200 rounded-full h-2.5 overflow-hidden", className), role: "progressbar", "aria-valuenow": value, "aria-valuemin": 0, "aria-valuemax": max, "aria-label": label, children: _jsx("div", { className: cn("h-full rounded-full transition-all duration-300", colorClass, animated && "animate-pulse"), style: { width: `${pct}%` } }) }));
}
