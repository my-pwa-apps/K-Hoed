import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "./Login";
export default function Register() {
    const { register: registerUser, registerPending } = useAuth();
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState(null);
    const onSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        try {
            await registerUser({ email, display_name: displayName, password });
            navigate("/dashboard");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed");
        }
    };
    return (_jsxs(AuthShell, { title: "Create your account", subtitle: "Host live quizzes for free", children: [_jsxs("form", { onSubmit: onSubmit, className: "space-y-4", noValidate: true, children: [_jsx(Input, { label: "Display name", type: "text", required: true, autoComplete: "nickname", placeholder: "Quiz Master", value: displayName, onChange: (e) => setDisplayName(e.target.value) }), _jsx(Input, { label: "Email", type: "email", required: true, autoComplete: "email", placeholder: "you@example.com", value: email, onChange: (e) => setEmail(e.target.value) }), _jsx(Input, { label: "Password", type: "password", required: true, autoComplete: "new-password", placeholder: "At least 8 characters", value: password, onChange: (e) => setPassword(e.target.value) }), _jsx(Input, { label: "Confirm password", type: "password", required: true, autoComplete: "new-password", placeholder: "Repeat your password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value) }), error && (_jsx("p", { role: "alert", className: "text-sm text-danger-500 text-center", children: error })), _jsx(Button, { type: "submit", fullWidth: true, loading: registerPending, size: "lg", children: "Create account" })] }), _jsxs("p", { className: "mt-6 text-center text-sm text-gray-600", children: ["Already have an account?", " ", _jsx(Link, { to: "/login", className: "text-brand-600 font-semibold hover:underline", children: "Sign in" })] })] }));
}
