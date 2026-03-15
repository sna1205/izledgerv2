import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function Register() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = register(username, password);

    if (result.error) {
      setError(result.error);
      return;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_35%),linear-gradient(180deg,_rgba(248,250,252,1),_rgba(241,245,249,0.75))] px-4 py-6 sm:py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">IZLedger</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Create account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Set up a username and password so you can get into the journal quickly.</p>
        </div>

        <Card className="rounded-3xl border-border/70 bg-card/95 shadow-xl shadow-slate-200/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Minimal setup</CardTitle>
            <CardDescription>Only the essentials for an MVP trading workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="register-username">Username</Label>
                <Input
                  id="register-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Choose a username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" className="h-11 w-full rounded-xl">
                Create account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/login">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
