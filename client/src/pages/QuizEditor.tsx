import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Image, Upload, Lightbulb, ArrowRight, CheckCircle2, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { quizApi, uploadApi, brainstormApi } from "@/lib/api";
import type { QuestionType, QuestionConfig, SliderConfig, PinAnswerConfig, MediaClipConfig, BrainstormItem, BrainstormStatus } from "@/lib/types";
import { newLocalId } from "@/pages/QuizEditor.utils";
import { useI18n, interp } from "@/i18n";

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

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const te = t.editor;
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
    } else if (type === "audioclip") {
      options = [];
      config = { mediaUrl: "", songTitle: "", songArtist: "", artistPoints: 500 } as MediaClipConfig;
    } else if (type === "videoclip") {
      options = [];
      config = { mediaUrl: "", songTitle: "" } as MediaClipConfig;
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
    return <div className="text-gray-400 text-center py-20">{te.loading_quiz}</div>;
  }

  const canSave =
    title.trim().length > 0 &&
    (questions.length === 0 ||
      questions.every(
        (q) =>
          q.type === "slider" ||
          q.type === "pinanswer" ||
          q.answer_options.some((a) => a.is_correct && a.text.trim().length > 0),
      ));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(255,251,235,0.98)_42%,_rgba(238,242,255,1)_100%)] shadow-[0_24px_80px_rgba(79,98,245,0.12)]">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-brand-700 shadow-sm">
              <Lightbulb size={14} /> {te.admin_studio}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl font-display font-bold leading-none text-gray-900">
                {isNew ? te.new_hero : te.edit_hero}
              </h1>
              <p className="max-w-3xl text-sm sm:text-base leading-7 text-gray-600">
                {te.hero_sub}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white px-3 py-1.5 text-gray-600 shadow-sm">{interp(te.questions_count, { n: questions.length })}</span>
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">{interp(te.active_ideas, { n: brainstormCounts.proposed + brainstormCounts.shortlisted })}</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700">{interp(te.converted, { n: brainstormCounts.added })}</span>
            </div>
          </div>

          <div className="rounded-[28px] bg-white/85 p-4 shadow-lg shadow-brand-500/10">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{te.publishing_panel}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-[#eef2ff] px-3 py-4">
                  <p className="text-2xl font-bold text-brand-700">{questions.length}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700/70">{te.stat_questions}</p>
                </div>
                <div className="rounded-2xl bg-[#fff7ed] px-3 py-4">
                  <p className="text-2xl font-bold text-amber-700">{brainstorm.length}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700/70">{te.stat_ideas}</p>
                </div>
                <div className="rounded-2xl bg-[#ecfeff] px-3 py-4">
                  <p className="text-2xl font-bold text-cyan-700">{isPublic ? te.public_on : te.public_off}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700/70">{te.stat_public}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="ghost" onClick={() => navigate("/quizzes")}>
                  {t.common.cancel}
                </Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  loading={saveMutation.isPending}
                  disabled={!canSave}
                  className="shadow-lg shadow-brand-500/20"
                >
                  {isNew ? t.quiz.new_quiz : t.quiz.save}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {saveError && (
        <p role="alert" className="text-sm text-danger-500">
          {saveError}
        </p>
      )}

      {/* Quiz meta */}
      <Card className="border-0 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{te.quiz_setup}</p>
            <h2 className="mt-2 text-2xl font-display font-bold text-gray-900">{te.quiz_setup_sub}</h2>
          </div>
          <Input
            label={t.quiz.title_label}
            required
            placeholder={t.quiz.title_placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label={t.quiz.description_label}
            placeholder={t.quiz.description_label}
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
              {te.make_public}
            </span>
          </label>
        </div>
      </Card>

      <Card className="border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-[#fff7ed] shadow-[0_18px_50px_rgba(245,158,11,0.10)]">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <Lightbulb size={18} />
                <h2 className="font-display font-bold text-xl text-gray-900">{te.brainstorm_title}</h2>
              </div>
              <p className="text-sm text-gray-600 max-w-2xl">
                {te.brainstorm_sub}
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
                  {inviteCopied ? te.link_copied : te.invite_brainstorm}
                </Button>
              )}
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                  {brainstormCounts.proposed} {te.proposed}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  {brainstormCounts.shortlisted} {te.shortlisted}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  {brainstormCounts.added} {te.added_to_quiz}
                </span>
              </div>
            </div>
          </div>

          {brainstorm.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-white/70 p-6 text-center text-sm text-gray-500">
              {te.brainstorm_empty}
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
                      {te.idea}
                      {item.suggested_by && (
                        <span className="text-xs font-normal text-brand-500 ml-1">
                          · {interp(te.suggested_by, { name: item.suggested_by })}
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
                        <option value="proposed">{te.status_proposed}</option>
                        <option value="shortlisted">{te.status_shortlisted}</option>
                        <option value="added">{te.status_added}</option>
                      </select>
                      <Button
                        type="button"
                        variant={item.status === "added" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => convertIdeaToQuestion(index)}
                        disabled={!item.text.trim()}
                      >
                        {item.status === "added" ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
                        {item.status === "added" ? te.question_created : te.turn_into_question}
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
                    label={te.idea_label}
                    placeholder={te.idea_placeholder}
                    value={item.text}
                    onChange={(e) => updateBrainstormItem(index, { text: e.target.value })}
                  />

                  <div className="grid sm:grid-cols-[minmax(0,1fr)_180px] gap-3">
                    <Textarea
                      label={te.notes_label}
                      placeholder={te.notes_placeholder}
                      value={item.notes ?? ""}
                      onChange={(e) => updateBrainstormItem(index, { notes: e.target.value || null })}
                    />
                    <Input
                      label={te.suggested_by_label}
                      placeholder={te.name_placeholder}
                      value={item.suggested_by ?? ""}
                      onChange={(e) => updateBrainstormItem(index, { suggested_by: e.target.value || null })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" onClick={addBrainstormItemRow}>
            <Plus size={16} /> {te.add_brainstorm_idea}
          </Button>
        </div>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{te.question_flow}</p>
            <h2 className="mt-2 text-2xl font-display font-bold text-gray-900">{te.question_flow_title}</h2>
            <p className="mt-1 text-sm text-gray-500">{te.question_flow_sub}</p>
          </div>
        </div>

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
          className="w-full rounded-[28px] border-2 border-dashed border-brand-200 bg-gradient-to-br from-white to-brand-50/40 p-8
                     text-brand-500 hover:text-brand-700 hover:border-brand-400 transition-colors
                     flex items-center justify-center gap-2 font-semibold"
        >
          <Plus size={20} /> {te.add_question}
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { t } = useI18n();
  const te = t.editor;
  const typeLabel = QUESTION_TYPE_LABELS[q.type];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await uploadApi.image(file);
      onUpdate({ image_url: url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try a smaller image.");
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
    <Card className={`border-l-4 ${borderColor} shadow-[0_18px_40px_rgba(15,23,42,0.05)]`}>
      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-1.5 text-gray-300 cursor-grab mt-1" aria-hidden>
          <GripVertical size={16} />
        </div>
        <div className="mt-1 shrink-0 rounded-2xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-500">Q{index + 1}</div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">{typeLabel}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{q.time_limit}s</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{q.points} pts</span>
            {q.answer_options.length > 0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{q.answer_options.length} choices</span>
            )}
          </div>
          <textarea
            className="input resize-none text-base font-medium"
            rows={2}
            placeholder={te.your_question}
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
          <div className="rounded-2xl bg-gray-50 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{te.question_settings}</div>
          <div className="flex flex-wrap gap-3">
            {/* Type */}
            <div>
              <label className="label text-xs">{te.type_label}</label>
              <select
                className="input py-2 text-sm"
                value={q.type}
                onChange={(e) => onChangeType(e.target.value as QuestionType)}
                aria-label={te.type_label}
              >
                <option value="classic">{t.quiz.type_classic}</option>
                <option value="multiple">{t.quiz.type_multiple}</option>
                <option value="truefalse">{t.quiz.type_truefalse}</option>
                <option value="typeanswer">{t.quiz.type_typeanswer}</option>
                <option value="slider">{t.quiz.type_slider}</option>
                <option value="puzzle">{t.quiz.type_puzzle}</option>
                <option value="pinanswer">{t.quiz.type_pinanswer}</option>
                <option value="audioclip">🎵 {t.quiz.type_classic === "Single answer" ? "Song clip" : "Songclip"}</option>
                <option value="videoclip">🎬 {t.quiz.type_classic === "Single answer" ? "Video / movie clip" : "Video / filmclip"}</option>
              </select>
            </div>

            {/* Timer */}
            <div>
              <label className="label text-xs">{te.time_label}</label>
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
              <label className="label text-xs">{te.points_label}</label>
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
          </div>

          {/* Image */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{te.visual_prompt}</div>
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
                    <Upload size={16} className="animate-spin" /> {te.uploading}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Image size={16} /> {te.add_image}
                  </span>
                )}
              </label>
            )}
            {uploadError && (
              <p role="alert" className="text-xs text-danger-500 mt-1">{uploadError}</p>
            )}
          </div>

          {/* Answers section — varies by type */}
          {q.type === "slider" && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{te.slider_config}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label text-xs">{te.slider_min}</label>
                  <input type="number" title="Slider minimum value" className="input py-2 text-sm" value={(q.config as SliderConfig | null)?.min ?? 0}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), min: Number(e.target.value) } })} />
                </div>
                <div>
                  <label className="label text-xs">{te.slider_max}</label>
                  <input type="number" title="Slider maximum value" className="input py-2 text-sm" value={(q.config as SliderConfig | null)?.max ?? 100}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), max: Number(e.target.value) } })} />
                </div>
                <div>
                  <label className="label text-xs">{te.slider_step}</label>
                  <input type="number" title="Slider step value" className="input py-2 text-sm" min={0.01} value={(q.config as SliderConfig | null)?.step ?? 1}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), step: Number(e.target.value) } })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">{te.slider_correct}</label>
                  <input type="number" title="Slider correct value" className="input py-2 text-sm border-emerald-400 bg-emerald-50" value={(q.config as SliderConfig | null)?.correct ?? 50}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), correct: Number(e.target.value) } })} />
                </div>
                <div>
                  <label className="label text-xs">{te.slider_tolerance}</label>
                  <input type="number" title="Slider tolerance value" className="input py-2 text-sm" min={0} value={(q.config as SliderConfig | null)?.tolerance ?? 5}
                    onChange={(e) => onUpdate({ config: { ...(q.config as SliderConfig), tolerance: Number(e.target.value) } })} />
                </div>
              </div>
            </div>
          )}

          {q.type === "pinanswer" && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{te.pin_config}</p>
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
                    <label className="label text-xs">{te.pin_radius}</label>
                    <input type="range" title="Pin answer hotspot radius" min={0.02} max={0.4} step={0.01}
                      className="w-full accent-brand-500"
                      value={(q.config as PinAnswerConfig | null)?.hotspotRadius ?? 0.1}
                      onChange={(e) => onUpdate({ config: { ...(q.config as PinAnswerConfig), hotspotRadius: Number(e.target.value) } })} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-600">⚠️ {te.pin_upload_first}</p>
              )}
            </div>
          )}

          {/* Media clip config */}
          {(q.type === "audioclip" || q.type === "videoclip") && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {q.type === "audioclip" ? `🎵 ${te.song_clip_config}` : `🎬 ${te.video_clip_config}`}
              </p>
              <div>
                <label className="label text-xs">{te.media_url_label}</label>
                <input
                  type="url"
                  title="Media URL"
                  className="input py-2 text-sm"
                  placeholder={te.media_url_placeholder}
                  value={(q.config as MediaClipConfig | null)?.mediaUrl ?? ""}
                  onChange={(e) => onUpdate({ config: { ...(q.config as MediaClipConfig), mediaUrl: e.target.value } })}
                />
              </div>
              <div>
                <label className="label text-xs">{q.type === "audioclip" ? te.correct_song_title : te.correct_movie_title}</label>
                <input
                  type="text"
                  title="Correct title"
                  className="input py-2 text-sm border-emerald-400 bg-emerald-50"
                  placeholder={q.type === "audioclip" ? te.song_title_placeholder : te.movie_title_placeholder}
                  value={(q.config as MediaClipConfig | null)?.songTitle ?? ""}
                  onChange={(e) => onUpdate({ config: { ...(q.config as MediaClipConfig), songTitle: e.target.value } })}
                />
              </div>
              {q.type === "audioclip" && (
                <>
                  <div>
                    <label className="label text-xs">{te.artist_label}</label>
                    <input
                      type="text"
                      title="Artist name"
                      className="input py-2 text-sm"
                      placeholder={te.artist_placeholder}
                      value={(q.config as MediaClipConfig | null)?.songArtist ?? ""}
                      onChange={(e) => onUpdate({ config: { ...(q.config as MediaClipConfig), songArtist: e.target.value } })}
                    />
                  </div>
                  {(q.config as MediaClipConfig | null)?.songArtist && (
                    <div>
                      <label className="label text-xs">{te.artist_points_label}</label>
                      <input
                        type="number"
                        title="Artist bonus points"
                        className="input py-2 text-sm"
                        min={0}
                        step={100}
                        value={(q.config as MediaClipConfig | null)?.artistPoints ?? 500}
                        onChange={(e) => onUpdate({ config: { ...(q.config as MediaClipConfig), artistPoints: Number(e.target.value) } })}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Classic answer options — hidden for slider, pinanswer, audioclip, videoclip */}
          {q.type !== "slider" && q.type !== "pinanswer" && q.type !== "audioclip" && q.type !== "videoclip" && (
          <div className="space-y-2">
            {q.type === "typeanswer" && (
              <p className="text-xs text-gray-500">{te.typeanswer_hint}</p>
            )}
            {q.type === "puzzle" && (
              <p className="text-xs text-gray-500">{te.puzzle_hint}</p>
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
                  placeholder={q.type === "typeanswer" ? interp(te.acceptable_answer, { n: ai + 1 }) : q.type === "puzzle" ? interp(te.puzzle_item, { n: ai + 1 }) : interp(te.answer_n, { n: ai + 1 })}
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
                <Plus size={14} /> {q.type === "typeanswer" ? te.add_acceptable_answer : q.type === "puzzle" ? te.add_puzzle_item : te.add_option}
              </button>
            )}
          </div>
          )}
        </div>
      )}
    </Card>
  );
}
