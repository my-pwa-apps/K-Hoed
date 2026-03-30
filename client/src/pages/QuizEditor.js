import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Image, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { quizApi, uploadApi } from "@/lib/api";
import { newLocalId } from "./QuizEditor.utils";
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
    const [saveError, setSaveError] = useState(null);
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
    useEffect(() => {
        if (existing) {
            setTitle(existing.title);
            setDescription(existing.description ?? "");
            setIsPublic(existing.is_public);
            setQuestions((existing.questions ?? []).map((q) => ({
                ...q,
                id: q.id ?? newLocalId(),
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
                questions: questions.map((q, qi) => ({
                    id: q.id.startsWith("local-") ? undefined : q.id,
                    text: q.text,
                    image_url: q.image_url,
                    type: q.type,
                    time_limit: q.time_limit,
                    points: q.points,
                    order_index: qi,
                    answer_options: q.answer_options.map((a, ai) => ({
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
        const q = {
            id: newLocalId(),
            text: "",
            image_url: null,
            type: "classic",
            time_limit: 20,
            points: 1000,
            order_index: questions.length,
            answer_options: [
                { id: newLocalId(), text: "", is_correct: true, order_index: 0 },
                { id: newLocalId(), text: "", is_correct: false, order_index: 1 },
                { id: newLocalId(), text: "", is_correct: false, order_index: 2 },
                { id: newLocalId(), text: "", is_correct: false, order_index: 3 },
            ],
            _expanded: true,
        };
        setQuestions((prev) => [...prev, q]);
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
        if (type === "truefalse") {
            options = [
                { id: newLocalId(), text: "True", is_correct: true, order_index: 0 },
                { id: newLocalId(), text: "False", is_correct: false, order_index: 1 },
            ];
        }
        else if (type === "classic") {
            // Ensure exactly one correct answer — keep the first currently-correct one
            let foundCorrect = false;
            options = options.map((a) => {
                if (a.is_correct && !foundCorrect) {
                    foundCorrect = true;
                    return a;
                }
                return { ...a, is_correct: false };
            });
            // If none were correct, mark the first one
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
        updateQuestion(qi, { type, answer_options: options });
    };
    if (!isNew && isLoading) {
        return _jsx("div", { className: "text-gray-400 text-center py-20", children: "Loading quiz\u2026" });
    }
    return (_jsxs("div", { className: "max-w-3xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [_jsx("h1", { className: "text-2xl font-display font-bold text-gray-900", children: isNew ? "New quiz" : "Edit quiz" }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "ghost", onClick: () => navigate("/quizzes"), children: "Cancel" }), _jsx(Button, { onClick: () => saveMutation.mutate(), loading: saveMutation.isPending, disabled: !title.trim(), children: isNew ? "Create quiz" : "Save changes" })] })] }), saveError && (_jsx("p", { role: "alert", className: "text-sm text-danger-500", children: saveError })), _jsx(Card, { children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Quiz title", required: true, placeholder: "e.g. General Knowledge Round", value: title, onChange: (e) => setTitle(e.target.value) }), _jsx(Textarea, { label: "Description (optional)", placeholder: "A short description of the quiz", value: description, onChange: (e) => setDescription(e.target.value) }), _jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: isPublic, onChange: (e) => setIsPublic(e.target.checked), className: "w-4 h-4 accent-brand-500" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "Make quiz publicly discoverable" })] })] }) }), _jsxs("div", { className: "space-y-4", children: [questions.map((q, qi) => (_jsx(QuestionCard, { question: q, index: qi, onUpdate: (patch) => updateQuestion(qi, patch), onRemove: () => removeQuestion(qi), onUpdateAnswer: (ai, patch) => updateAnswer(qi, ai, patch), onAddAnswer: () => addAnswer(qi), onRemoveAnswer: (ai) => removeAnswer(qi, ai), onSetCorrect: (ai) => setCorrectAnswer(qi, ai, q.type === "multiple"), onChangeType: (type) => changeType(qi, type) }, q.id))), _jsxs("button", { onClick: addQuestion, className: "w-full border-2 border-dashed border-gray-300 rounded-2xl p-6\r\n                     text-gray-400 hover:text-brand-600 hover:border-brand-400 transition-colors\r\n                     flex items-center justify-center gap-2 font-medium", children: [_jsx(Plus, { size: 20 }), " Add question"] })] })] }));
}
function QuestionCard({ question: q, index, onUpdate, onRemove, onUpdateAnswer, onAddAnswer, onRemoveAnswer, onSetCorrect, onChangeType, }) {
    const [uploading, setUploading] = useState(false);
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setUploading(true);
        try {
            const { url } = await uploadApi.image(file);
            onUpdate({ image_url: url });
        }
        catch {
            // TODO: show upload error to user
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
    return (_jsxs(Card, { className: `border-l-4 ${borderColor}`, children: [_jsxs("div", { className: "flex items-start gap-3 mb-4", children: [_jsx("div", { className: "p-1.5 text-gray-300 cursor-grab mt-1", "aria-hidden": true, children: _jsx(GripVertical, { size: 16 }) }), _jsxs("span", { className: "text-sm font-bold text-gray-400 mt-2.5 shrink-0", children: ["Q", index + 1] }), _jsx("div", { className: "flex-1", children: _jsx("textarea", { className: "input resize-none text-base font-medium", rows: 2, placeholder: "Your question\u2026", value: q.text, onChange: (e) => onUpdate({ text: e.target.value }), "aria-label": `Question ${index + 1} text` }) }), _jsx("button", { onClick: () => onUpdate({ _expanded: !q._expanded }), className: "p-2 text-gray-400 hover:text-gray-600 shrink-0", "aria-label": q._expanded ? "Collapse" : "Expand", children: q._expanded ? _jsx(ChevronUp, { size: 18 }) : _jsx(ChevronDown, { size: 18 }) }), _jsx("button", { onClick: onRemove, className: "p-2 text-gray-400 hover:text-danger-500 shrink-0", "aria-label": `Remove question ${index + 1}`, children: _jsx(Trash2, { size: 16 }) })] }), q._expanded && (_jsxs("div", { className: "space-y-4 pl-10", children: [_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Type" }), _jsxs("select", { className: "input py-2 text-sm", value: q.type, onChange: (e) => onChangeType(e.target.value), "aria-label": "Question type", children: [_jsx("option", { value: "classic", children: "Single answer" }), _jsx("option", { value: "multiple", children: "Multiple answers" }), _jsx("option", { value: "truefalse", children: "True / False" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Time (s)" }), _jsx("select", { className: "input py-2 text-sm", value: q.time_limit, onChange: (e) => onUpdate({ time_limit: Number(e.target.value) }), "aria-label": "Time limit", children: [5, 10, 15, 20, 30, 45, 60, 90, 120].map((s) => (_jsxs("option", { value: s, children: [s, "s"] }, s))) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: "Points" }), _jsx("select", { className: "input py-2 text-sm", value: q.points, onChange: (e) => onUpdate({ points: Number(e.target.value) }), "aria-label": "Points value", children: [500, 1000, 2000].map((p) => (_jsx("option", { value: p, children: p }, p))) })] })] }), _jsx("div", { children: q.image_url ? (_jsxs("div", { className: "relative inline-block", children: [_jsx("img", { src: q.image_url, alt: "Question image", className: "max-h-40 rounded-xl object-cover border border-gray-200" }), _jsx("button", { onClick: () => onUpdate({ image_url: null }), className: "absolute top-1 right-1 p-1 bg-white rounded-full shadow text-gray-600 hover:text-danger-500", "aria-label": "Remove image", children: _jsx(Trash2, { size: 14 }) })] })) : (_jsxs("label", { className: "inline-flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-brand-600 transition-colors", children: [_jsx("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", className: "sr-only", onChange: handleImageUpload, "aria-label": "Upload question image" }), uploading ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Upload, { size: 16, className: "animate-spin" }), " Uploading\u2026"] })) : (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Image, { size: 16 }), " Add image (optional)"] }))] })) }), _jsxs("div", { className: "space-y-2", children: [q.answer_options.map((a, ai) => (_jsxs("div", { className: "flex items-center gap-2", children: [q.type === "multiple" ? (_jsx("input", { type: "checkbox", checked: a.is_correct, onChange: () => onSetCorrect(ai), className: "w-4 h-4 accent-emerald-500 shrink-0", "aria-label": `Mark answer ${ai + 1} as correct` })) : (_jsx("input", { type: "radio", name: `correct-${q.id}`, checked: a.is_correct, onChange: () => onSetCorrect(ai), disabled: q.type === "truefalse", className: "w-4 h-4 accent-emerald-500 shrink-0", "aria-label": `Mark answer ${ai + 1} as correct` })), _jsx("input", { type: "text", className: `input py-2 flex-1 text-sm ${a.is_correct ? "border-emerald-400 bg-emerald-50" : ""}`, placeholder: `Answer ${ai + 1}`, value: a.text, onChange: (e) => onUpdateAnswer(ai, { text: e.target.value }), readOnly: q.type === "truefalse", "aria-label": `Answer option ${ai + 1}` }), q.type !== "truefalse" && q.answer_options.length > 2 && (_jsx("button", { onClick: () => onRemoveAnswer(ai), className: "p-1.5 text-gray-400 hover:text-danger-500", "aria-label": `Remove answer ${ai + 1}`, children: _jsx(Trash2, { size: 14 }) }))] }, a.id))), q.type !== "truefalse" && q.answer_options.length < 6 && (_jsxs("button", { onClick: onAddAnswer, className: "text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1", children: [_jsx(Plus, { size: 14 }), " Add option"] }))] })] }))] }));
}
