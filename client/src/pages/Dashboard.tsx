import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Play, BarChart3, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { gameApi, quizApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: quizzes } = useQuery({
    queryKey: ["quizzes"],
    queryFn: quizApi.list,
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: gameApi.listSessions,
  });

  const recentSessions = sessions?.slice(0, 5) ?? [];
  const quizCount = quizzes?.length ?? 0;
  const endedSessions = sessions?.filter((s) => s.status === "ended").length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Welcome back, {user?.display_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Ready to host your next quiz?</p>
        </div>
        <Link to="/quizzes/new">
          <Button size="lg">
            <Plus size={18} />
            New quiz
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={<BookOpen />} label="Total quizzes" value={quizCount} />
        <StatCard icon={<Play />} label="Games played" value={endedSessions} />
        <StatCard
          icon={<BarChart3 />}
          label="Questions created"
          value={quizzes?.reduce((s, q) => s + (q.question_count ?? 0), 0) ?? 0}
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0 shadow-lg">
          <h2 className="font-display font-bold text-xl mb-2">Start a game</h2>
          <p className="text-white/80 text-sm mb-4">
            Pick a quiz, get a room code, and go live instantly.
          </p>
          <Link to="/quizzes">
            <Button variant="secondary" size="sm">
              Choose quiz
            </Button>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-accent-500 to-rose-500 text-white border-0 shadow-lg">
          <h2 className="font-display font-bold text-xl mb-2">Create a quiz</h2>
          <p className="text-white/80 text-sm mb-4">
            Build your own questions with timers and answer choices.
          </p>
          <Link to="/quizzes/new">
            <Button variant="secondary" size="sm">
              Start building
            </Button>
          </Link>
        </Card>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent sessions</h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm"
              >
                <div>
                  <span className="font-mono font-bold text-brand-600 text-lg">
                    {session.room_code}
                  </span>
                  <span className="ml-3 text-sm text-gray-500">
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className={`badge ${
                    session.status === "ended"
                      ? "bg-gray-100 text-gray-600"
                      : session.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-brand-100 text-brand-700"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-brand-50 rounded-xl text-brand-600">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}
