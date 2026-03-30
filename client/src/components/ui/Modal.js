import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
};
export function Modal({ open, onClose, title, children, className, size = "md", }) {
    const dialogRef = useRef(null);
    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape" && open)
                onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);
    // Trap focus
    useEffect(() => {
        if (open) {
            const prev = document.activeElement;
            dialogRef.current?.focus();
            return () => prev?.focus();
        }
    }, [open]);
    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);
    return (_jsx(AnimatePresence, { children: open && (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", role: "dialog", "aria-modal": true, "aria-labelledby": title ? "modal-title" : undefined, children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: onClose, "aria-hidden": true }), _jsxs(motion.div, { ref: dialogRef, tabIndex: -1, initial: { opacity: 0, scale: 0.95, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 8 }, transition: { duration: 0.15 }, className: cn("relative w-full bg-white rounded-2xl shadow-2xl z-10 outline-none", sizeClasses[size], className), children: [title && (_jsxs("div", { className: "flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100", children: [_jsx("h2", { id: "modal-title", className: "text-lg font-semibold text-gray-900", children: title }), _jsx("button", { onClick: onClose, "aria-label": "Close dialog", className: "p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors", children: _jsx(X, { size: 18 }) })] })), _jsx("div", { className: "p-6", children: children })] })] })) }));
}
