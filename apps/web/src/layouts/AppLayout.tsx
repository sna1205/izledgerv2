import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { HeaderAccountDropdown } from "@/layouts/HeaderAccountDropdown";
import { AppSidebar } from "@/layouts/AppSidebar";
import { getPageTitle } from "@/layouts/app-navigation";

export function AppLayout() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-transparent">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="surface overflow-hidden px-3 py-3 sm:px-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <SidebarTrigger className="h-10 w-10 rounded-2xl border border-border/60 bg-background/75 text-muted-foreground shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)] hover:bg-accent hover:text-foreground" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
                    <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{pageTitle}</h1>
                  </div>
                </div>

                <div className="sm:w-auto">
                  <HeaderAccountDropdown />
                </div>
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
