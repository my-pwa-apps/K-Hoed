import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Image, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { quizApi, uploadApi } from "@/lib/api";
import type { QuestionType } from "@/lib/types";
import { newLocalId } from "./QuizEditor.utils";

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
  answer_options: DraftAnswer[];
  _expanded: boolean;
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
  const [saveError, setSaveError] = useState<string | null>(null);

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

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? "");
      setIsPublic(existing.is_public);
      setQuestions(
        (existing.questions ?? []).map((q) => ({
          ...q,
          id: q.id ?? newLocalId(),
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
    const q: DraftQuestion = {
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
    if (type === "truefalse") {
      options = [
        { id: newLocalId(), text: "True", is_correct: true, order_index: 0 },
        { id: newLocalId(), text: "False", is_correct: false, order_index: 1 },
      ];
    } else if (type === "classic") {
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
        options = [{ ...options[0]!, is_correct: true }, ...options.slice(1)];
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

          {/* Answers */}
          <div className="space-y-2">
            {q.answer_options.map((a, ai) => (
              <div key={a.id} className="flex items-center gap-2">
                {/* Correct toggle */}
                {q.type === "multiple" ? (
                  <input
                    type="checkbox"
                    checked={a.is_correct}
                    onChange={() => onSetCorrect(ai)}
                    className="w-4 h-4 accent-emerald-500 shrink-0"
                    aria-label={`Mark answer ${ai + 1} as correct`}
                  />
                ) : (
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={a.is_correct}
                    onChange={() => onSetCorrect(ai)}
                    disabled={q.type === "truefalse"}
                    className="w-4 h-4 accent-emerald-500 shrink-0"
                    aria-label={`Mark answer ${ai + 1} as correct`}
                  />
                )}

                <input
                  type="text"
                  className={`input py-2 flex-1 text-sm ${a.is_correct ? "border-emerald-400 bg-emerald-50" : ""}`}
                  placeholder={`Answer ${ai + 1}`}
                  value={a.text}
                  onChange={(e) => onUpdateAnswer(ai, { text: e.target.value })}
                  readOnly={q.type === "truefalse"}
                  aria-label={`Answer option ${ai + 1}`}
                />

                {q.type !== "truefalse" && q.answer_options.length > 2 && (
                  <button
                    onClick={() => onRemoveAnswer(ai)}
                    className="p-1.5 text-gray-400 hover:text-danger-500"
                    aria-label={`Remove answer ${ai + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            {q.type !== "truefalse" && q.answer_options.length < 6 && (
              <button
                onClick={onAddAnswer}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                <Plus size={14} /> Add option
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
