import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Layout from "@/components/layout/Layout";

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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/join" element={<PlayerJoin />} />
        <Route path="/join/:code" element={<PlayerJoin />} />
        <Route path="/play" element={<PlayerGame />} />
        <Route path="/results/:sessionId" element={<GameResults />} />

        {/* Protected host routes */}
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quizzes" element={<QuizList />} />
          <Route path="/quizzes/new" element={<QuizEditor />} />
          <Route path="/quizzes/:id/edit" element={<QuizEditor />} />
          <Route path="/host/:sessionId/lobby" element={<HostLobby />} />
          <Route path="/host/:sessionId/game" element={<HostGame />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
