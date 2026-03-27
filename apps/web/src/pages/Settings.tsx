import { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/features/auth/auth-context";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingPassword(true);

    try {
      const result = await changePassword(currentPassword, nextPassword);

      if (result.error) {
        setSuccess("");
        setError(result.error);
        return;
      }

      setError("");
      setSuccess("Password updated.");
      setCurrentPassword("");
      setNextPassword("");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const result = await logout();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Logged out.");
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-background/60 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Username</p>
              <p className="mt-2 text-base font-medium text-foreground">{user?.username || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemeToggle showLabel className="w-full justify-between sm:w-auto" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleChangePassword}>
              <div className="space-y-2">
                <Label htmlFor="settings-current-password">Current password</Label>
                <Input
                  id="settings-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-next-password">New password</Label>
                <Input
                  id="settings-next-password"
                  type="password"
                  value={nextPassword}
                  onChange={(event) => setNextPassword(event.target.value)}
                  placeholder="New password"
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

              <Button type="submit" className="w-full rounded-xl sm:w-auto" disabled={isSavingPassword}>
                <ShieldCheck className="h-4 w-4" />
                {isSavingPassword ? "Saving..." : "Save Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Session</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
