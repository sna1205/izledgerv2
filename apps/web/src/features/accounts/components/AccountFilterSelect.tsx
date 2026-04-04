import { BriefcaseBusiness, Layers3 } from "lucide-react";
import type { Account } from "@/types";
import { cn } from "@/utils/class-names";
import { AccountFilterValue } from "@/utils/account-filter";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

interface AccountFilterSelectProps {
  accounts: Account[];
  value: AccountFilterValue;
  onValueChange: (value: AccountFilterValue) => void;
  label?: string;
  triggerClassName?: string;
  className?: string;
}

export function AccountFilterSelect({
  accounts,
  value,
  onValueChange,
  label,
  triggerClassName,
  className,
}: AccountFilterSelectProps) {
  const selectedAccount = value === "all"
    ? null
    : accounts.find((account) => account.id === value) ?? null;

  const triggerLabel = selectedAccount?.name ?? "All Accounts";

  return (
    <div className={cn("w-full max-w-[280px] space-y-2", className)}>
      {label ? (
        <div className="space-y-1">
          <p className="text-label">{label}</p>
        </div>
      ) : null}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            "h-12 rounded-[22px] border-transparent bg-background/62 px-3.5 shadow-none backdrop-blur-sm transition-all hover:bg-background/80 focus:ring-0 focus:ring-offset-0",
            triggerClassName,
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
              {selectedAccount ? <BriefcaseBusiness className="h-4 w-4" /> : <Layers3 className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{triggerLabel}</p>
            </div>
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-[22px] border-border/80 bg-popover/96 p-2 shadow-[0_24px_70px_-26px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:shadow-[0_24px_70px_-26px_rgba(1,8,24,0.88)]">
          <SelectItem value="all" className="min-h-11 rounded-2xl pl-10 pr-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Layers3 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">All Accounts</p>
                <p className="truncate text-xs text-muted-foreground">Cross-account view</p>
              </div>
            </div>
          </SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id} className="min-h-11 rounded-2xl pl-10 pr-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <BriefcaseBusiness className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {account.isDefault ? "Default account" : "Single account scope"}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
