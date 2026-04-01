import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Image, Upload, Lightbulb, ArrowRight, CheckCircle2, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { quizApi, uploadApi, brainstormApi } from "@/lib/api";
import { newLocalId } from "@/pages/QuizEditor.utils";
function createDraftQuestion(orderIndex, text = "") {
    return {
        id: newLocalId(),
        text,
        image_url: null,
        type: "classic",
        time_limit: 20,
        points: 1000,
        order_index: orderIndex,
        answer_options: [
            { id: newLocalId(), text: "", is_correct: true, order_index: 0 },
            { id: newLocalId(), text: "", is_correct: false, order_index: 1 },
            { id: newLocalId(), text: "", is_correct: false, order_index: 2 },
            { id: newLocalId(), text: "", is_correct: false, order_index: 3 },
        ],
        config: null,
        _expanded: true,
    };
}
function createBrainstormItem() {
    return {
        id: newLocalId(),
        text: "",
        notes: null,
        suggested_by: null,
        status: "proposed",
    };
}
// ─── Component ────────────────────────────────────────────────────────────────
export default function QuizEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const isNew = !id;
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [brainstorm, setBrainstorm] = useState([]);
    const [saveError, setSaveError] = useState(null);
    // Brainstorm collab state
    const [inviteCopied, setInviteCopied] = useState(false);
    const [inviteWorking, setInviteWorking] = useState(false);
    const pollRef = useRef(null);
    // Load existing quiz
    const { isLoading } = useQuery({
        queryKey: ["quiz", id],
        queryFn: () => quizApi.get(id),
        enabled: !isNew,
        select: (quiz) => quiz,
    });
    const { data: existing } = useQuery({
        queryKey: ["quiz", id],
        queryFn: () => quizApi.get(id),
        enabled: !isNew,
    });
    // Poll brainstorm items from DB to pick up collaborator additions
    const pollBrainstorm = async () => {
        if (!id)
            return;
        try {
            const quiz = await quizApi.get(id);
            const remote = quiz.brainstorm ?? [];
            setBrainstorm((local) => {
                const localIds = new Set(local.map((i) => i.id));
                const newItems = remote.filter((i) => !localIds.has(i.id));
                return newItems.length > 0 ? [...local, ...newItems] : local;
            });
        }
        catch {
            // silent — don't disrupt editor on poll failure
        }
    };
    useEffect(() => {
        if (!id)
            return;
        pollRef.current = setInterval(pollBrainstorm, 10_000);
        return () => {
            if (pollRef.current)
                clearInterval(pollRef.current);
        };
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleCopyInviteLink = async () => {
        if (!id)
            return;
        setInviteWorking(true);
        try {
            const { token } = await brainstormApi.getInvite(id);
            const url = `${window.location.origin}/brainstorm/${token}`;
            await navigator.clipboard.writeText(url);
            setInviteCopied(true);
            setTimeout(() => setInviteCopied(false), 3000);
        }
        catch {
            // ignore clipboard errors
        }
        finally {
            setInviteWorking(false);
        }
    };
    useEffect(() => {
        if (existing) {
            setTitle(existing.title);
            setDescription(existing.description ?? "");
            setIsPublic(existing.is_public);
            setBrainstorm(existing.brainstorm ?? []);
            setQuestions((existing.questions ?? []).map((q) => ({
                ...q,
                id: q.id ?? newLocalId(),
                config: q.config ?? null,
                _expanded: false,
                answer_options: q.answer_options,
            })));
        }
    }, [existing]);
    // ── Save ─────────────────────────────────────────────────────────────────
    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                title: title.trim(),
                description: description.trim() || null,
                is_public: isPublic,
                brainstorm: brainstorm
                    .map((item) => ({
                    ...item,
                    text: item.text.trim(),
                    notes: item.notes?.trim() || null,
                    suggested_by: item.suggested_by?.trim() || null,
                }))
                    .filter((item) => item.text.length > 0),
                questions: questions.map((q, qi) => ({
                    id: q.id.startsWith("local-") ? undefined : q.id,
                    text: q.text,
                    image_url: q.image_url,
                    type: q.type,
                    time_limit: q.time_limit,
                    points: q.points,
                    order_index: qi,
                    config: q.config ?? undefined,
                    answer_options: q.answer_options
                        .filter((a) => a.text.trim().length > 0)
                        .map((a, ai) => ({
                        id: a.id.startsWith("local-") ? undefined : a.id,
                        text: a.text,
                        is_correct: a.is_correct,
                        order_index: ai,
                    })),
                })),
            };
            if (isNew)
                return quizApi.create(payload);
            return quizApi.update(id, payload);
        },
        onSuccess: (quiz) => {
            void qc.invalidateQueries({ queryKey: ["quizzes"] });
            if (isNew)
                navigate(`/quizzes/${quiz.id}/edit`);
        },
        onError: (err) => setSaveError(err instanceof Error ? err.message : "Save failed"),
    });
    // ── Question helpers ─────────────────────────────────────────────────────
    const addQuestion = () => {
        setQuestions((prev) => [...prev, createDraftQuestion(prev.length)]);
    };
    const removeQuestion = (idx) => setQuestions((prev) => prev.filter((_, i) => i !== idx));
    const updateQuestion = (idx, patch) => setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
    const updateAnswer = (qi, ai, patch) => updateQuestion(qi, {
        answer_options: questions[qi].answer_options.map((a, i) => i === ai ? { ...a, ...patch } : a),
    });
    const addAnswer = (qi) => {
        const q = questions[qi];
        if (q.answer_options.length >= 6)
            return;
        updateQuestion(qi, {
            answer_options: [
                ...q.answer_options,
                { id: newLocalId(), text: "", is_correct: false, order_index: q.answer_options.length },
            ],
        });
    };
    const removeAnswer = (qi, ai) => updateQuestion(qi, {
        answer_options: questions[qi].answer_options.filter((_, i) => i !== ai),
    });
    const setCorrectAnswer = (qi, ai, isMultiple) => {
        const q = questions[qi];
        updateQuestion(qi, {
            answer_options: q.answer_options.map((a, i) => ({
                ...a,
                is_correct: isMultiple ? (i === ai ? !a.is_correct : a.is_correct) : i === ai,
            })),
        });
    };
    const changeType = (qi, type) => {
        const q = questions[qi];
        let options = q.answer_options;
        let config = null;
        if (type === "truefalse") {
            options = [
                { id: newLocalId(), text: "True", is_correct: true, order_index: 0 },
                { id: newLocalId(), text: "False", is_correct: false, order_index: 1 },
            ];
        }
        else if (type === "slider") {
            options = [];
            config = { min: 0, max: 100, step: 1, correct: 50, tolerance: 5 };
        }
        else if (type === "pinanswer") {
            options = [];
            config = { hotspotX: 0.5, hotspotY: 0.5, hotspotRadius: 0.1 };
        }
        else if (type === "typeanswer") {
            // Correct answers are the acceptable text answers
            options = [
                { id: newLocalId(), text: "", is_correct: true, order_index: 0 },
            ];
        }
        else if (type === "audioclip") {
            options = [];
            config = { mediaUrl: "", songTitle: "", songArtist: "", artistPoints: 500 };
        }
        else if (type === "videoclip") {
            options = [];
            config = { mediaUrl: "", songTitle: "" };
        }
        else if (type === "puzzle") {
            // All items are part of the puzzle; correct order = array order
            options = (options.length >= 2 ? options : [
                { id: newLocalId(), text: "", is_correct: true, order_index: 0 },
                { id: newLocalId(), text: "", is_correct: true, order_index: 1 },
                { id: newLocalId(), text: "", is_correct: true, order_index: 2 },
            ]).map((a) => ({ ...a, is_correct: true }));
        }
        else if (type === "classic") {
            // Ensure exactly one correct answer
            let foundCorrect = false;
            options = options.map((a) => {
                if (a.is_correct && !foundCorrect) {
                    foundCorrect = true;
                    return a;
                }
                return { ...a, is_correct: false };
            });
            if (!foundCorrect && options.length > 0) {
                options = [{ ...options[0], is_correct: true }, ...options.slice(1)];
            }
            if (options.length < 2) {
                options = [
                    { id: newLocalId(), text: "", is_correct: true, order_index: 0 },
                    { id: newLocalId(), text: "", is_correct: false, order_index: 1 },
                ];
            }
        }
        updateQuestion(qi, { type, answer_options: options, config });
    };
    const addBrainstormItemRow = () => {
        setBrainstorm((prev) => [...prev, createBrainstormItem()]);
    };
    const updateBrainstormItem = (idx, patch) => {
        setBrainstorm((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
    };
    const removeBrainstormItem = (idx) => {
        setBrainstorm((prev) => prev.filter((_, i) => i !== idx));
    };
    const convertIdeaToQuestion = (idx) => {
        const item = brainstorm[idx];
        if (!item?.text.trim())
            return;
        setQuestions((prev) => [...prev, createDraftQuestion(prev.length, item.text.trim())]);
        updateBrainstormItem(idx, { status: "added" });
    };
    const brainstormCounts = brainstorm.reduce((acc, item) => {
        acc[item.status] += 1;
        return acc;
    }, { proposed: 0, shortlisted: 0, added: 0 });
    if (!isNew && isLoading) {
        return _jsx("div", { className: "text-gray-400 text-center py-20", children: "Loading quiz\u2026" });
    }
    const canSave = title.trim().length > 0 &&
        (questions.length === 0 ||
            questions.every((q) => q.type === "slider" ||
                q.type === "pinanswer" ||
                q.answer_options.some((a) => a.is_correct && a.text.trim().length > 0)));
    return (_jsxs("div", { className: "max-w-3xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [_jsx("h1", { className: "text-2xl font-display font-bold text-gray-900", children: isNew ? "New quiz" : "Edit quiz" }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "ghost", onClick: () => navigate("/quizzes"), children: "Cancel" }), _jsx(Button, { onClick: () => saveMutation.mutate(), loading: saveMutation.isPending, disabled: !canSave, children: isNew ? "Create quiz" : "Save changes" })] })] }), saveError && (_jsx("p", { role: "alert", className: "text-sm text-danger-500", children: saveError })), _jsx(Card, { children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Quiz title", required: true, placeholder: "e.g. General Knowledge Round", value: title, onChange: (e) => setTitle(e.target.value) }), _jsx(Textarea, { label: "Description (optional)", placeholder: "A short description of the quiz", value: description, onChange: (e) => setDescription(e.target.value) }), _jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: isPublic, onChange: (e) => setIsPublic(e.target.checked), className: "w-4 h-4 accent-brand-500" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "Make quiz publicly discoverable" })] })] }) }), _jsx(Card, { className: "border border-amber-200 bg-gradient-to-br from-amber-50 to-white", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-4 flex-wrap", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-amber-700 mb-1", children: [_jsx(Lightbulb, { size: 18 }), _jsx("h2", { className: "font-display font-bold text-xl text-gray-900", children: "Brainstorm area" })] }), _jsx("p", { className: "text-sm text-gray-600 max-w-2xl", children: "Park ideas here before they become real quiz questions. Shortlist the strongest ones, then move them into the game when you are ready." })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [!isNew && (_jsxs(Button, { type: "button", variant: "outline", size: "sm", loading: inviteWorking, onClick: handleCopyInviteLink, title: "Copy a link that anyone can use to add brainstorm ideas \u2014 no account needed", children: [inviteCopied ? _jsx(RefreshCw, { size: 14, className: "text-emerald-600" }) : _jsx(Link2, { size: 14 }), inviteCopied ? "Link copied!" : "Invite to brainstorm"] })), _jsxs("div", { className: "flex flex-wrap gap-2 text-xs font-semibold", children: [_jsxs("span", { className: "px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600", children: [brainstormCounts.proposed, " proposed"] }), _jsxs("span", { className: "px-2.5 py-1 rounded-full bg-amber-100 text-amber-800", children: [brainstormCounts.shortlisted, " shortlisted"] }), _jsxs("span", { className: "px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700", children: [brainstormCounts.added, " added to quiz"] })] })] })] }), brainstorm.length === 0 ? (_jsx("div", { className: "rounded-2xl border border-dashed border-amber-300 bg-white/70 p-6 text-center text-sm text-gray-500", children: "No ideas yet. Start capturing rough question prompts, funny twists, or topics to agree on later." })) : (_jsx("div", { className: "space-y-4", children: brainstorm.map((item, index) => (_jsxs("div", { className: "rounded-2xl border border-amber-200 bg-white p-4 space-y-3 shadow-sm", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-gray-500", children: [_jsx("span", { className: "w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center", children: index + 1 }), "Idea", item.suggested_by && (_jsxs("span", { className: "text-xs font-normal text-brand-500 ml-1", children: ["\u00B7 suggested by ", item.suggested_by] }))] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("select", { className: "input py-2 text-sm min-w-[150px]", value: item.status, onChange: (e) => updateBrainstormItem(index, { status: e.target.value }), "aria-label": `Brainstorm status ${index + 1}`, children: [_jsx("option", { value: "proposed", children: "Proposed" }), _jsx("option", { value: "shortlisted", children: "Shortlisted" }), _jsx("option", { value: "added", children: "Added to quiz" })] }), _jsxs(Button, { type: "button", variant: item.status === "added" ? "secondary" : "outline", size: "sm", onClick: () => convertIdeaToQuestion(index), disabled: !item.text.trim(), children: [item.status === "added" ? _jsx(CheckCircle2, { size: 14 }) : _jsx(ArrowRight, { size: 14 }), item.status === "added" ? "Question created" : "Turn into question"] }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "text-danger-500 hover:text-danger-700 hover:bg-danger-50", onClick: () => removeBrainstormItem(index), children: _jsx(Trash2, { size: 14 }) })] })] }), _jsx(Input, { label: "Idea", placeholder: "e.g. Should we do a round about weird Dutch traditions?", value: item.text, onChange: (e) => updateBrainstormItem(index, { text: e.target.value }) }), _jsxs("div", { className: "grid sm:grid-cols-[minmax(0,1fr)_180px] gap-3", children: [_jsx(Textarea, { label: "Notes", placeholder: "Add angle, possible answers, jokes, or concerns to discuss later", value: item.notes ?? "", onChange: (e) => updateBrainstormItem(index, { notes: e.target.value || null }) }), _jsx(Input, { label: "Suggested by", placeholder: "Name", value: item.suggested_by ?? "", onChange: (e) => updateBrainstormItem(index, { suggested_by: e.target.value || null }) })] })] }, item.id))) })), _jsxs(Button, { type: "button", variant: "outline", onClick: addBrainstormItemRow, children: [_jsx(Plus, { size: 16 }), " Add brainstorm idea"] })] }) }), _jsxs("div", { className: "space-y-4", children: [questions.map((q, qi) => (_jsx(QuestionCard, { question: q, index: qi, onUpdate: (patch) => updateQuestion(qi, patch), onRemove: () => removeQuestion(qi), onUpdateAnswer: (ai, patch) => updateAnswer(qi, ai, patch), onAddAnswer: () => addAnswer(qi), onRemoveAnswer: (ai) => removeAnswer(qi, ai), onSetCorrect: (ai) => setCorrectAnswer(qi, ai, q.type === "multiple"), onChangeType: (type) => changeType(qi, type) }, q.id))), _jsxs("button", { onClick: addQuestion, className: "w-full border-2 border-dashed border-gray-300 rounded-2xl p-6\r\n                     text-gray-400 hover:text-brand-600 hover:border-brand-400 transition-colors\r\n                     flex items-center justify-center gap-2 font-medium", children: [_jsx(Plus, { size: 20 }), " Add question"] })] })] }));
}
function QuestionCard({ question: q, index, onUpdate, onRemove, onUpdateAnswer, onAddAnswer, onRemoveAnswer, onSetCorrect, onChangeType, }) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setUploading(true);
        setUploadError(null);
        try {
            const { url } = await uploadApi.image(file);
            onUpdate({ image_url: url });
        }
        catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed. Please try a smaller image.");
        }
        finally {
            setUploading(false);
        }
    };
    const questionColors = [
        "border-l-rose-400",
        "border-l-blue-400",
        "border-l-amber-400",
        "border-l-emerald-400",
        "border-l-purple-400",
        "border-l-teal-400",
    ];
    const borderColor = questionColors[index % questionColors.length];
    return (_jsxs(Card, { className: `border-l-4 ${borderColor}`, children: [_jsxs("div", { className: "flex items-start gap-3 mb-4", children: [_jsx("div", { className: "p-1.5 text-gray-300 cursor-grab mt-1", "aria-hidden": true, children: _jsx(GripVertical, { size: 16 }) }), _jsxs("span", { className: "text-sm font-bold text-gray-400 mt-2.5 shrink-0", children: ["Q", index + 1] }), _jsx("div", { className: "flex-1", children: _jsx("textarea", { className: "input resize-none text-base font-medium", rows: 2, placeholder: "Your question\u2026", value: q.text, onChange: (e) => onUpdate({ text: e.target.value }), "aria-label": `Question ${index + 1} text` }) }), _jsx("button", { onClick: () => onUpdate({ _expanded: !q._expanded }), className: "p-2 text-gray-400 hover:text-gray-600 shrink-0", "aria-label": q._expanded ? "Collapse" : "Expand", children: q._expanded ? _jsx(ChevronUp, { size: 18 }) : _jsx(ChevronDown, { size: 18 }) }), _jsx("button", { onClick: onRemove, className: "p-2 text-gray-400 hover:text-danger-500 shrink-0", "aria-label": `Remove question ${index + 1}`, children: _jsx(Trash2, { size: 16 }) })] }), q._expanded && (_jsxs("div", { className: "space-y-4 pl-10", children: [_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Type" }), _jsxs("select", { className: "input py-2 text-sm", value: q.type, onChange: (e) => onChangeType(e.target.value), "aria-label": "Question type", children: [_jsx("option", { value: "classic", children: "Single answer" }), _jsx("option", { value: "multiple", children: "Multiple answers" }), _jsx("option", { value: "truefalse", children: "True / False" }), _jsx("option", { value: "typeanswer", children: "Type answer" }), _jsx("option", { value: "slider", children: "Slider" }), _jsx("option", { value: "puzzle", children: "Puzzle (order)" }), _jsx("option", { value: "pinanswer", children: "Pin answer" }), _jsx("option", { value: "audioclip", children: "\uD83C\uDFB5 Song clip" }), _jsx("option", { value: "videoclip", children: "\uD83C\uDFAC Video / movie clip" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Time (s)" }), _jsx("select", { className: "input py-2 text-sm", value: q.time_limit, onChange: (e) => onUpdate({ time_limit: Number(e.target.value) }), "aria-label": "Time limit", children: [5, 10, 15, 20, 30, 45, 60, 90, 120].map((s) => (_jsxs("option", { value: s, children: [s, "s"] }, s))) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Points" }), _jsx("select", { className: "input py-2 text-sm", value: q.points, onChange: (e) => onUpdate({ points: Number(e.target.value) }), "aria-label": "Points value", children: [500, 1000, 2000].map((p) => (_jsx("option", { value: p, children: p }, p))) })] })] }), _jsxs("div", { children: [q.image_url ? (_jsxs("div", { className: "relative inline-block", children: [_jsx("img", { src: q.image_url, alt: "Question image", className: "max-h-40 rounded-xl object-cover border border-gray-200" }), _jsx("button", { onClick: () => onUpdate({ image_url: null }), className: "absolute top-1 right-1 p-1 bg-white rounded-full shadow text-gray-600 hover:text-danger-500", "aria-label": "Remove image", children: _jsx(Trash2, { size: 14 }) })] })) : (_jsxs("label", { className: "inline-flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-brand-600 transition-colors", children: [_jsx("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", className: "sr-only", onChange: handleImageUpload, "aria-label": "Upload question image" }), uploading ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Upload, { size: 16, className: "animate-spin" }), " Uploading\u2026"] })) : (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Image, { size: 16 }), " Add image (optional)"] }))] })), uploadError && (_jsx("p", { role: "alert", className: "text-xs text-danger-500 mt-1", children: uploadError }))] }), q.type === "slider" && (_jsxs("div", { className: "space-y-3 bg-gray-50 rounded-xl p-3", children: [_jsx("p", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Slider config" }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Min" }), _jsx("input", { type: "number", title: "Slider minimum value", className: "input py-2 text-sm", value: q.config?.min ?? 0, onChange: (e) => onUpdate({ config: { ...q.config, min: Number(e.target.value) } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Max" }), _jsx("input", { type: "number", title: "Slider maximum value", className: "input py-2 text-sm", value: q.config?.max ?? 100, onChange: (e) => onUpdate({ config: { ...q.config, max: Number(e.target.value) } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Step" }), _jsx("input", { type: "number", title: "Slider step value", className: "input py-2 text-sm", min: 0.01, value: q.config?.step ?? 1, onChange: (e) => onUpdate({ config: { ...q.config, step: Number(e.target.value) } }) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Correct answer" }), _jsx("input", { type: "number", title: "Slider correct value", className: "input py-2 text-sm border-emerald-400 bg-emerald-50", value: q.config?.correct ?? 50, onChange: (e) => onUpdate({ config: { ...q.config, correct: Number(e.target.value) } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Tolerance (\u00B1)" }), _jsx("input", { type: "number", title: "Slider tolerance value", className: "input py-2 text-sm", min: 0, value: q.config?.tolerance ?? 5, onChange: (e) => onUpdate({ config: { ...q.config, tolerance: Number(e.target.value) } }) })] })] })] })), q.type === "pinanswer" && (_jsxs("div", { className: "space-y-3 bg-gray-50 rounded-xl p-3", children: [_jsx("p", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Pin answer \u2014 click image to set hotspot" }), q.image_url ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "relative inline-block cursor-crosshair rounded-xl overflow-hidden border-2 border-dashed border-brand-300", role: "button", "aria-label": "Click to set hotspot position", onClick: (e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = (e.clientX - rect.left) / rect.width;
                                            const y = (e.clientY - rect.top) / rect.height;
                                            onUpdate({ config: { ...q.config, hotspotX: x, hotspotY: y } });
                                        }, children: [_jsx("img", { src: q.image_url, alt: "Question image", className: "max-h-48 block" }), q.config?.hotspotX !== undefined && (_jsx("div", { className: "absolute pointer-events-none rounded-full border-4 border-emerald-500 bg-emerald-500/20 -translate-x-1/2 -translate-y-1/2", style: {
                                                    left: `${(q.config.hotspotX) * 100}%`,
                                                    top: `${(q.config.hotspotY) * 100}%`,
                                                    width: `${(q.config.hotspotRadius) * 200}%`,
                                                    aspectRatio: "1",
                                                } }))] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Hotspot radius (fraction of image width: 0.02\u20130.4)" }), _jsx("input", { type: "range", title: "Pin answer hotspot radius", min: 0.02, max: 0.4, step: 0.01, className: "w-full accent-brand-500", value: q.config?.hotspotRadius ?? 0.1, onChange: (e) => onUpdate({ config: { ...q.config, hotspotRadius: Number(e.target.value) } }) })] })] })) : (_jsx("p", { className: "text-sm text-amber-600", children: "\u26A0\uFE0F Upload an image above, then click it to set the correct hotspot." }))] })), (q.type === "audioclip" || q.type === "videoclip") && (_jsxs("div", { className: "space-y-3 bg-gray-50 rounded-xl p-3", children: [_jsx("p", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide", children: q.type === "audioclip" ? "🎵 Song clip config" : "🎬 Video / movie clip config" }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Media URL (YouTube, MP3, MP4\u2026)" }), _jsx("input", { type: "url", title: "Media URL", className: "input py-2 text-sm", placeholder: "https://youtube.com/watch?v=\u2026", value: q.config?.mediaUrl ?? "", onChange: (e) => onUpdate({ config: { ...q.config, mediaUrl: e.target.value } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: q.type === "audioclip" ? "Correct song title" : "Correct movie / series title" }), _jsx("input", { type: "text", title: "Correct title", className: "input py-2 text-sm border-emerald-400 bg-emerald-50", placeholder: q.type === "audioclip" ? "Song title" : "Movie or series title", value: q.config?.songTitle ?? "", onChange: (e) => onUpdate({ config: { ...q.config, songTitle: e.target.value } }) })] }), q.type === "audioclip" && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Artist name (optional \u2014 bonus points)" }), _jsx("input", { type: "text", title: "Artist name", className: "input py-2 text-sm", placeholder: "Leave blank to skip artist bonus", value: q.config?.songArtist ?? "", onChange: (e) => onUpdate({ config: { ...q.config, songArtist: e.target.value } }) })] }), q.config?.songArtist && (_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Artist bonus points" }), _jsx("input", { type: "number", title: "Artist bonus points", className: "input py-2 text-sm", min: 0, step: 100, value: q.config?.artistPoints ?? 500, onChange: (e) => onUpdate({ config: { ...q.config, artistPoints: Number(e.target.value) } }) })] }))] }))] })), q.type !== "slider" && q.type !== "pinanswer" && q.type !== "audioclip" && q.type !== "videoclip" && (_jsxs("div", { className: "space-y-2", children: [q.type === "typeanswer" && (_jsx("p", { className: "text-xs text-gray-500", children: "Acceptable answers \u2014 player\u2019s text must match one (case-insensitive)." })), q.type === "puzzle" && (_jsx("p", { className: "text-xs text-gray-500", children: "Items in order shown here \u2014 players will see them shuffled." })), q.answer_options.map((a, ai) => (_jsxs("div", { className: "flex items-center gap-2", children: [q.type !== "puzzle" && q.type !== "typeanswer" && (q.type === "multiple" ? (_jsx("input", { type: "checkbox", checked: a.is_correct, onChange: () => onSetCorrect(ai), className: "w-4 h-4 accent-emerald-500 shrink-0", "aria-label": `Mark answer ${ai + 1} as correct` })) : (_jsx("input", { type: "radio", name: `correct-${q.id}`, checked: a.is_correct, onChange: () => onSetCorrect(ai), disabled: q.type === "truefalse", className: "w-4 h-4 accent-emerald-500 shrink-0", "aria-label": `Mark answer ${ai + 1} as correct` }))), q.type === "puzzle" && (_jsx("span", { className: "w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0", children: ai + 1 })), _jsx("input", { type: "text", className: `input py-2 flex-1 text-sm ${(q.type !== "puzzle" && q.type !== "typeanswer") && a.is_correct
                                            ? "border-emerald-400 bg-emerald-50"
                                            : q.type === "typeanswer" ? "border-emerald-400 bg-emerald-50" : ""}`, placeholder: q.type === "typeanswer" ? `Acceptable answer ${ai + 1}` : q.type === "puzzle" ? `Item ${ai + 1}` : `Answer ${ai + 1}`, value: a.text, onChange: (e) => onUpdateAnswer(ai, { text: e.target.value }), readOnly: q.type === "truefalse", "aria-label": `Answer option ${ai + 1}` }), q.type !== "truefalse" && q.answer_options.length > (q.type === "typeanswer" ? 1 : 2) && (_jsx("button", { onClick: () => onRemoveAnswer(ai), className: "p-1.5 text-gray-400 hover:text-danger-500", "aria-label": `Remove answer ${ai + 1}`, children: _jsx(Trash2, { size: 14 }) }))] }, a.id))), q.type !== "truefalse" && q.answer_options.length < (q.type === "typeanswer" ? 5 : 6) && (_jsxs("button", { onClick: onAddAnswer, className: "text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1", children: [_jsx(Plus, { size: 14 }), " ", q.type === "typeanswer" ? "Add acceptable answer" : q.type === "puzzle" ? "Add item" : "Add option"] }))] }))] }))] }));
}
