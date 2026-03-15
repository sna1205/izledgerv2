import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function AppLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initials = user?.username?.slice(0, 2).toUpperCase() || "IZ";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <Button
              variant="ghost"
              className="h-10 rounded-xl px-2"
              onClick={() => navigate("/settings")}
            >
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="bg-muted text-xs font-medium">{initials}</AvatarFallback>
              </Avatar>
              <span className="max-w-[140px] truncate text-sm font-medium">{user?.username}</span>
            </Button>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
