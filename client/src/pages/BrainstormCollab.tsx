import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Lightbulb, Plus, Trash2, RefreshCw } from "lucide-react";
import { brainstormApi, ApiError } from "@/lib/api";
import type { BrainstormItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const POLL_INTERVAL_MS = 10_000;

export default function BrainstormCollab() {
  const { token } = useParams<{ token: string }>();

  const [quizTitle, setQuizTitle] = useState<string | null>(null);
  const [items, setItems] = useState<BrainstormItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [name, setName] = useState(() => localStorage.getItem("brainstorm_name") ?? "");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      const data = await brainstormApi.getByToken(token);
      setQuizTitle(data.quiz_title);
      setItems(data.items);
      setLastUpdated(new Date());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load brainstorm board");
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !name.trim() || !text.trim()) return;
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
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to add idea");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!token) return;
    try {
      await brainstormApi.deleteItem(token, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {
      // silent — item may already have been removed
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-brand-900 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center space-y-3">
          <Lightbulb size={40} className="mx-auto text-amber-400" />
          <h1 className="text-xl font-display font-bold text-gray-900">Brainstorm not found</h1>
          <p className="text-sm text-gray-500">{loadError}</p>
          <p className="text-sm text-gray-400">
            The invite link may have been revoked by the quiz owner.
          </p>
        </Card>
      </div>
    );
  }

  if (!quizTitle) {
    return (
      <div className="min-h-screen bg-brand-900 flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-white opacity-60" />
      </div>
    );
  }

  const proposed = items.filter((i) => i.status === "proposed");
  const shortlisted = items.filter((i) => i.status === "shortlisted");
  const added = items.filter((i) => i.status === "added");

  return (
    <div className="min-h-screen bg-brand-900 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-amber-300 mb-2">
            <Lightbulb size={28} />
            <span className="text-sm font-semibold uppercase tracking-widest">Brainstorm</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white">{quizTitle}</h1>
          <p className="text-sm text-brand-300">
            Add your question ideas below. They'll appear in the quiz editor for the owner to review.
          </p>
          {lastUpdated && (
            <p className="text-xs text-brand-400">
              Last updated {lastUpdated.toLocaleTimeString()} · auto-refreshes every 10 s
            </p>
          )}
        </div>

        {/* Add idea form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-display font-bold text-gray-900 text-lg">Add an idea</h2>

            <Input
              label="Your name"
              required
              placeholder="e.g. Sofia"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Idea / question topic"
              required
              placeholder="e.g. What is the capital of Belgium?"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Textarea
              label="Notes (optional)"
              placeholder="Context, source, why it's a good question…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {submitError && (
              <p className="text-sm text-danger-500" role="alert">{submitError}</p>
            )}
            {submitSuccess && (
              <p className="text-sm text-emerald-600 font-medium">Idea added!</p>
            )}

            <Button
              type="submit"
              loading={submitting}
              disabled={!name.trim() || !text.trim()}
              fullWidth
            >
              <Plus size={16} />
              Add to brainstorm
            </Button>
          </form>
        </Card>

        {/* Ideas board */}
        {items.length === 0 ? (
          <Card className="text-center text-gray-400 text-sm py-8">
            No ideas yet — be the first to add one!
          </Card>
        ) : (
          <div className="space-y-4">
            {[
              { label: "Proposed", list: proposed, bg: "bg-white", badge: "bg-gray-100 text-gray-600" },
              { label: "Shortlisted", list: shortlisted, bg: "bg-amber-50", badge: "bg-amber-100 text-amber-800" },
              { label: "Added to quiz", list: added, bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
            ]
              .filter(({ list }) => list.length > 0)
              .map(({ label, list, bg, badge }) => (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge}`}>
                      {label} · {list.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {list.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border border-amber-200 ${bg} px-4 py-3 flex gap-3 items-start`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 break-words">{item.text}</p>
                          {item.notes && (
                            <p className="text-xs text-gray-500 mt-1 break-words">{item.notes}</p>
                          )}
                          {item.suggested_by && (
                            <p className="text-xs text-brand-500 mt-1 font-medium">
                              — {item.suggested_by}
                            </p>
                          )}
                        </div>
                        {item.status !== "added" && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            aria-label="Remove idea"
                            className="text-gray-400 hover:text-danger-500 transition-colors shrink-0 mt-0.5"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
