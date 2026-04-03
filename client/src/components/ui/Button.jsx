import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    ghost: "btn-ghost",
    outline: "btn border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95",
};
const sizeClasses = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
    xl: "btn-xl",
};
export const Button = forwardRef(({ variant = "primary", size = "md", loading = false, fullWidth = false, className, children, disabled, ...props }, ref) => {
    return (_jsxs("button", { ref: ref, disabled: disabled || loading, "aria-busy": loading, className: cn(variantClasses[variant], sizeClasses[size], fullWidth && "w-full", className), ...props, children: [loading && (_jsxs("svg", { className: "animate-spin h-4 w-4 shrink-0", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", "aria-hidden": true, children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" })] })), children] }));
});
Button.displayName = "Button";
