import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Users, BarChart3, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";

export default function Landing() {
  const isAuthenticated = useAuthStore((s) => !!s.token);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-800 to-accent-600 text-white overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="font-display font-bold text-2xl flex items-center gap-2">
          <span aria-hidden>🎯</span> K-Hoed
        </span>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="secondary" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="sm">
                  Sign up free
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap size={14} className="text-accent-400" />
            Real-time multiplayer quizzes
          </div>

          <h1 className="font-display font-extrabold text-5xl sm:text-7xl leading-tight mb-6 text-shadow">
            Host live quizzes <br />
            <span className="text-accent-400">your crowd will love</span>
          </h1>

          <p className="text-xl text-white/75 max-w-2xl mx-auto mb-10">
            Create a quiz, share the room code, and watch players answer in real time on
            any device. Instant scoring, live leaderboards, and zero setup.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="xl" className="bg-accent-500 hover:bg-accent-600 text-white shadow-xl">
                Create a quiz free
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link to="/join">
              <Button
                size="xl"
                variant="ghost"
                className="text-white border-2 border-white/30 hover:bg-white/10"
              >
                Join a game
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-5"
            >
              <div className="text-accent-400 mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-white/65 text-sm">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center pb-8 text-white/40 text-sm">
        Built on Cloudflare · K-Hoed
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: <Zap size={24} />,
    title: "Instant play",
    description: "Players join in seconds via a 6-character room code. No app required.",
  },
  {
    icon: <Users size={24} />,
    title: "Multiplayer rooms",
    description: "Handle dozens of players simultaneously with real-time WebSocket sync.",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Live analytics",
    description: "See answer distributions and leaderboards update after every question.",
  },
  {
    icon: <Smartphone size={24} />,
    title: "Mobile-first",
    description: "Big buttons, high contrast — designed for phones as much as desktops.",
  },
];
