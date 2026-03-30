import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
export default function NotFound() {
    return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center p-8 text-center", children: [_jsx("span", { className: "text-7xl mb-6", "aria-hidden": true, children: "\uD83C\uDFAF" }), _jsx("h1", { className: "font-display font-extrabold text-6xl text-gray-900 mb-3", children: "404" }), _jsx("p", { className: "text-xl text-gray-600 mb-8", children: "This page doesn't exist." }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Link, { to: "/", children: _jsx(Button, { variant: "secondary", children: "Home" }) }), _jsx(Link, { to: "/join", children: _jsx(Button, { children: "Join a game" }) })] })] }));
}
