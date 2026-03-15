import { getAccounts } from "@/lib/accounts";
import { AccountFilterValue } from "@/lib/account-filter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AccountFilterSelectProps {
  value: AccountFilterValue;
  onValueChange: (value: AccountFilterValue) => void;
  label?: string;
  triggerClassName?: string;
}

export function AccountFilterSelect({
  value,
  onValueChange,
  label = "Account",
  triggerClassName,
}: AccountFilterSelectProps) {
  const accounts = getAccounts();

  return (
    <div className="w-full max-w-[260px] space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
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
