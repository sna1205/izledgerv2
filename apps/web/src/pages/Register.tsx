import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AuthPageShell } from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_USERNAME_MAX_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
} from "@/lib/auth-validation";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await register(username, password);

      if (result.error) {
        setError(result.error);
        return;
      }
      
      setError("");
      navigate("/dashboard", { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="IZLedger"
      title="Create account"
      description="Set up a username and password so you can get into the journal quickly."
      cardTitle="A few quick details"
      cardDescription="Choose a username and password to get into your journal."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="register-username">Username</Label>
          <Input
            id="register-username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError("");
            }}
            placeholder="Choose a username"
            autoComplete="username"
            minLength={AUTH_USERNAME_MIN_LENGTH}
            maxLength={AUTH_USERNAME_MAX_LENGTH}
          />
          <p className="text-xs text-muted-foreground">
            Use {AUTH_USERNAME_MIN_LENGTH} to {AUTH_USERNAME_MAX_LENGTH} characters.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="Create a password"
            autoComplete="new-password"
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            maxLength={AUTH_PASSWORD_MAX_LENGTH}
          />
          <p className="text-xs text-muted-foreground">
            Use {AUTH_PASSWORD_MIN_LENGTH} to {AUTH_PASSWORD_MAX_LENGTH} characters.
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/login">
          Log in
        </Link>
      </p>
    </AuthPageShell>
  );
}
