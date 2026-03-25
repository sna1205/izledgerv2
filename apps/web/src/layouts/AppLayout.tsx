import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/layouts/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FEATURES } from "@/config/features";
import { useAuth } from "@/features/auth/auth-context";
import { HighImpactNewsAlertManager } from "@/features/economic-calendar/components/HighImpactNewsAlertManager";
import { EconomicCalendarLivePollingManager } from "@/features/economic-calendar/components/EconomicCalendarLivePollingManager";

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
  const economicCalendarLive = FEATURES.economicCalendar === "live";
  const pageTitle = location.pathname.startsWith("/economic-calendar")
    ? "Economic Calendar"
    : pageTitles[location.pathname] || "IZLedger";

  return (
    <SidebarProvider>
      {user && economicCalendarLive ? <HighImpactNewsAlertManager /> : null}
      {user && economicCalendarLive ? <EconomicCalendarLivePollingManager /> : null}
      <div className="flex min-h-screen w-full bg-transparent">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="surface flex min-h-[64px] shrink-0 items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-2xl border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">{pageTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                className="h-10 max-w-[210px] rounded-2xl px-2 sm:px-3"
                aria-label={user?.username ? `Open settings for ${user.username}` : "Open settings"}
                onClick={() => navigate("/settings")}
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-secondary text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
                <span className="sr-only max-w-[120px] truncate text-sm font-medium sm:not-sr-only sm:inline-block">{user?.username}</span>
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
