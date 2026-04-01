import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Users, BarChart3, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { useAuthStore } from "@/stores/authStore";
import { useI18n } from "@/i18n";

export default function Landing() {
  const isAuthenticated = useAuthStore((s) => !!s.token);
  const { t } = useI18n();

  const features = [
    { icon: <Zap size={24} />, title: t.landing.feature_realtime_title, description: t.landing.feature_realtime_desc },
    { icon: <Users size={24} />, title: t.landing.feature_multiplayer_title, description: t.landing.feature_multiplayer_desc },
    { icon: <BarChart3 size={24} />, title: t.landing.feature_insights_title, description: t.landing.feature_insights_desc },
    { icon: <Smartphone size={24} />, title: t.landing.feature_mobile_title, description: t.landing.feature_mobile_desc },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-800 to-accent-600 text-white overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="font-display font-bold text-2xl flex items-center gap-2">
          <img src="/logo.png" alt="" aria-hidden className="h-11 w-11 object-contain" /> K-Hoed
        </span>
        <div className="flex items-center gap-4">
          <LanguagePicker light />
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="secondary" size="sm">
                {t.nav.dashboard}
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  {t.nav.login}
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="sm">
                  {t.nav.signup}
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
            <Zap size={14} className="text-accent-400" aria-hidden />
            {t.landing.tagline}
          </div>

          <h1 className="font-display font-extrabold text-5xl sm:text-7xl leading-tight mb-6 text-shadow">
            {t.landing.hero_title} <br />
            <span className="text-accent-400">{t.landing.hero_subtitle}</span>
          </h1>

          <p className="text-xl text-white/75 max-w-2xl mx-auto mb-10">
            {t.landing.hero_body}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="xl" className="bg-accent-500 hover:bg-accent-600 text-white shadow-xl">
                {t.landing.cta_create}
                <ArrowRight size={20} aria-hidden />
              </Button>
            </Link>
            <Link to="/join">
              <Button
                size="xl"
                variant="ghost"
                className="text-white border-2 border-white/30 hover:bg-white/10"
              >
                {t.landing.cta_join}
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
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-5"
            >
              <div className="text-accent-400 mb-3" aria-hidden>{f.icon}</div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-white/65 text-sm">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center pb-8 text-white/40 text-sm">
        {t.landing.footer} · K-Hoed
      </footer>
    </div>
  );
}
