import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { gameApi } from "@/lib/api";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

export default function GameResults() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["results", sessionId],
    queryFn: () => gameApi.results(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading) {
    return <div className="text-center py-20 text-gray-400">Loading results…</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Results not found</p>
        <Link to="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  const { session, players } = data;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const duration = session.ended_at && session.started_at
    ? Math.round((session.ended_at - session.started_at) / 1000)
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/quizzes">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} /> Quizzes
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Game Results
          </h1>
          <p className="text-gray-500 text-sm">
            Room code: <strong className="font-mono text-brand-600">{session.room_code}</strong>
            {duration && ` · ${Math.floor(duration / 60)}m ${duration % 60}s`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <Users className="mx-auto text-brand-400 mb-2" />
          <p className="text-3xl font-bold text-gray-900">{players.length}</p>
          <p className="text-sm text-gray-500">Players</p>
        </Card>
        <Card className="text-center">
          <Trophy className="mx-auto text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-gray-900 truncate">
            {sortedPlayers[0]?.display_name ?? "—"}
          </p>
          <p className="text-sm text-gray-500">Winner</p>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4">Final standings</h2>
        <div className="space-y-2">
          {sortedPlayers.map((player, i) => (
            <div
              key={player.id}
              className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
            >
              <span className="w-7 text-center font-bold text-gray-400 text-sm">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <PlayerAvatar
                value={player.avatar_emoji}
                playerId={player.id}
                name={player.display_name}
                size="sm"
                aria-hidden
              />
              <span className="flex-1 font-medium text-gray-800">{player.display_name}</span>
              <span className="font-bold tabular-nums text-gray-900">
                {player.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <Link to="/quizzes" className="flex-1">
          <Button variant="secondary" fullWidth>
            Back to quizzes
          </Button>
        </Link>
        <Link to="/dashboard" className="flex-1">
          <Button fullWidth>Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
