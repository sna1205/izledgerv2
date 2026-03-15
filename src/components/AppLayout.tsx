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
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-xl border border-border/60" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{pageTitle}</p>
                <p className="hidden text-xs text-muted-foreground sm:block">IZLedger</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                className="h-10 max-w-[180px] rounded-xl px-2 sm:px-3"
                onClick={() => navigate("/settings")}
              >
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-muted text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline-block">{user?.username}</span>
              </Button>
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
