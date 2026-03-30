import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
export const Input = forwardRef(({ label, error, hint, id, className, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (_jsxs("div", { className: "w-full", children: [label && (_jsxs("label", { htmlFor: inputId, className: "label", children: [label, props.required && (_jsx("span", { className: "text-danger-500 ml-0.5", "aria-hidden": true, children: "*" }))] })), _jsx("input", { ref: ref, id: inputId, "aria-invalid": !!error, "aria-describedby": error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined, className: cn("input", error && "border-danger-500 focus:border-danger-500 focus:ring-danger-200", className), ...props }), error && (_jsx("p", { id: `${inputId}-error`, role: "alert", className: "mt-1 text-sm text-danger-500", children: error })), hint && !error && (_jsx("p", { id: `${inputId}-hint`, className: "mt-1 text-sm text-gray-500", children: hint }))] }));
});
Input.displayName = "Input";
export const Textarea = forwardRef(({ label, error, className, ...props }, ref) => {
    const id = props.name ?? "textarea";
    return (_jsxs("div", { className: "w-full", children: [label && (_jsx("label", { htmlFor: id, className: "label", children: label })), _jsx("textarea", { ref: ref, id: id, rows: 3, className: cn("input resize-none", error && "border-danger-500 focus:border-danger-500 focus:ring-danger-200", className), ...props }), error && (_jsx("p", { role: "alert", className: "mt-1 text-sm text-danger-500", children: error }))] }));
});
Textarea.displayName = "Textarea";
