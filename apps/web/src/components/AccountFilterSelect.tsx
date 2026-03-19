import type { Account } from "@/lib/types";
import { AccountFilterValue } from "@/lib/account-filter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AccountFilterSelectProps {
  accounts: Account[];
  value: AccountFilterValue;
  onValueChange: (value: AccountFilterValue) => void;
  label?: string;
  triggerClassName?: string;
}

export function AccountFilterSelect({
  accounts,
  value,
  onValueChange,
  label = "Account",
  triggerClassName,
}: AccountFilterSelectProps) {
  return (
    <div className="w-full max-w-[260px] space-y-2">
      <p className="text-label">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName ?? "h-11 rounded-2xl"}>
          <SelectValue placeholder="All Accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
