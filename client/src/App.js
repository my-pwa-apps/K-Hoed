import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Layout from "@/components/layout/Layout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import QuizList from "@/pages/QuizList";
import QuizEditor from "@/pages/QuizEditor";
import HostLobby from "@/pages/HostLobby";
import HostGame from "@/pages/HostGame";
import PlayerJoin from "@/pages/PlayerJoin";
import PlayerGame from "@/pages/PlayerGame";
import GameResults from "@/pages/GameResults";
import NotFound from "@/pages/NotFound";
import BrainstormCollab from "@/pages/BrainstormCollab";
function RequireAuth({ children }) {
    const token = useAuthStore((s) => s.token);
    const location = useLocation();
    if (!token)
        return _jsx(Navigate, { to: `/login?returnTo=${encodeURIComponent(location.pathname)}`, replace: true });
    return _jsx(_Fragment, { children: children });
}
export default function App() {
    return (_jsx(ErrorBoundary, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Landing, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/join", element: _jsx(PlayerJoin, {}) }), _jsx(Route, { path: "/join/:code", element: _jsx(PlayerJoin, {}) }), _jsx(Route, { path: "/play", element: _jsx(PlayerGame, {}) }), _jsx(Route, { path: "/results/:sessionId", element: _jsx(GameResults, {}) }), _jsx(Route, { path: "/brainstorm/:token", element: _jsx(BrainstormCollab, {}) }), _jsxs(Route, { element: _jsx(RequireAuth, { children: _jsx(Layout, {}) }), children: [_jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/quizzes", element: _jsx(QuizList, {}) }), _jsx(Route, { path: "/quizzes/new", element: _jsx(QuizEditor, {}) }), _jsx(Route, { path: "/quizzes/:id/edit", element: _jsx(QuizEditor, {}) }), _jsx(Route, { path: "/host/:sessionId/lobby", element: _jsx(HostLobby, {}) }), _jsx(Route, { path: "/host/:sessionId/game", element: _jsx(HostGame, {}) })] }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }) }));
}
