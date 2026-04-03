import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Card({ children, className, as: Tag = "div", onClick }) {
    return (_jsx(Tag, { className: cn("card", onClick && "cursor-pointer hover:shadow-md transition-shadow", className), onClick: onClick, children: children }));
}
export function CardHeader({ children, className, }) {
    return (_jsx("div", { className: cn("flex items-start justify-between gap-4 mb-4", className), children: children }));
}
export function CardTitle({ children, className, }) {
    return (_jsx("h3", { className: cn("text-lg font-semibold text-gray-900 leading-snug", className), children: children }));
}
export function CardBody({ children, className, }) {
    return _jsx("div", { className: cn("space-y-3", className), children: children });
}
export function CardFooter({ children, className, }) {
    return (_jsx("div", { className: cn("mt-4 pt-4 border-t border-gray-100 flex items-center gap-2", className), children: children }));
}
