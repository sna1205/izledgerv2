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
import { useAuth } from "@/lib/auth";

const items = [
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
            <div className="space-y-1">
              <h1 className="text-sm font-semibold tracking-tight text-foreground">IZLedger</h1>
              <p className="text-xs text-muted-foreground">Trading journal</p>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="min-h-11 rounded-xl px-2 py-2 hover:bg-accent/50"
                      activeClassName="bg-accent text-foreground font-medium"
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
        <div className="flex items-center gap-3 rounded-xl border bg-background/70 px-3 py-3">
          <Avatar className="h-9 w-9 border">
            <AvatarFallback className="bg-muted text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user?.username}</p>
              <p className="text-xs text-muted-foreground">Logged in</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
