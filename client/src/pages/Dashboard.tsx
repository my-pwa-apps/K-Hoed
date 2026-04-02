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
    <div className="space-y-3 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-display font-bold text-gray-900">
            {interp(t.dashboard.welcome, { name: user?.display_name?.split(" ")[0] ?? "" })}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 sm:mt-1">{t.dashboard.subtitle}</p>
        </div>
        <Link to="/quizzes/new">
          <Button size="sm" className="sm:text-base">
            <Plus size={16} />
            New quiz
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard icon={<BookOpen />} label={t.dashboard.total_quizzes} value={quizCount} />
        <StatCard icon={<Play />} label={t.dashboard.games_played} value={endedSessions} />
        <StatCard
          icon={<BarChart3 />}
          label={t.dashboard.questions_created}
          value={quizzes?.reduce((s, q) => s + (q.question_count ?? 0), 0) ?? 0}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0 shadow-lg px-3 py-3 sm:p-6">
          <h2 className="font-display font-bold text-xs sm:text-xl sm:mb-2 leading-snug">{t.dashboard.start_game_title}</h2>
          <p className="text-white/80 text-xs hidden sm:block sm:mb-4">{t.dashboard.start_game_body}</p>
          <Link to="/quizzes" className="block mt-2">
            <Button variant="secondary" size="sm" fullWidth>{t.dashboard.choose_quiz}</Button>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-accent-500 to-rose-500 text-white border-0 shadow-lg px-3 py-3 sm:p-6">
          <h2 className="font-display font-bold text-xs sm:text-xl sm:mb-2 leading-snug">{t.dashboard.create_quiz_title}</h2>
          <p className="text-white/80 text-xs hidden sm:block sm:mb-4">{t.dashboard.create_quiz_body}</p>
          <Link to="/quizzes/new" className="block mt-2">
            <Button variant="secondary" size="sm" fullWidth>{t.dashboard.start_building}</Button>
          </Link>
        </Card>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <h2 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">{t.dashboard.recent_games}</h2>
          <div className="space-y-1.5 sm:space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between bg-white rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-gray-100 shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-brand-600 text-sm sm:text-lg shrink-0">
                    {session.room_code}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 truncate">
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className={`badge text-xs shrink-0 ml-2 ${
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
    <Card className="p-2.5 sm:p-5">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="p-1.5 sm:p-3 bg-brand-50 rounded-xl text-brand-600 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-lg sm:text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          <p className="text-xs text-gray-500 leading-tight">{label}</p>
        </div>
      </div>
    </Card>
  );
}
