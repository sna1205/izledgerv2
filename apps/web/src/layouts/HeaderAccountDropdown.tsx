import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AccountFilterSelect } from "@/features/accounts/components/AccountFilterSelect";
import { useAuth } from "@/features/auth/auth-context";
import { listAccounts } from "@/services/api/accounts";
import { privateQueryKey } from "@/services/query-client";
import { resolveAccountFilter, useAccountFilter } from "@/utils/account-filter";

export function HeaderAccountDropdown() {
  const { user } = useAuth();
  const [accountFilter, setAccountFilter] = useAccountFilter();

  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user?.id ?? "anonymous", "accounts", "active"),
    queryFn: async () => {
      const response = await listAccounts({ status: "active" });
      return response.items;
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
  });

  const accounts = accountsQuery.data ?? [];
  const resolvedAccountFilter = useMemo(
    () => resolveAccountFilter(accountFilter, accounts),
    [accountFilter, accounts],
  );

  useEffect(() => {
    if (resolvedAccountFilter !== accountFilter) {
      setAccountFilter(resolvedAccountFilter);
    }
  }, [accountFilter, resolvedAccountFilter, setAccountFilter]);

  return (
    <AccountFilterSelect
      accounts={accounts}
      value={resolvedAccountFilter}
      onValueChange={setAccountFilter}
      className="max-w-none sm:w-[280px]"
      triggerClassName="h-11 w-full rounded-2xl border-border/60 bg-background/72 px-3.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.42)]"
    />
  );
}
