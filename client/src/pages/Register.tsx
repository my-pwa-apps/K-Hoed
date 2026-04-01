import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "./Login";
import { useI18n } from "@/i18n";

export default function Register() {
  const { register: registerUser, registerPending } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError(t.auth.password_min);
      return;
    }
    try {
      await registerUser({ email, display_name: displayName, password });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <AuthShell title={t.auth.register_title} subtitle={t.auth.register_subtitle}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label={t.auth.name_label}
          type="text"
          required
          autoComplete="nickname"
          placeholder="Quiz Master"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

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
          autoComplete="new-password"
          placeholder={t.auth.password_min}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-danger-500 text-center">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={registerPending} size="lg">
          {registerPending ? t.auth.registering : t.auth.register_button}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {t.auth.have_account}{" "}
        <Link to="/login" className="text-brand-600 font-semibold hover:underline">
          {t.auth.login_link}
        </Link>
      </p>
    </AuthShell>
  );
}
