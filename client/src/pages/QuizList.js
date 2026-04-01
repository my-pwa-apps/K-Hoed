import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Edit, Trash2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { quizApi, gameApi } from "@/lib/api";
import { pluralise } from "@/lib/utils";
export default function QuizList() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { data: quizzes, isLoading } = useQuery({
        queryKey: ["quizzes"],
        queryFn: quizApi.list,
    });
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [hostError, setHostError] = useState(null);
    const deleteMutation = useMutation({
        mutationFn: (id) => quizApi.delete(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["quizzes"] });
            setDeleteTarget(null);
        },
    });
    const duplicateMutation = useMutation({
        mutationFn: (id) => quizApi.duplicate(id),
        onSuccess: () => void qc.invalidateQueries({ queryKey: ["quizzes"] }),
    });
    const hostMutation = useMutation({
        mutationFn: (quizId) => gameApi.create(quizId),
        onSuccess: (data) => navigate(`/host/${data.session_id}/lobby`),
        onError: (err) => setHostError(err instanceof Error ? err.message : "Failed to create game"),
    });
    const handleExport = async (quiz) => {
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
        return (_jsx("div", { className: "flex items-center justify-center h-64 text-gray-400", children: "Loading quizzes\u2026" }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-display font-bold text-gray-900", children: "My Quizzes" }), _jsx(Link, { to: "/quizzes/new", children: _jsxs(Button, { children: [_jsx(Plus, { size: 16 }), " New quiz"] }) })] }), hostError && (_jsx("p", { role: "alert", className: "text-sm text-danger-500", children: hostError })), !quizzes?.length ? (_jsxs(Card, { className: "flex flex-col items-center justify-center py-20 text-center", children: [_jsx("span", { className: "text-5xl mb-4", children: "\uD83D\uDCDD" }), _jsx("h2", { className: "text-xl font-semibold text-gray-700 mb-2", children: "No quizzes yet" }), _jsx("p", { className: "text-gray-400 mb-6", children: "Create your first quiz and start hosting!" }), _jsx(Link, { to: "/quizzes/new", children: _jsxs(Button, { children: [_jsx(Plus, { size: 16 }), " Create a quiz"] }) })] })) : (_jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: quizzes.map((quiz) => (_jsxs(Card, { children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-2", children: [_jsx("h2", { className: "font-semibold text-gray-900 leading-snug line-clamp-2", children: quiz.title }), quiz.is_public && (_jsx("span", { className: "badge bg-brand-100 text-brand-700 shrink-0", children: "Public" }))] }), quiz.description && (_jsx("p", { className: "text-sm text-gray-500 line-clamp-2 mb-2", children: quiz.description })), _jsx("p", { className: "text-xs text-gray-400 mb-4", children: pluralise(quiz.question_count ?? 0, "question") }), !!quiz.brainstorm?.length && (_jsx("p", { className: "text-xs text-amber-700 mb-4 font-medium", children: pluralise(quiz.brainstorm.length, "brainstorm idea") })), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { size: "sm", onClick: () => hostMutation.mutate(quiz.id), loading: hostMutation.isPending && hostMutation.variables === quiz.id, disabled: (quiz.question_count ?? 0) === 0, title: (quiz.question_count ?? 0) === 0 ? "Add questions first" : "Start game", children: [_jsx(Play, { size: 14 }), " Play"] }), _jsx(Link, { to: `/quizzes/${quiz.id}/edit`, children: _jsxs(Button, { variant: "secondary", size: "sm", children: [_jsx(Edit, { size: 14 }), " Edit"] }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => duplicateMutation.mutate(quiz.id), title: "Duplicate", children: _jsx(Copy, { size: 14 }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleExport(quiz), title: "Export JSON", children: _jsx(Download, { size: 14 }) }), _jsx(Button, { variant: "ghost", size: "sm", className: "text-danger-500 hover:text-danger-700 hover:bg-danger-50", onClick: () => setDeleteTarget(quiz), title: "Delete", children: _jsx(Trash2, { size: 14 }) })] })] }, quiz.id))) })), _jsxs(Modal, { open: !!deleteTarget, onClose: () => setDeleteTarget(null), title: "Delete quiz", size: "sm", children: [_jsxs("p", { className: "text-gray-600 mb-6", children: ["Are you sure you want to delete ", _jsx("strong", { children: deleteTarget?.title }), "? This cannot be undone."] }), _jsxs("div", { className: "flex gap-3 justify-end", children: [_jsx(Button, { variant: "ghost", onClick: () => setDeleteTarget(null), children: "Cancel" }), _jsx(Button, { variant: "danger", loading: deleteMutation.isPending, onClick: () => deleteTarget && deleteMutation.mutate(deleteTarget.id), children: "Delete" })] })] })] }));
}
