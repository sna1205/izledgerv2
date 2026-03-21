import { LayoutDashboard, Table2, BarChart3, Calculator, Landmark, Tags, FileText, Settings as SettingsIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/auth-context";

const baseItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Landmark },
  { title: "Setups", url: "/setups", icon: Tags },
  { title: "Reviews", url: "/reviews", icon: FileText },
  { title: "Trades", url: "/trades", icon: Table2 },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Lot Calculator", url: "/calculator", icon: Calculator },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth();
  const initials = user?.username?.slice(0, 2).toUpperCase() || "IZ";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-5">
          {!collapsed && (
            <div className="surface-muted space-y-3 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-sm font-semibold tracking-tight text-sidebar-foreground">IZLedger</h1>
                  <p className="text-xs text-muted-foreground">Trading Journal</p>
                </div>
                <div className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Live
                </div>
              </div>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {baseItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="min-h-11 rounded-2xl px-3 py-2 text-sm text-sidebar-foreground/78 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium shadow-sm ring-1 ring-sidebar-border"
                      onClick={() => {
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="surface-muted flex items-center gap-3 px-3 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:shadow-none">
          <Avatar className="h-9 w-9 border border-sidebar-border/80 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
            <AvatarFallback className="bg-sidebar-accent text-xs font-medium text-sidebar-foreground">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.username}</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
