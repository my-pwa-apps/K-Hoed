import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";

export default function Login() {
  const { login, loginPending } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
      const returnTo = searchParams.get("returnTo");
      navigate(returnTo && returnTo.startsWith("/") ? returnTo : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.login_button);
    }
  };

  return (
    <AuthShell title={t.auth.login_title} subtitle={t.auth.login_subtitle}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Input
          label={t.auth.email_label}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label={t.auth.password_label}
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-danger-500 text-center">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={loginPending} size="lg">
          {loginPending ? t.auth.logging_in : t.auth.login_button}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {t.auth.no_account}{" "}
        <Link to="/register" className="text-brand-600 font-semibold hover:underline">
          {t.auth.register_link}
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display font-bold text-3xl text-white inline-flex items-center gap-2">
            <img src="/logo.png" alt="" aria-hidden className="h-16 w-16 object-contain" /> K-Hoed
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-white/65">{subtitle}</p>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl p-8">{children}</div>
      </div>
    </div>
  );
}
