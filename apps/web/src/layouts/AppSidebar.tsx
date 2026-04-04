import { ChevronRight, Plus, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/class-names";
import { AppUserMenu } from "@/layouts/AppUserMenu";
import { appNavSections } from "@/layouts/app-navigation";

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-sidebar-border/70 bg-[linear-gradient(180deg,hsl(var(--sidebar-background)),hsl(var(--sidebar-accent)/0.9))] px-3.5 py-3 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.65)] transition-all duration-200",
        collapsed && "flex items-center justify-center px-0 py-0 size-11 rounded-2xl",
      )}
    >
      {collapsed ? (
        <div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-accent text-sidebar-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-sidebar-foreground text-sidebar-primary-foreground shadow-inner">
            <Sparkles className="h-4 w-4 text-sidebar-background" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sidebar-foreground/45">IZLedger</p>
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">Trading workspace</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarUtilityTooltip({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (!collapsed) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarPrimaryAction({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className={cn(
        "group h-10 w-full justify-start overflow-hidden rounded-2xl bg-sidebar-accent/55 px-3 text-sidebar-foreground shadow-none transition-all duration-200 hover:bg-sidebar-accent/80",
        collapsed && "h-10 w-10 justify-center px-0 py-0",
      )}
      onClick={onClick}
    >
      {collapsed ? (
        <Plus className="h-4 w-4" />
      ) : (
        <div className="grid w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_1rem] items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sidebar-background/75 text-sidebar-foreground transition-transform duration-200 group-hover:scale-[1.03] group-hover:bg-sidebar-background/95">
            <Plus className="h-3.5 w-3.5" />
          </div>
          <span className="min-w-0 truncate text-left text-[13px] font-semibold tracking-tight text-sidebar-foreground">
            New Trade
          </span>
          <ChevronRight className="justify-self-end h-3.5 w-3.5 shrink-0 text-sidebar-foreground/38 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-sidebar-foreground/60" />
        </div>
      )}
    </Button>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" variant="floating" className="border-r-0">
      <SidebarHeader className={cn("gap-3 px-3 pb-2 pt-3", collapsed && "items-center px-2 pb-1")}>
        <SidebarBrand collapsed={collapsed} />
        <SidebarPrimaryAction
          collapsed={collapsed}
          onClick={() => {
            handleNavigate();
            navigate("/trades/new");
          }}
        />
      </SidebarHeader>

      <SidebarContent className={cn("gap-1 px-2 pb-3", collapsed && "items-center px-2 pb-2")}>
        {appNavSections.map((section) => (
          <SidebarGroup
            key={section.title}
            className={cn("px-1 py-1.5", collapsed && "w-auto items-center px-0 py-1")}
          >
            <SidebarGroupLabel className="px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-sidebar-foreground/38">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className={cn("gap-1", collapsed && "items-center gap-1.5")}>
                {section.items.map((item) => {
                  const isActive = item.match(location.pathname);

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "h-11 rounded-2xl px-3 text-[13px] font-medium text-sidebar-foreground/72 transition-all duration-200",
                          "hover:bg-sidebar-accent/90 hover:text-sidebar-foreground",
                          "data-[active=true]:bg-[linear-gradient(180deg,hsl(var(--sidebar-accent)),hsl(var(--sidebar-accent)/0.72))]",
                          "data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[inset_0_1px_0_hsl(var(--sidebar-background)/0.35),0_20px_40px_-32px_rgba(15,23,42,0.95)]",
                          "data-[active=true]:ring-1 data-[active=true]:ring-sidebar-border/80",
                          collapsed && "justify-center",
                        )}
                      >
                        <NavLink
                          to={item.url}
                          onClick={handleNavigate}
                          className={cn("flex w-full items-center", collapsed ? "justify-center" : "gap-3")}
                        >
                          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/62")} />
                          {!collapsed ? <span>{item.title}</span> : null}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className={cn("mt-auto gap-2 px-3 pb-3 pt-2", collapsed && "items-center px-2 pb-2 pt-3")}>
        <SidebarSeparator className={cn("mx-0 bg-sidebar-border/70", collapsed && "mx-auto w-6")} />

        <div
          className={cn(
            "grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2",
            collapsed && "flex w-auto flex-col items-center gap-2",
          )}
        >
          <SidebarUtilityTooltip collapsed={collapsed} label="Theme">
            <div className="flex">
              <ThemeToggle
                className="size-11 rounded-2xl border-sidebar-border/60 bg-sidebar-background/70 px-0 text-sidebar-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-foreground"
              />
            </div>
          </SidebarUtilityTooltip>

          <div className={cn("min-w-0", collapsed && "w-auto flex-none")}>
            <SidebarUtilityTooltip collapsed={collapsed} label="Profile">
              <div className={cn("min-w-0", collapsed && "w-auto")}>
                <AppUserMenu collapsed={collapsed} onNavigate={handleNavigate} />
              </div>
            </SidebarUtilityTooltip>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
