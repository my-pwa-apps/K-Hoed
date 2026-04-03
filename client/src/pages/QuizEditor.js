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
import { useI18n, interp } from "@/i18n";
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
const QUESTION_TYPE_LABELS = {
    classic: "Single answer",
    multiple: "Multiple answers",
    truefalse: "True / False",
    typeanswer: "Type answer",
    slider: "Slider",
    puzzle: "Puzzle",
    pinanswer: "Pin answer",
    audioclip: "Song clip",
    videoclip: "Video clip",
};
// ─── Component ────────────────────────────────────────────────────────────────
export default function QuizEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { t } = useI18n();
    const te = t.editor;
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
        return _jsx("div", { className: "text-gray-400 text-center py-20", children: te.loading_quiz });
    }
    const canSave = title.trim().length > 0 &&
        (questions.length === 0 ||
            questions.every((q) => q.type === "slider" ||
                q.type === "pinanswer" ||
                q.answer_options.some((a) => a.is_correct && a.text.trim().length > 0)));
    return (_jsxs("div", { className: "max-w-6xl mx-auto space-y-6 pb-10", children: [_jsx(Card, { className: "overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(255,251,235,0.98)_42%,_rgba(238,242,255,1)_100%)] shadow-[0_24px_80px_rgba(79,98,245,0.12)]", children: _jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.4fr_0.8fr] items-start", children: [_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-brand-700 shadow-sm", children: [_jsx(Lightbulb, { size: 14 }), " ", te.admin_studio] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h1", { className: "text-3xl sm:text-5xl font-display font-bold leading-none text-gray-900", children: isNew ? te.new_hero : te.edit_hero }), _jsx("p", { className: "max-w-3xl text-sm sm:text-base leading-7 text-gray-600", children: te.hero_sub })] }), _jsxs("div", { className: "flex flex-wrap gap-2 text-xs font-semibold", children: [_jsx("span", { className: "rounded-full bg-white px-3 py-1.5 text-gray-600 shadow-sm", children: interp(te.questions_count, { n: questions.length }) }), _jsx("span", { className: "rounded-full bg-amber-100 px-3 py-1.5 text-amber-800", children: interp(te.active_ideas, { n: brainstormCounts.proposed + brainstormCounts.shortlisted }) }), _jsx("span", { className: "rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700", children: interp(te.converted, { n: brainstormCounts.added }) })] })] }), _jsx("div", { className: "rounded-[28px] bg-white/85 p-4 shadow-lg shadow-brand-500/10", children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.25em] text-gray-400", children: te.publishing_panel }), _jsxs("div", { className: "grid grid-cols-3 gap-2 text-center", children: [_jsxs("div", { className: "rounded-2xl bg-[#eef2ff] px-3 py-4", children: [_jsx("p", { className: "text-2xl font-bold text-brand-700", children: questions.length }), _jsx("p", { className: "text-[11px] font-semibold uppercase tracking-wide text-brand-700/70", children: te.stat_questions })] }), _jsxs("div", { className: "rounded-2xl bg-[#fff7ed] px-3 py-4", children: [_jsx("p", { className: "text-2xl font-bold text-amber-700", children: brainstorm.length }), _jsx("p", { className: "text-[11px] font-semibold uppercase tracking-wide text-amber-700/70", children: te.stat_ideas })] }), _jsxs("div", { className: "rounded-2xl bg-[#ecfeff] px-3 py-4", children: [_jsx("p", { className: "text-2xl font-bold text-cyan-700", children: isPublic ? te.public_on : te.public_off }), _jsx("p", { className: "text-[11px] font-semibold uppercase tracking-wide text-cyan-700/70", children: te.stat_public })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3 pt-2", children: [_jsx(Button, { variant: "ghost", onClick: () => navigate("/quizzes"), children: t.common.cancel }), _jsx(Button, { onClick: () => saveMutation.mutate(), loading: saveMutation.isPending, disabled: !canSave, className: "shadow-lg shadow-brand-500/20", children: isNew ? t.quiz.new_quiz : t.quiz.save })] })] }) })] }) }), saveError && (_jsx("p", { role: "alert", className: "text-sm text-danger-500", children: saveError })), _jsx(Card, { className: "border-0 shadow-[0_18px_50px_rgba(15,23,42,0.06)]", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.25em] text-gray-400", children: te.quiz_setup }), _jsx("h2", { className: "mt-2 text-2xl font-display font-bold text-gray-900", children: te.quiz_setup_sub })] }), _jsx(Input, { label: t.quiz.title_label, required: true, placeholder: t.quiz.title_placeholder, value: title, onChange: (e) => setTitle(e.target.value) }), _jsx(Textarea, { label: t.quiz.description_label, placeholder: t.quiz.description_label, value: description, onChange: (e) => setDescription(e.target.value) }), _jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: isPublic, onChange: (e) => setIsPublic(e.target.checked), className: "w-4 h-4 accent-brand-500" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: te.make_public })] })] }) }), _jsx(Card, { className: "border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-[#fff7ed] shadow-[0_18px_50px_rgba(245,158,11,0.10)]", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-4 flex-wrap", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-amber-700 mb-1", children: [_jsx(Lightbulb, { size: 18 }), _jsx("h2", { className: "font-display font-bold text-xl text-gray-900", children: te.brainstorm_title })] }), _jsx("p", { className: "text-sm text-gray-600 max-w-2xl", children: te.brainstorm_sub })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [!isNew && (_jsxs(Button, { type: "button", variant: "outline", size: "sm", loading: inviteWorking, onClick: handleCopyInviteLink, title: "Copy a link that anyone can use to add brainstorm ideas \u2014 no account needed", children: [inviteCopied ? _jsx(RefreshCw, { size: 14, className: "text-emerald-600" }) : _jsx(Link2, { size: 14 }), inviteCopied ? te.link_copied : te.invite_brainstorm] })), _jsxs("div", { className: "flex flex-wrap gap-2 text-xs font-semibold", children: [_jsxs("span", { className: "px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600", children: [brainstormCounts.proposed, " ", te.proposed] }), _jsxs("span", { className: "px-2.5 py-1 rounded-full bg-amber-100 text-amber-800", children: [brainstormCounts.shortlisted, " ", te.shortlisted] }), _jsxs("span", { className: "px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700", children: [brainstormCounts.added, " ", te.added_to_quiz] })] })] })] }), brainstorm.length === 0 ? (_jsx("div", { className: "rounded-2xl border border-dashed border-amber-300 bg-white/70 p-6 text-center text-sm text-gray-500", children: te.brainstorm_empty })) : (_jsx("div", { className: "space-y-4", children: brainstorm.map((item, index) => (_jsxs("div", { className: "rounded-2xl border border-amber-200 bg-white p-4 space-y-3 shadow-sm", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-gray-500", children: [_jsx("span", { className: "w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center", children: index + 1 }), te.idea, item.suggested_by && (_jsxs("span", { className: "text-xs font-normal text-brand-500 ml-1", children: ["\u00B7 ", interp(te.suggested_by, { name: item.suggested_by })] }))] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("select", { className: "input py-2 text-sm min-w-[150px]", value: item.status, onChange: (e) => updateBrainstormItem(index, { status: e.target.value }), "aria-label": `Brainstorm status ${index + 1}`, children: [_jsx("option", { value: "proposed", children: te.status_proposed }), _jsx("option", { value: "shortlisted", children: te.status_shortlisted }), _jsx("option", { value: "added", children: te.status_added })] }), _jsxs(Button, { type: "button", variant: item.status === "added" ? "secondary" : "outline", size: "sm", onClick: () => convertIdeaToQuestion(index), disabled: !item.text.trim(), children: [item.status === "added" ? _jsx(CheckCircle2, { size: 14 }) : _jsx(ArrowRight, { size: 14 }), item.status === "added" ? te.question_created : te.turn_into_question] }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "text-danger-500 hover:text-danger-700 hover:bg-danger-50", onClick: () => removeBrainstormItem(index), children: _jsx(Trash2, { size: 14 }) })] })] }), _jsx(Input, { label: te.idea_label, placeholder: te.idea_placeholder, value: item.text, onChange: (e) => updateBrainstormItem(index, { text: e.target.value }) }), _jsxs("div", { className: "grid sm:grid-cols-[minmax(0,1fr)_180px] gap-3", children: [_jsx(Textarea, { label: te.notes_label, placeholder: te.notes_placeholder, value: item.notes ?? "", onChange: (e) => updateBrainstormItem(index, { notes: e.target.value || null }) }), _jsx(Input, { label: te.suggested_by_label, placeholder: te.name_placeholder, value: item.suggested_by ?? "", onChange: (e) => updateBrainstormItem(index, { suggested_by: e.target.value || null }) })] })] }, item.id))) })), _jsxs(Button, { type: "button", variant: "outline", onClick: addBrainstormItemRow, children: [_jsx(Plus, { size: 16 }), " ", te.add_brainstorm_idea] })] }) }), _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex items-end justify-between gap-4 flex-wrap", children: _jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.25em] text-gray-400", children: te.question_flow }), _jsx("h2", { className: "mt-2 text-2xl font-display font-bold text-gray-900", children: te.question_flow_title }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: te.question_flow_sub })] }) }), questions.map((q, qi) => (_jsx(QuestionCard, { question: q, index: qi, onUpdate: (patch) => updateQuestion(qi, patch), onRemove: () => removeQuestion(qi), onUpdateAnswer: (ai, patch) => updateAnswer(qi, ai, patch), onAddAnswer: () => addAnswer(qi), onRemoveAnswer: (ai) => removeAnswer(qi, ai), onSetCorrect: (ai) => setCorrectAnswer(qi, ai, q.type === "multiple"), onChangeType: (type) => changeType(qi, type) }, q.id))), _jsxs("button", { onClick: addQuestion, className: "w-full rounded-[28px] border-2 border-dashed border-brand-200 bg-gradient-to-br from-white to-brand-50/40 p-8\r\n                     text-brand-500 hover:text-brand-700 hover:border-brand-400 transition-colors\r\n                     flex items-center justify-center gap-2 font-semibold", children: [_jsx(Plus, { size: 20 }), " ", te.add_question] })] })] }));
}
function QuestionCard({ question: q, index, onUpdate, onRemove, onUpdateAnswer, onAddAnswer, onRemoveAnswer, onSetCorrect, onChangeType, }) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const { t } = useI18n();
    const te = t.editor;
    const typeLabel = QUESTION_TYPE_LABELS[q.type];
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
    return (_jsxs(Card, { className: `border-l-4 ${borderColor} shadow-[0_18px_40px_rgba(15,23,42,0.05)]`, children: [_jsxs("div", { className: "flex items-start gap-3 mb-4", children: [_jsx("div", { className: "p-1.5 text-gray-300 cursor-grab mt-1", "aria-hidden": true, children: _jsx(GripVertical, { size: 16 }) }), _jsxs("div", { className: "mt-1 shrink-0 rounded-2xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-500", children: ["Q", index + 1] }), _jsxs("div", { className: "flex-1 space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 text-xs font-semibold", children: [_jsx("span", { className: "rounded-full bg-brand-50 px-2.5 py-1 text-brand-700", children: typeLabel }), _jsxs("span", { className: "rounded-full bg-gray-100 px-2.5 py-1 text-gray-600", children: [q.time_limit, "s"] }), _jsxs("span", { className: "rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700", children: [q.points, " pts"] }), q.answer_options.length > 0 && (_jsxs("span", { className: "rounded-full bg-amber-50 px-2.5 py-1 text-amber-700", children: [q.answer_options.length, " choices"] }))] }), _jsx("textarea", { className: "input resize-none text-base font-medium", rows: 2, placeholder: te.your_question, value: q.text, onChange: (e) => onUpdate({ text: e.target.value }), "aria-label": `Question ${index + 1} text` })] }), _jsx("button", { onClick: () => onUpdate({ _expanded: !q._expanded }), className: "p-2 text-gray-400 hover:text-gray-600 shrink-0", "aria-label": q._expanded ? "Collapse" : "Expand", children: q._expanded ? _jsx(ChevronUp, { size: 18 }) : _jsx(ChevronDown, { size: 18 }) }), _jsx("button", { onClick: onRemove, className: "p-2 text-gray-400 hover:text-danger-500 shrink-0", "aria-label": `Remove question ${index + 1}`, children: _jsx(Trash2, { size: 16 }) })] }), q._expanded && (_jsxs("div", { className: "space-y-4 pl-10", children: [_jsxs("div", { className: "rounded-2xl bg-gray-50 p-4", children: [_jsx("div", { className: "mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400", children: te.question_settings }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.type_label }), _jsxs("select", { className: "input py-2 text-sm", value: q.type, onChange: (e) => onChangeType(e.target.value), "aria-label": te.type_label, children: [_jsx("option", { value: "classic", children: t.quiz.type_classic }), _jsx("option", { value: "multiple", children: t.quiz.type_multiple }), _jsx("option", { value: "truefalse", children: t.quiz.type_truefalse }), _jsx("option", { value: "typeanswer", children: t.quiz.type_typeanswer }), _jsx("option", { value: "slider", children: t.quiz.type_slider }), _jsx("option", { value: "puzzle", children: t.quiz.type_puzzle }), _jsx("option", { value: "pinanswer", children: t.quiz.type_pinanswer }), _jsxs("option", { value: "audioclip", children: ["\uD83C\uDFB5 ", t.quiz.type_classic === "Single answer" ? "Song clip" : "Songclip"] }), _jsxs("option", { value: "videoclip", children: ["\uD83C\uDFAC ", t.quiz.type_classic === "Single answer" ? "Video / movie clip" : "Video / filmclip"] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.time_label }), _jsx("select", { className: "input py-2 text-sm", value: q.time_limit, onChange: (e) => onUpdate({ time_limit: Number(e.target.value) }), "aria-label": "Time limit", children: [5, 10, 15, 20, 30, 45, 60, 90, 120].map((s) => (_jsxs("option", { value: s, children: [s, "s"] }, s))) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.points_label }), _jsx("select", { className: "input py-2 text-sm", value: q.points, onChange: (e) => onUpdate({ points: Number(e.target.value) }), "aria-label": "Points value", children: [500, 1000, 2000].map((p) => (_jsx("option", { value: p, children: p }, p))) })] })] })] }), _jsxs("div", { className: "rounded-2xl bg-white border border-gray-100 p-4", children: [_jsx("div", { className: "mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400", children: te.visual_prompt }), q.image_url ? (_jsxs("div", { className: "relative inline-block", children: [_jsx("img", { src: q.image_url, alt: "Question image", className: "max-h-40 rounded-xl object-cover border border-gray-200" }), _jsx("button", { onClick: () => onUpdate({ image_url: null }), className: "absolute top-1 right-1 p-1 bg-white rounded-full shadow text-gray-600 hover:text-danger-500", "aria-label": "Remove image", children: _jsx(Trash2, { size: 14 }) })] })) : (_jsxs("label", { className: "inline-flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-brand-600 transition-colors", children: [_jsx("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", className: "sr-only", onChange: handleImageUpload, "aria-label": "Upload question image" }), uploading ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Upload, { size: 16, className: "animate-spin" }), " ", te.uploading] })) : (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Image, { size: 16 }), " ", te.add_image] }))] })), uploadError && (_jsx("p", { role: "alert", className: "text-xs text-danger-500 mt-1", children: uploadError }))] }), q.type === "slider" && (_jsxs("div", { className: "space-y-3 bg-gray-50 rounded-xl p-3", children: [_jsx("p", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide", children: te.slider_config }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.slider_min }), _jsx("input", { type: "number", title: "Slider minimum value", className: "input py-2 text-sm", value: q.config?.min ?? 0, onChange: (e) => onUpdate({ config: { ...q.config, min: Number(e.target.value) } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.slider_max }), _jsx("input", { type: "number", title: "Slider maximum value", className: "input py-2 text-sm", value: q.config?.max ?? 100, onChange: (e) => onUpdate({ config: { ...q.config, max: Number(e.target.value) } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.slider_step }), _jsx("input", { type: "number", title: "Slider step value", className: "input py-2 text-sm", min: 0.01, value: q.config?.step ?? 1, onChange: (e) => onUpdate({ config: { ...q.config, step: Number(e.target.value) } }) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.slider_correct }), _jsx("input", { type: "number", title: "Slider correct value", className: "input py-2 text-sm border-emerald-400 bg-emerald-50", value: q.config?.correct ?? 50, onChange: (e) => onUpdate({ config: { ...q.config, correct: Number(e.target.value) } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.slider_tolerance }), _jsx("input", { type: "number", title: "Slider tolerance value", className: "input py-2 text-sm", min: 0, value: q.config?.tolerance ?? 5, onChange: (e) => onUpdate({ config: { ...q.config, tolerance: Number(e.target.value) } }) })] })] })] })), q.type === "pinanswer" && (_jsxs("div", { className: "space-y-3 bg-gray-50 rounded-xl p-3", children: [_jsx("p", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide", children: te.pin_config }), q.image_url ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "relative inline-block cursor-crosshair rounded-xl overflow-hidden border-2 border-dashed border-brand-300", role: "button", "aria-label": "Click to set hotspot position", onClick: (e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = (e.clientX - rect.left) / rect.width;
                                            const y = (e.clientY - rect.top) / rect.height;
                                            onUpdate({ config: { ...q.config, hotspotX: x, hotspotY: y } });
                                        }, children: [_jsx("img", { src: q.image_url, alt: "Question image", className: "max-h-48 block" }), q.config?.hotspotX !== undefined && (_jsx("div", { className: "absolute pointer-events-none rounded-full border-4 border-emerald-500 bg-emerald-500/20 -translate-x-1/2 -translate-y-1/2", style: {
                                                    left: `${(q.config.hotspotX) * 100}%`,
                                                    top: `${(q.config.hotspotY) * 100}%`,
                                                    width: `${(q.config.hotspotRadius) * 200}%`,
                                                    aspectRatio: "1",
                                                } }))] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.pin_radius }), _jsx("input", { type: "range", title: "Pin answer hotspot radius", min: 0.02, max: 0.4, step: 0.01, className: "w-full accent-brand-500", value: q.config?.hotspotRadius ?? 0.1, onChange: (e) => onUpdate({ config: { ...q.config, hotspotRadius: Number(e.target.value) } }) })] })] })) : (_jsxs("p", { className: "text-sm text-amber-600", children: ["\u26A0\uFE0F ", te.pin_upload_first] }))] })), (q.type === "audioclip" || q.type === "videoclip") && (_jsxs("div", { className: "space-y-3 bg-gray-50 rounded-xl p-3", children: [_jsx("p", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide", children: q.type === "audioclip" ? `🎵 ${te.song_clip_config}` : `🎬 ${te.video_clip_config}` }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.media_url_label }), _jsx("input", { type: "url", title: "Media URL", className: "input py-2 text-sm", placeholder: te.media_url_placeholder, value: q.config?.mediaUrl ?? "", onChange: (e) => onUpdate({ config: { ...q.config, mediaUrl: e.target.value } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: q.type === "audioclip" ? te.correct_song_title : te.correct_movie_title }), _jsx("input", { type: "text", title: "Correct title", className: "input py-2 text-sm border-emerald-400 bg-emerald-50", placeholder: q.type === "audioclip" ? te.song_title_placeholder : te.movie_title_placeholder, value: q.config?.songTitle ?? "", onChange: (e) => onUpdate({ config: { ...q.config, songTitle: e.target.value } }) })] }), q.type === "audioclip" && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.artist_label }), _jsx("input", { type: "text", title: "Artist name", className: "input py-2 text-sm", placeholder: te.artist_placeholder, value: q.config?.songArtist ?? "", onChange: (e) => onUpdate({ config: { ...q.config, songArtist: e.target.value } }) })] }), q.config?.songArtist && (_jsxs("div", { children: [_jsx("label", { className: "label text-xs", children: te.artist_points_label }), _jsx("input", { type: "number", title: "Artist bonus points", className: "input py-2 text-sm", min: 0, step: 100, value: q.config?.artistPoints ?? 500, onChange: (e) => onUpdate({ config: { ...q.config, artistPoints: Number(e.target.value) } }) })] }))] }))] })), q.type !== "slider" && q.type !== "pinanswer" && q.type !== "audioclip" && q.type !== "videoclip" && (_jsxs("div", { className: "space-y-2", children: [q.type === "typeanswer" && (_jsx("p", { className: "text-xs text-gray-500", children: te.typeanswer_hint })), q.type === "puzzle" && (_jsx("p", { className: "text-xs text-gray-500", children: te.puzzle_hint })), q.answer_options.map((a, ai) => (_jsxs("div", { className: "flex items-center gap-2", children: [q.type !== "puzzle" && q.type !== "typeanswer" && (q.type === "multiple" ? (_jsx("input", { type: "checkbox", checked: a.is_correct, onChange: () => onSetCorrect(ai), className: "w-4 h-4 accent-emerald-500 shrink-0", "aria-label": `Mark answer ${ai + 1} as correct` })) : (_jsx("input", { type: "radio", name: `correct-${q.id}`, checked: a.is_correct, onChange: () => onSetCorrect(ai), disabled: q.type === "truefalse", className: "w-4 h-4 accent-emerald-500 shrink-0", "aria-label": `Mark answer ${ai + 1} as correct` }))), q.type === "puzzle" && (_jsx("span", { className: "w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0", children: ai + 1 })), _jsx("input", { type: "text", className: `input py-2 flex-1 text-sm ${(q.type !== "puzzle" && q.type !== "typeanswer") && a.is_correct
                                            ? "border-emerald-400 bg-emerald-50"
                                            : q.type === "typeanswer" ? "border-emerald-400 bg-emerald-50" : ""}`, placeholder: q.type === "typeanswer" ? interp(te.acceptable_answer, { n: ai + 1 }) : q.type === "puzzle" ? interp(te.puzzle_item, { n: ai + 1 }) : interp(te.answer_n, { n: ai + 1 }), value: a.text, onChange: (e) => onUpdateAnswer(ai, { text: e.target.value }), readOnly: q.type === "truefalse", "aria-label": `Answer option ${ai + 1}` }), q.type !== "truefalse" && q.answer_options.length > (q.type === "typeanswer" ? 1 : 2) && (_jsx("button", { onClick: () => onRemoveAnswer(ai), className: "p-1.5 text-gray-400 hover:text-danger-500", "aria-label": `Remove answer ${ai + 1}`, children: _jsx(Trash2, { size: 14 }) }))] }, a.id))), q.type !== "truefalse" && q.answer_options.length < (q.type === "typeanswer" ? 5 : 6) && (_jsxs("button", { onClick: onAddAnswer, className: "text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1", children: [_jsx(Plus, { size: 14 }), " ", q.type === "typeanswer" ? te.add_acceptable_answer : q.type === "puzzle" ? te.add_puzzle_item : te.add_option] }))] }))] }))] }));
}
