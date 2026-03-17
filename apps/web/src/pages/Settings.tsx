import { useState } from "react";
import { Database, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { seedMockData } from "@/lib/mock-data";
import { toast } from "@/components/ui/sonner";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChangePassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = changePassword(currentPassword, nextPassword);

    if (result.error) {
      setSuccess("");
      setError(result.error);
      return;
    }

    setError("");
    setSuccess("Password updated.");
    setCurrentPassword("");
    setNextPassword("");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleLoadMockData = () => {
    seedMockData();
    toast.success("Mock data loaded for screenshots.");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your username, password, and session.</p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Minimal identity settings for the current trading session.</CardDescription>
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
            <CardDescription>Switch between light, dark, and system themes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle showLabel className="w-full justify-between sm:w-auto" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
            <CardDescription>Update the password you use to access IZLedger.</CardDescription>
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

              <Button type="submit" className="w-full rounded-xl sm:w-auto">
                <ShieldCheck className="h-4 w-4" />
                Save Password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Session</CardTitle>
            <CardDescription>Log out of your current account on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Mock Data</CardTitle>
            <CardDescription>Load a polished demo journal with accounts, trades, reviews, analytics, and screenshots for landing page captures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-background/60 px-4 py-4">
              <p className="text-sm text-muted-foreground">
                This replaces the current local journal data on this device with demo trading content for screenshots.
              </p>
            </div>
            <Button className="w-full rounded-xl sm:w-auto" onClick={handleLoadMockData}>
              <Database className="h-4 w-4" />
              Load Mock Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
