import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthPageShell } from "@/layouts/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/auth-context";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionMessage, sessionState, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locationState = location.state as { from?: { pathname?: string }; authMessage?: string | null } | null;
  const nextPath = locationState?.from?.pathname || "/dashboard";
  const authMessage = locationState?.authMessage || (sessionState === "backend-unavailable" && !user ? sessionMessage : null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await login(username, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError("");
      navigate(nextPath, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="IZLedger"
      title="Log in"
      description="Open your journal."
      cardTitle="Welcome back"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="login-username">Username</Label>
          <Input
            id="login-username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError("");
            }}
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              className="pr-12"
              autoComplete="current-password"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {authMessage ? <p className="text-sm text-amber-700">{authMessage}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Log in"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/register">
          Create an account
        </Link>
      </p>
    </AuthPageShell>
  );
}
