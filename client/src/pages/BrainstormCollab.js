import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Lightbulb, Plus, Trash2, RefreshCw } from "lucide-react";
import { brainstormApi, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useI18n, interp } from "@/i18n";
const POLL_INTERVAL_MS = 10_000;
export default function BrainstormCollab() {
    const { token } = useParams();
    const { t } = useI18n();
    const tb = t.brainstorm;
    const [quizTitle, setQuizTitle] = useState(null);
    const [items, setItems] = useState([]);
    const [loadError, setLoadError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [name, setName] = useState(() => localStorage.getItem("brainstorm_name") ?? "");
    const [text, setText] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const pollRef = useRef(null);
    const load = async () => {
        if (!token)
            return;
        try {
            const data = await brainstormApi.getByToken(token);
            setQuizTitle(data.quiz_title);
            setItems(data.items);
            setLastUpdated(new Date());
            setLoadError(null);
        }
        catch (err) {
            setLoadError(err instanceof ApiError ? err.message : "Could not load brainstorm board");
        }
    };
    useEffect(() => {
        load();
        pollRef.current = setInterval(load, POLL_INTERVAL_MS);
        return () => {
            if (pollRef.current)
                clearInterval(pollRef.current);
        };
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token || !name.trim() || !text.trim())
            return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            localStorage.setItem("brainstorm_name", name.trim());
            const newItem = await brainstormApi.addItem(token, {
                text: text.trim(),
                suggested_by: name.trim(),
                notes: notes.trim() || null,
            });
            setItems((prev) => [...prev, newItem]);
            setText("");
            setNotes("");
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 2000);
        }
        catch (err) {
            setSubmitError(err instanceof ApiError ? err.message : "Failed to add idea");
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleDelete = async (itemId) => {
        if (!token)
            return;
        try {
            await brainstormApi.deleteItem(token, itemId);
            setItems((prev) => prev.filter((i) => i.id !== itemId));
        }
        catch {
            // silent — item may already have been removed
        }
    };
    if (loadError) {
        return (_jsx("div", { className: "min-h-screen bg-brand-900 flex items-center justify-center p-6", children: _jsxs(Card, { className: "max-w-md w-full text-center space-y-3", children: [_jsx(Lightbulb, { size: 40, className: "mx-auto text-amber-400" }), _jsx("h1", { className: "text-xl font-display font-bold text-gray-900", children: tb.not_found_title }), _jsx("p", { className: "text-sm text-gray-500", children: loadError }), _jsx("p", { className: "text-sm text-gray-400", children: tb.not_found_sub })] }) }));
    }
    if (!quizTitle) {
        return (_jsx("div", { className: "min-h-screen bg-brand-900 flex items-center justify-center", children: _jsx(RefreshCw, { size: 32, className: "animate-spin text-white opacity-60" }) }));
    }
    const proposed = items.filter((i) => i.status === "proposed");
    const shortlisted = items.filter((i) => i.status === "shortlisted");
    const added = items.filter((i) => i.status === "added");
    return (_jsx("div", { className: "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,226,173,0.18),_transparent_28%),linear-gradient(180deg,#172554_0%,#1e3a8a_45%,#172554_100%)] py-10 px-4", children: _jsxs("div", { className: "max-w-6xl mx-auto space-y-6", children: [_jsxs("div", { className: "rounded-[32px] bg-white/10 backdrop-blur-sm border border-white/10 px-6 py-8 text-center space-y-2 shadow-[0_24px_70px_rgba(0,0,0,0.18)]", children: [_jsxs("div", { className: "flex items-center justify-center gap-2 text-amber-300 mb-2", children: [_jsx(Lightbulb, { size: 28 }), _jsx("span", { className: "text-sm font-semibold uppercase tracking-widest", children: tb.header })] }), _jsx("h1", { className: "text-3xl sm:text-5xl font-display font-bold text-white", children: quizTitle }), _jsx("p", { className: "max-w-2xl mx-auto text-sm sm:text-base leading-7 text-brand-100/80", children: tb.sub }), lastUpdated && (_jsx("p", { className: "text-xs text-brand-400", children: interp(tb.last_updated, { time: lastUpdated.toLocaleTimeString() }) }))] }), _jsx(Card, { className: "border-0 shadow-[0_20px_60px_rgba(15,23,42,0.18)]", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.25em] text-gray-400", children: tb.co_create }), _jsx("h2", { className: "font-display font-bold text-gray-900 text-2xl", children: tb.add_idea_title })] }), _jsx(Input, { label: tb.your_name, required: true, placeholder: tb.name_placeholder, value: name, onChange: (e) => setName(e.target.value) }), _jsx(Input, { label: tb.idea_label, required: true, placeholder: tb.idea_placeholder, value: text, onChange: (e) => setText(e.target.value) }), _jsx(Textarea, { label: tb.notes_label, placeholder: tb.notes_placeholder, value: notes, onChange: (e) => setNotes(e.target.value) }), submitError && (_jsx("p", { className: "text-sm text-danger-500", role: "alert", children: submitError })), submitSuccess && (_jsx("p", { className: "text-sm text-emerald-600 font-medium", children: tb.idea_added })), _jsxs(Button, { type: "submit", loading: submitting, disabled: !name.trim() || !text.trim(), fullWidth: true, children: [_jsx(Plus, { size: 16 }), tb.add_to_brainstorm] })] }) }), items.length === 0 ? (_jsx(Card, { className: "text-center text-gray-400 text-sm py-8 border-0 shadow-[0_20px_60px_rgba(15,23,42,0.18)]", children: tb.no_ideas })) : (_jsx("div", { className: "grid gap-4 lg:grid-cols-3 items-start", children: [
                        { label: tb.proposed, list: proposed, bg: "bg-white", badge: "bg-gray-100 text-gray-600" },
                        { label: tb.shortlisted, list: shortlisted, bg: "bg-amber-50", badge: "bg-amber-100 text-amber-800" },
                        { label: tb.added, list: added, bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
                    ]
                        .filter(({ list }) => list.length > 0)
                        .map(({ label, list, bg, badge }) => (_jsxs("div", { className: "rounded-[28px] bg-white/10 backdrop-blur-sm border border-white/10 p-4", children: [_jsx("div", { className: "flex items-center gap-2 mb-3", children: _jsxs("span", { className: `text-xs font-bold px-2.5 py-1 rounded-full ${badge}`, children: [label, " \u00B7 ", list.length] }) }), _jsx("div", { className: "space-y-2", children: list.map((item) => (_jsxs("div", { className: `rounded-2xl border border-amber-200 ${bg} px-4 py-3 flex gap-3 items-start shadow-sm`, children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 break-words", children: item.text }), item.notes && (_jsx("p", { className: "text-xs text-gray-500 mt-1 break-words", children: item.notes })), item.suggested_by && (_jsxs("p", { className: "text-xs text-brand-500 mt-1 font-medium", children: ["\u2014 ", item.suggested_by] }))] }), item.status !== "added" && (_jsx("button", { type: "button", onClick: () => handleDelete(item.id), "aria-label": "Remove idea", className: "text-gray-400 hover:text-danger-500 transition-colors shrink-0 mt-0.5", children: _jsx(Trash2, { size: 15 }) }))] }, item.id))) })] }, label))) }))] }) }));
}
