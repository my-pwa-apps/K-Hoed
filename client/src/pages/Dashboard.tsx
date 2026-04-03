import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Play, BarChart3, BookOpen, Sparkles, Clock3, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { gameApi, quizApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useI18n, interp } from "@/i18n";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { t } = useI18n();
  const te = t.dashboard_extra;

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
  const draftQuizzes = quizzes?.slice(0, 4) ?? [];
  const firstName = user?.display_name?.split(" ")[0] ?? "there";
  const totalQuestions = quizzes?.reduce((sum, quiz) => sum + (quiz.question_count ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.85),_rgba(255,255,255,0.96)_35%,_rgba(240,244,255,1)_100%)] shadow-[0_24px_80px_rgba(79,98,245,0.14)]">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr] items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-brand-700 shadow-sm">
              <Sparkles size={14} /> {te.quiz_studio}
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-5xl font-bold leading-none text-gray-900">
                {interp(t.dashboard.welcome, { name: firstName })}
              </h1>
              <p className="max-w-2xl text-sm sm:text-base leading-7 text-gray-600">
                {te.hero_sub}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/quizzes/new">
                <Button size="lg" className="shadow-lg shadow-brand-500/20">
                  <Plus size={18} /> {te.create_new_quiz}
                </Button>
              </Link>
              <Link to="/quizzes">
                <Button size="lg" variant="outline" className="bg-white/80 border-white hover:bg-white">
                  <Play size={18} /> {te.start_from_library}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <SpotlightCard
              icon={<BookOpen />}
              label={t.dashboard.total_quizzes}
              value={quizCount}
              tone="bg-[#fff7ed] text-[#9a3412]"
            />
            <SpotlightCard
              icon={<BarChart3 />}
              label={t.dashboard.questions_created}
              value={totalQuestions}
              tone="bg-[#eef2ff] text-[#3730a3]"
            />
            <SpotlightCard
              icon={<Wand2 />}
              label={t.dashboard.games_played}
              value={endedSessions}
              tone="bg-[#ecfeff] text-[#155e75]"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-0 bg-gradient-to-br from-brand-600 via-brand-700 to-[#1f3367] text-white shadow-[0_20px_60px_rgba(49,75,160,0.24)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              <Clock3 size={14} /> {te.quick_launch}
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold">{t.dashboard.start_game_title}</h2>
              <p className="text-sm leading-7 text-white/80">{t.dashboard.start_game_body}</p>
            </div>
            <Link to="/quizzes" className="inline-flex">
              <Button variant="secondary" size="lg" className="bg-white text-brand-700 hover:bg-white/90">
                {t.dashboard.choose_quiz} <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-[#ffedd5] via-white to-[#ffe4e6] shadow-[0_18px_50px_rgba(244,114,182,0.16)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 shadow-sm">
              <Sparkles size={14} /> {te.fresh_ideas}
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-gray-900">{t.dashboard.create_quiz_title}</h2>
              <p className="text-sm leading-7 text-gray-600">{t.dashboard.create_quiz_body}</p>
            </div>
            <Link to="/quizzes/new" className="inline-flex">
              <Button size="lg" className="bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20">
                {t.dashboard.start_building}
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{te.build_next}</p>
            <h2 className="font-display text-2xl font-bold text-gray-900">{te.your_quiz_library}</h2>
            </div>
            <Link to="/quizzes">
              <Button variant="ghost" size="sm">{te.open_all}</Button>
            </Link>
          </div>

          {draftQuizzes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {draftQuizzes.map((quiz, index) => (
                <Link key={quiz.id} to={`/quizzes/${quiz.id}/edit`}>
                  <div className="group rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold ${index % 3 === 0 ? "bg-brand-100 text-brand-700" : index % 3 === 1 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {index + 1}
                      </div>
                      <ArrowRight size={16} className="text-gray-300 transition-colors group-hover:text-brand-600" />
                    </div>
                    <div className="mt-4 space-y-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{quiz.title}</h3>
                      <p className="text-sm text-gray-500">
                        {interp(te.n_questions, { n: quiz.question_count ?? 0 })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              {te.no_quizzes_yet}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{te.recent_activity}</p>
            <h2 className="font-display text-2xl font-bold text-gray-900">{te.room_history}</h2>
          </div>

          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-lg font-bold text-brand-600">{session.room_code}</div>
                    <div className="text-sm text-gray-500">{new Date(session.created_at).toLocaleDateString()}</div>
                  </div>
                  <span
                    className={`badge shrink-0 ${
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
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              {te.no_games_yet}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SpotlightCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-3xl p-4 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-white/70 p-3 shadow-sm [&>svg]:h-5 [&>svg]:w-5">
        {icon}
        </div>
        <p className="text-3xl font-bold leading-none tabular-nums">{value}</p>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{label}</p>
    </div>
  );
}
