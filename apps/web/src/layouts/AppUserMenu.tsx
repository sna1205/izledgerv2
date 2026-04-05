import { useState } from "react";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/class-names";
import { useAuth } from "@/features/auth/auth-context";

type AppUserMenuProps = {
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
};

export function AppUserMenu({ collapsed = false, className, onNavigate }: AppUserMenuProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const initials = user?.username?.slice(0, 2).toUpperCase() || "IZ";

  const handleSettings = () => {
    onNavigate?.();
    navigate("/settings");
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
      onNavigate?.();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "min-w-0 justify-start overflow-hidden rounded-2xl border border-sidebar-border/60 bg-sidebar-background/70 px-2.5 py-2.5 text-sidebar-foreground shadow-[0_10px_30px_-24px_rgba(15,23,42,0.9)] hover:bg-sidebar-accent/90 hover:text-sidebar-foreground",
            collapsed && "h-11 w-11 shrink-0 justify-center px-0 py-0",
            !collapsed && "h-11 w-full",
            className,
          )}
          aria-label={user?.username ? `Open menu for ${user.username}` : "Open user menu"}
        >
          <Avatar className="h-9 w-9 border border-sidebar-border/80">
            <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.username || "Trader"}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/50" />
            </>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-60">
        <DropdownMenuLabel className="rounded-xl px-3 py-2.5">
          <p className="truncate text-sm font-medium">{user?.username || "Trader"}</p>
          <p className="mt-0.5 text-xs font-normal text-muted-foreground">Manage your account and session</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
