import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Play, BarChart3, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { gameApi, quizApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useI18n, interp } from "@/i18n";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { t } = useI18n();

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
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            {interp(t.dashboard.welcome, { name: user?.display_name?.split(" ")[0] ?? "" })}
          </h1>
          <p className="text-gray-500 mt-1">{t.dashboard.subtitle}</p>
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
        <StatCard icon={<BookOpen />} label={t.dashboard.total_quizzes} value={quizCount} />
        <StatCard icon={<Play />} label={t.dashboard.games_played} value={endedSessions} />
        <StatCard
          icon={<BarChart3 />}
          label={t.dashboard.questions_created}
          value={quizzes?.reduce((s, q) => s + (q.question_count ?? 0), 0) ?? 0}
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0 shadow-lg">
          <h2 className="font-display font-bold text-xl mb-2">{t.dashboard.start_game_title}</h2>
          <p className="text-white/80 text-sm mb-4">{t.dashboard.start_game_body}</p>
          <Link to="/quizzes">
            <Button variant="secondary" size="sm">{t.dashboard.choose_quiz}</Button>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-accent-500 to-rose-500 text-white border-0 shadow-lg">
          <h2 className="font-display font-bold text-xl mb-2">{t.dashboard.create_quiz_title}</h2>
          <p className="text-white/80 text-sm mb-4">{t.dashboard.create_quiz_body}</p>
          <Link to="/quizzes/new">
            <Button variant="secondary" size="sm">{t.dashboard.start_building}</Button>
          </Link>
        </Card>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">{t.dashboard.recent_games}</h2>
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
