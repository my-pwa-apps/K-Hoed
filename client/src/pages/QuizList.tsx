import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Edit, Trash2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { quizApi, gameApi } from "@/lib/api";
import type { Quiz } from "@/lib/types";
import { pluralise } from "@/lib/utils";

export default function QuizList() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: quizApi.list,
  });

  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quizApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["quizzes"] });
      setDeleteTarget(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => quizApi.duplicate(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });

  const hostMutation = useMutation({
    mutationFn: (quizId: string) => gameApi.create(quizId),
    onSuccess: (data) => navigate(`/host/${data.session_id}/lobby`),
    onError: (err) => setHostError(err instanceof Error ? err.message : "Failed to create game"),
  });

  const handleExport = async (quiz: Quiz) => {
    const full = await quizApi.exportJson(quiz.id);
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quiz.title.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading quizzes…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">My Quizzes</h1>
        <Link to="/quizzes/new">
          <Button>
            <Plus size={16} /> New quiz
          </Button>
        </Link>
      </div>

      {hostError && (
        <p role="alert" className="text-sm text-danger-500">
          {hostError}
        </p>
      )}

      {!quizzes?.length ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📝</span>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No quizzes yet</h2>
          <p className="text-gray-400 mb-6">Create your first quiz and start hosting!</p>
          <Link to="/quizzes/new">
            <Button>
              <Plus size={16} /> Create a quiz
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="font-semibold text-gray-900 leading-snug line-clamp-2">
                  {quiz.title}
                </h2>
                {quiz.is_public && (
                  <span className="badge bg-brand-100 text-brand-700 shrink-0">Public</span>
                )}
              </div>
              {quiz.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">{quiz.description}</p>
              )}
              <p className="text-xs text-gray-400 mb-4">
                {pluralise(quiz.question_count ?? 0, "question")}
              </p>
              {!!quiz.brainstorm?.length && (
                <p className="text-xs text-amber-700 mb-4 font-medium">
                  {pluralise(quiz.brainstorm.length, "brainstorm idea")}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => hostMutation.mutate(quiz.id)}
                  loading={hostMutation.isPending && hostMutation.variables === quiz.id}
                  disabled={(quiz.question_count ?? 0) === 0}
                  title={(quiz.question_count ?? 0) === 0 ? "Add questions first" : "Start game"}
                >
                  <Play size={14} /> Play
                </Button>
                <Link to={`/quizzes/${quiz.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    <Edit size={14} /> Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateMutation.mutate(quiz.id)}
                  title="Duplicate"
                >
                  <Copy size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExport(quiz)}
                  title="Export JSON"
                >
                  <Download size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-500 hover:text-danger-700 hover:bg-danger-50"
                  onClick={() => setDeleteTarget(quiz)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete quiz"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This cannot be
          undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
