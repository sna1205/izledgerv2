import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/accounts": "Accounts",
  "/setups": "Setups",
  "/reviews": "Reviews",
  "/trades": "Trades",
  "/analytics": "Analytics",
  "/calculator": "Lot Calculator",
  "/settings": "Settings",
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const initials = user?.username?.slice(0, 2).toUpperCase() || "IZ";
  const pageTitle = pageTitles[location.pathname] || "IZLedger";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-transparent">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 lg:px-6">
            <div className="surface flex min-h-[72px] shrink-0 items-center justify-between px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-2xl border border-border/70 bg-background/78 text-muted-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] hover:bg-accent/75 hover:text-foreground dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">{pageTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                className="h-11 max-w-[210px] rounded-2xl px-2 sm:px-3"
                onClick={() => navigate("/settings")}
              >
                <Avatar className="h-9 w-9 border border-border/70">
                  <AvatarFallback className="bg-secondary text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline-block">{user?.username}</span>
              </Button>
            </div>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
