import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Image, Upload, Lightbulb, ArrowRight, CheckCircle2, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { quizApi, uploadApi, brainstormApi } from "@/lib/api";
import type { QuestionType, QuestionConfig, SliderConfig, PinAnswerConfig, BrainstormItem, BrainstormStatus } from "@/lib/types";
import { newLocalId } from "@/pages/QuizEditor.utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DraftAnswer {
  id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

interface DraftQuestion {
  id: string;
  text: string;
  image_url: string | null;
  type: QuestionType;
  time_limit: number;
  points: number;
  order_index: number;
  answer_options: DraftAnswer[];  config: QuestionConfig | null;  _expanded: boolean;
}

function createDraftQuestion(orderIndex: number, text = ""): DraftQuestion {
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

function createBrainstormItem(): BrainstormItem {
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [brainstorm, setBrainstorm] = useState<BrainstormItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Brainstorm collab state
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteWorking, setInviteWorking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load existing quiz
  const { isLoading } = useQuery({
    queryKey: ["quiz", id],
    queryFn: () => quizApi.get(id!),
    enabled: !isNew,
    select: (quiz) => quiz,
  });

  const { data: existing } = useQuery({
    queryKey: ["quiz", id],
    queryFn: () => quizApi.get(id!),
    enabled: !isNew,
  });

  // Poll brainstorm items from DB to pick up collaborator additions
  const pollBrainstorm = async () => {
    if (!id) return;
    try {
      const quiz = await quizApi.get(id);
      const remote = quiz.brainstorm ?? [];
      setBrainstorm((local) => {
        const localIds = new Set(local.map((i) => i.id));
        const newItems = remote.filter((i) => !localIds.has(i.id));
        return newItems.length > 0 ? [...local, ...newItems] : local;
      });
    } catch {
      // silent — don't disrupt editor on poll failure
    }
  };

  useEffect(() => {
    if (!id) return;
    pollRef.current = setInterval(pollBrainstorm, 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopyInviteLink = async () => {
    if (!id) return;
    setInviteWorking(true);
    try {
      const { token } = await brainstormApi.getInvite(id);
      const url = `${window.location.origin}/brainstorm/${token}`;
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 3000);
    } catch {
      // ignore clipboard errors
    } finally {
      setInviteWorking(false);
    }
  };

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? "");
      setIsPublic(existing.is_public);
      setBrainstorm(existing.brainstorm ?? []);
      setQuestions(
        (existing.questions ?? []).map((q) => ({
          ...q,
          id: q.id ?? newLocalId(),
          config: (q.config as QuestionConfig | null | undefined) ?? null,
          _expanded: false,
          answer_options: q.answer_options as DraftAnswer[],
        })),
      );
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
          answer_options: q.answer_options.map((a, ai) => ({
            id: a.id.startsWith("local-") ? undefined : a.id,
            text: a.text,
            is_correct: a.is_correct,
            order_index: ai,
          })),
        })),
      };
      if (isNew) return quizApi.create(payload);
      return quizApi.update(id!, payload);
    },
    onSuccess: (quiz) => {
      void qc.invalidateQueries({ queryKey: ["quizzes"] });
      if (isNew) navigate(`/quizzes/${quiz.id}/edit`);
    },
    onError: (err) => setSaveError(err instanceof Error ? err.message : "Save failed"),
  });

  // ── Question helpers ─────────────────────────────────────────────────────

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createDraftQuestion(prev.length)]);
  };

  const removeQuestion = (idx: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== idx));

  const updateQuestion = (idx: number, patch: Partial<DraftQuestion>) =>
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  const updateAnswer = (qi: number, ai: number, patch: Partial<DraftAnswer>) =>
    updateQuestion(qi, {
      answer_options: questions[qi]!.answer_options.map((a, i) =>
        i === ai ? { ...a, ...patch } : a,
      ),
    });

  const addAnswer = (qi: number) => {
    const q = questions[qi]!;
    if (q.answer_options.length >= 6) return;
    updateQuestion(qi, {
      answer_options: [
        ...q.answer_options,
        { id: newLocalId(), text: "", is_correct: false, order_index: q.answer_options.length },
      ],
    });
  };

  const removeAnswer = (qi: number, ai: number) =>
    updateQuestion(qi, {
      answer_options: questions[qi]!.answer_options.filter((_, i) => i !== ai),
    });

  const setCorrectAnswer = (qi: number, ai: number, isMultiple: boolean) => {
    const q = questions[qi]!;
    updateQuestion(qi, {
      answer_options: q.answer_options.map((a, i) => ({
        ...a,
        is_correct: isMultiple ? (i === ai ? !a.is_correct : a.is_correct) : i === ai,
      })),
    });
  };

  const changeType = (qi: number, type: QuestionType) => {
    const q = questions[qi]!;
    let options = q.answer_options;
    let config: QuestionConfig | null = null;
    if (type === "truefalse") {
      options = [
        { id: newLocalId(), text: "True", is_correct: true, order_index: 0 },
        { id: newLocalId(), text: "False", is_correct: false, order_index: 1 },
      ];
    } else if (type === "slider") {
      options = [];
      config = { min: 0, max: 100, step: 1, correct: 50, tolerance: 5 } as SliderConfig;
    } else if (type === "pinanswer") {
      options = [];
      config = { hotspotX: 0.5, hotspotY: 0.5, hotspotRadius: 0.1 } as PinAnswerConfig;
    } else if (type === "typeanswer") {
      // Correct answers are the acceptable text answers
      options = [
        { id: newLocalId(), text: "", is_correct: true, order_index: 0 },
      ];
    } else if (type === "puzzle") {
      // All items are part of the puzzle; correct order = array order
      options = (options.length >= 2 ? options : [
        { id: newLocalId(), text: "", is_correct: true, order_index: 0 },
        { id: newLocalId(), text: "", is_correct: true, order_index: 1 },
        { id: newLocalId(), text: "", is_correct: true, order_index: 2 },
      ]).map((a) => ({ ...a, is_correct: true }));
    } else if (type === "classic") {
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
        options = [{ ...options[0]!, is_correct: true }, ...options.slice(1)];
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

  const updateBrainstormItem = (idx: number, patch: Partial<BrainstormItem>) => {
    setBrainstorm((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeBrainstormItem = (idx: number) => {
    setBrainstorm((prev) => prev.filter((_, i) => i !== idx));
  };

  const convertIdeaToQuestion = (idx: number) => {
    const item = brainstorm[idx];
    if (!item?.text.trim()) return;

    setQuestions((prev) => [...prev, createDraftQuestion(prev.length, item.text.trim())]);
    updateBrainstormItem(idx, { status: "added" });
  };

  const brainstormCounts = brainstorm.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { proposed: 0, shortlisted: 0, added: 0 } as Record<BrainstormStatus, number>,
  );

  if (!isNew && isLoading) {
    return <div className="text-gray-400 text-center py-20">Loading quiz…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-gray-900">
          {isNew ? "New quiz" : "Edit quiz"}
        </h1>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate("/quizzes")}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!title.trim()}
          >
            {isNew ? "Create quiz" : "Save changes"}
          </Button>
        </div>
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-danger-500">
          {saveError}
        </p>
      )}

      {/* Quiz meta */}
      <Card>
        <div className="space-y-4">
          <Input
            label="Quiz title"
            required
            placeholder="e.g. General Knowledge Round"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label="Description (optional)"
            placeholder="A short description of the quiz"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Make quiz publicly discoverable
            </span>
          </label>
        </div>
      </Card>

      <Card className="border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <Lightbulb size={18} />
                <h2 className="font-display font-bold text-xl text-gray-900">Brainstorm area</h2>
              </div>
              <p className="text-sm text-gray-600 max-w-2xl">
                Park ideas here before they become real quiz questions. Shortlist the strongest ones,
                then move them into the game when you are ready.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={inviteWorking}
                  onClick={handleCopyInviteLink}
                  title="Copy a link that anyone can use to add brainstorm ideas — no account needed"
                >
                  {inviteCopied ? <RefreshCw size={14} className="text-emerald-600" /> : <Link2 size={14} />}
                  {inviteCopied ? "Link copied!" : "Invite to brainstorm"}
                </Button>
              )}
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                  {brainstormCounts.proposed} proposed
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  {brainstormCounts.shortlisted} shortlisted
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  {brainstormCounts.added} added to quiz
                </span>
              </div>
            </div>
          </div>

          {brainstorm.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-white/70 p-6 text-center text-sm text-gray-500">
              No ideas yet. Start capturing rough question prompts, funny twists, or topics to agree on later.
            </div>
          ) : (
            <div className="space-y-4">
              {brainstorm.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-amber-200 bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                      <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                        {index + 1}
                      </span>
                      Idea
                      {item.suggested_by && (
                        <span className="text-xs font-normal text-brand-500 ml-1">
                          · suggested by {item.suggested_by}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        className="input py-2 text-sm min-w-[150px]"
                        value={item.status}
                        onChange={(e) => updateBrainstormItem(index, { status: e.target.value as BrainstormStatus })}
                        aria-label={`Brainstorm status ${index + 1}`}
                      >
                        <option value="proposed">Proposed</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="added">Added to quiz</option>
                      </select>
                      <Button
                        type="button"
                        variant={item.status === "added" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => convertIdeaToQuestion(index)}
                        disabled={!item.text.trim()}
                      >
                        {item.status === "added" ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
                        {item.status === "added" ? "Question created" : "Turn into question"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger-500 hover:text-danger-700 hover:bg-danger-50"
                        onClick={() => removeBrainstormItem(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <Input
                    label="Idea"
                    placeholder="e.g. Should we do a round about weird Dutch traditions?"
                    value={item.text}
                    onChange={(e) => updateBrainstormItem(index, { text: e.target.value })}
                  />

                  <div className="grid sm:grid-cols-[minmax(0,1fr)_180px] gap-3">
                    <Textarea
                      label="Notes"
                      placeholder="Add angle, possible answers, jokes, or concerns to discuss later"
                      value={item.notes ?? ""}
                      onChange={(e) => updateBrainstormItem(index, { notes: e.target.value || null })}
                    />
                    <Input
                      label="Suggested by"
                      placeholder="Name"
                      value={item.suggested_by ?? ""}
                      onChange={(e) => updateBrainstormItem(index, { suggested_by: e.target.value || null })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" onClick={addBrainstormItemRow}>
            <Plus size={16} /> Add brainstorm idea
          </Button>
        </div>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={qi}
            onUpdate={(patch) => updateQuestion(qi, patch)}
            onRemove={() => removeQuestion(qi)}
            onUpdateAnswer={(ai, patch) => updateAnswer(qi, ai, patch)}
            onAddAnswer={() => addAnswer(qi)}
            onRemoveAnswer={(ai) => removeAnswer(qi, ai)}
            onSetCorrect={(ai) => setCorrectAnswer(qi, ai, q.type === "multiple")}
            onChangeType={(type) => changeType(qi, type)}
          />
        ))}

        <button
          onClick={addQuestion}
          className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-6
                     text-gray-400 hover:text-brand-600 hover:border-brand-400 transition-colors
                     flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={20} /> Add question
        </button>
      </div>
    </div>
  );
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: DraftQuestion;
  index: number;
  onUpdate: (patch: Partial<DraftQuestion>) => void;
  onRemove: () => void;
  onUpdateAnswer: (ai: number, patch: Partial<DraftAnswer>) => void;
  onAddAnswer: () => void;
  onRemoveAnswer: (ai: number) => void;
  onSetCorrect: (ai: number) => void;
  onChangeType: (type: QuestionType) => void;
}

function QuestionCard({
  question: q,
  index,
  onUpdate,
  onRemove,
  onUpdateAnswer,
  onAddAnswer,
  onRemoveAnswer,
  onSetCorrect,
  onChangeType,
}: QuestionCardProps) {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadApi.image(file);
      onUpdate({ image_url: url });
    } catch {
      // TODO: show upload error to user
    } finally {
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

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-1.5 text-gray-300 cursor-grab mt-1" aria-hidden>
          <GripVertical size={16} />
        </div>
        <span className="text-sm font-bold text-gray-400 mt-2.5 shrink-0">Q{index + 1}</span>
        <div className="flex-1">
          <textarea
            className="input resize-none text-base font-medium"
            rows={2}
            placeholder="Your question…"
            value={q.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            aria-label={`Question ${index + 1} text`}
          />
        </div>
        <button
          onClick={() => onUpdate({ _expanded: !q._expanded })}
          className="p-2 text-gray-400 hover:text-gray-600 shrink-0"
          aria-label={q._expanded ? "Collapse" : "Expand"}
        >
          {q._expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <button
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-danger-500 shrink-0"
          aria-label={`Remove question ${index + 1}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {q._expanded && (
        <div className="space-y-4 pl-10">
          {/* Settings row */}
          <div className="flex flex-wrap gap-3">
            {/* Type */}
            <div>
              <label className="label text-xs">Type</label>
              <select
                className="input py-2 text-sm"
                value={q.type}
                onChange={(e) => onChangeType(e.target.value as QuestionType)}
                aria-label="Question type"
              >
                <option value="classic">Single answer</option>
                <option value="multiple">Multiple answers</option>
                <option value="truefalse">True / False</option>
                <option value="typeanswer">Type answer</option>
                <option value="slider">Slider</option>
                <option value="puzzle">Puzzle (order)</option>
                <option value="pinanswer">Pin answer</option>
              </select>
            </div>

            {/* Timer */}
            <div>
              <label className="label text-xs">Time (s)</label>
              <select
                className="input py-2 text-sm"
                value={q.time_limit}
                onChange={(e) => onUpdate({ time_limit: Number(e.target.value) })}
                aria-label="Time limit"
              >
                {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((s) => (
                  <option key={s} value={s}>
                    {s}s
                  </option>
                ))}
              </select>
            </div>

            {/* Points */}
            <div>
              <label className="label text-xs">Points</label>
              <select
                className="input py-2 text-sm"
                value={q.points}
                onChange={(e) => onUpdate({ points: Number(e.target.value) })}
                aria-label="Points value"
              >
                {[500, 1000, 2000].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Image */}
          <div>
            {q.image_url ? (
              <div className="relative inline-block">
                <img
                  src={q.image_url}
                  alt="Question image"
                  className="max-h-40 rounded-xl object-cover border border-gray-200"
                />
                <button
                  onClick={() => onUpdate({ image_url: null })}
                  className="absolute top-1 right-1 p-1 bg-white rounded-full shadow text-gray-600 hover:text-danger-500"
                  aria-label="Remove image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-brand-600 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={handleImageUpload}
                  aria-label="Upload question image"
                />
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Upload size={16} className="animate-spin" /> Uploading…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Image size={16} /> Add image (optional)
                  </span>
                )}
              </label>
            )}
          </div>

          {/* Answers section — varies by type */}
          {q.type === "slider" && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Slider config</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label text-xs">Min</label>
                  <input type="number" title="Slider minimum value" className="input py-2 text-sm" value={(q.config as SliderConfig | null)?.min ?? 0}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), min: Number(e.target.value) } })} />
                </div>
                <div>
                  <label className="label text-xs">Max</label>
                  <input type="number" title="Slider maximum value" className="input py-2 text-sm" value={(q.config as SliderConfig | null)?.max ?? 100}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), max: Number(e.target.value) } })} />
                </div>
                <div>
                  <label className="label text-xs">Step</label>
                  <input type="number" title="Slider step value" className="input py-2 text-sm" min={0.01} value={(q.config as SliderConfig | null)?.step ?? 1}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), step: Number(e.target.value) } })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Correct answer</label>
                  <input type="number" title="Slider correct value" className="input py-2 text-sm border-emerald-400 bg-emerald-50" value={(q.config as SliderConfig | null)?.correct ?? 50}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), correct: Number(e.target.value) } })} />
                </div>
                <div>
                  <label className="label text-xs">Tolerance (±)</label>
                  <input type="number" title="Slider tolerance value" className="input py-2 text-sm" min={0} value={(q.config as SliderConfig | null)?.tolerance ?? 5}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), tolerance: Number(e.target.value) } })} />
                </div>
              </div>
            </div>
          )}

          {q.type === "pinanswer" && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pin answer — click image to set hotspot</p>
              {q.image_url ? (
                <div className="space-y-2">
                  <div
                    className="relative inline-block cursor-crosshair rounded-xl overflow-hidden border-2 border-dashed border-brand-300"
                    role="button"
                    aria-label="Click to set hotspot position"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const x = (e.clientX - rect.left) / rect.width;
                      const y = (e.clientY - rect.top) / rect.height;
                      onUpdate({ config: { ...(q.config as PinAnswerConfig), hotspotX: x, hotspotY: y } });
                    }}
                  >
                    <img src={q.image_url} alt="Question image" className="max-h-48 block" />
                    {(q.config as PinAnswerConfig | null)?.hotspotX !== undefined && (
                      <div
                        className="absolute pointer-events-none rounded-full border-4 border-emerald-500 bg-emerald-500/20 -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${((q.config as PinAnswerConfig).hotspotX) * 100}%`,
                          top: `${((q.config as PinAnswerConfig).hotspotY) * 100}%`,
                          width: `${((q.config as PinAnswerConfig).hotspotRadius) * 200}%`,
                          aspectRatio: "1",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="label text-xs">Hotspot radius (fraction of image width: 0.02–0.4)</label>
                    <input type="range" title="Pin answer hotspot radius" min={0.02} max={0.4} step={0.01}
                      className="w-full accent-brand-500"
                      value={(q.config as PinAnswerConfig | null)?.hotspotRadius ?? 0.1}
                      onChange={(e) => onUpdate({ config: { ...(q.config as PinAnswerConfig), hotspotRadius: Number(e.target.value) } })} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-600">⚠️ Upload an image above, then click it to set the correct hotspot.</p>
              )}
            </div>
          )}

          {/* Classic answer options — hidden for slider, pinanswer */}
          {q.type !== "slider" && q.type !== "pinanswer" && (
          <div className="space-y-2">
            {q.type === "typeanswer" && (
              <p className="text-xs text-gray-500">Acceptable answers — player’s text must match one (case-insensitive).</p>
            )}
            {q.type === "puzzle" && (
              <p className="text-xs text-gray-500">Items in order shown here — players will see them shuffled.</p>
            )}
            {q.answer_options.map((a, ai) => (
              <div key={a.id} className="flex items-center gap-2">
                {/* Correct toggle — hidden for puzzle/typeanswer (all are "correct") */}
                {q.type !== "puzzle" && q.type !== "typeanswer" && (
                  q.type === "multiple" ? (
                    <input type="checkbox" checked={a.is_correct} onChange={() => onSetCorrect(ai)}
                      className="w-4 h-4 accent-emerald-500 shrink-0" aria-label={`Mark answer ${ai + 1} as correct`} />
                  ) : (
                    <input type="radio" name={`correct-${q.id}`} checked={a.is_correct} onChange={() => onSetCorrect(ai)}
                      disabled={q.type === "truefalse"}
                      className="w-4 h-4 accent-emerald-500 shrink-0" aria-label={`Mark answer ${ai + 1} as correct`} />
                  )
                )}

                {q.type === "puzzle" && (
                  <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0">{ai + 1}</span>
                )}

                <input
                  type="text"
                  className={`input py-2 flex-1 text-sm ${
                    (q.type !== "puzzle" && q.type !== "typeanswer") && a.is_correct
                      ? "border-emerald-400 bg-emerald-50"
                      : q.type === "typeanswer" ? "border-emerald-400 bg-emerald-50" : ""
                  }`}
                  placeholder={q.type === "typeanswer" ? `Acceptable answer ${ai + 1}` : q.type === "puzzle" ? `Item ${ai + 1}` : `Answer ${ai + 1}`}
                  value={a.text}
                  onChange={(e) => onUpdateAnswer(ai, { text: e.target.value })}
                  readOnly={q.type === "truefalse"}
                  aria-label={`Answer option ${ai + 1}`}
                />

                {q.type !== "truefalse" && q.answer_options.length > (q.type === "typeanswer" ? 1 : 2) && (
                  <button onClick={() => onRemoveAnswer(ai)}
                    className="p-1.5 text-gray-400 hover:text-danger-500"
                    aria-label={`Remove answer ${ai + 1}`}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            {q.type !== "truefalse" && q.answer_options.length < (q.type === "typeanswer" ? 5 : 6) && (
              <button onClick={onAddAnswer}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                <Plus size={14} /> {q.type === "typeanswer" ? "Add acceptable answer" : q.type === "puzzle" ? "Add item" : "Add option"}
              </button>
            )}
          </div>
          )}
        </div>
      )}
    </Card>
  );
}
