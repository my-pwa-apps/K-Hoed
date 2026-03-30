import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
export default function Login() {
    const { login, loginPending } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const onSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await login({ email, password });
            navigate("/dashboard");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        }
    };
    return (_jsxs(AuthShell, { title: "Welcome back", subtitle: "Sign in to your host account", children: [_jsxs("form", { onSubmit: onSubmit, className: "space-y-5", noValidate: true, children: [_jsx(Input, { label: "Email", type: "email", required: true, autoComplete: "email", placeholder: "you@example.com", value: email, onChange: (e) => setEmail(e.target.value) }), _jsx(Input, { label: "Password", type: "password", required: true, autoComplete: "current-password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: (e) => setPassword(e.target.value) }), error && (_jsx("p", { role: "alert", className: "text-sm text-danger-500 text-center", children: error })), _jsx(Button, { type: "submit", fullWidth: true, loading: loginPending, size: "lg", children: "Sign in" })] }), _jsxs("p", { className: "mt-6 text-center text-sm text-gray-600", children: ["Don't have an account?", " ", _jsx(Link, { to: "/register", className: "text-brand-600 font-semibold hover:underline", children: "Sign up free" })] })] }));
}
export function AuthShell({ title, subtitle, children, }) {
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsxs(Link, { to: "/", className: "font-display font-bold text-3xl text-white inline-flex items-center gap-2", children: [_jsx("span", { "aria-hidden": true, children: "\uD83C\uDFAF" }), " K-Hoed"] }), _jsx("h1", { className: "mt-4 text-2xl font-bold text-white", children: title }), _jsx("p", { className: "mt-1 text-white/65", children: subtitle })] }), _jsx("div", { className: "bg-white rounded-3xl shadow-2xl p-8", children: children })] }) }));
}
