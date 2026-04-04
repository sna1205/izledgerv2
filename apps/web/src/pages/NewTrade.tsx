import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { TradeFormSkeleton } from "@/components/skeletons/TradeFormSkeleton";
import { Button } from "@/components/ui/button";
import { TradeFormPage } from "@/features/trades/components/TradeFormPage";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { PageShell } from "@/layouts/PageShell";
import { ApiError } from "@/services/api/client";
import { listAccounts } from "@/services/api/accounts";
import { listSetups } from "@/services/api/setups";
import { createTrade } from "@/services/api/trades";
import { getPageErrorState } from "@/utils/page-errors";
import { withMinimumDelay } from "@/utils/loading";
import { privateQueryKey, syncTradeScreenshotQueryData, updateTradeQueryData } from "@/services/query-client";
import { toast } from "@/components/ui/sonner";

function invalidateJournalQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "reviews") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "dashboard-summary") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-breakdowns") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-calendar") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "setups") }),
  ]);
}

export default function NewTrade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "accounts", "active"),
    queryFn: async () => {
      const response = await withMinimumDelay(() => listAccounts({ status: "active" }));
      return response.items;
    },
  });

  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "options"),
    queryFn: async () => {
      const response = await withMinimumDelay(() => listSetups({
        page: 1,
        pageSize: 100,
        status: "all",
        sortBy: "name",
        sortOrder: "asc",
      }));
      return response.items;
    },
  });

  const saveTradeMutation = useMutation({
    mutationFn: createTrade,
    onSuccess: async (result) => {
      updateTradeQueryData(queryClient, user.id, result.trade);
      await invalidateJournalQueries(queryClient, user.id);
      toast.success("Trade saved successfully.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the trade right now.";
      toast.error(message);
    },
  });

  const isLoading = [accountsQuery, setupsQuery].some((query) => query.isLoading && !query.data);
  const hasError = [accountsQuery, setupsQuery].some((query) => query.isError);
  const pageError = [accountsQuery, setupsQuery].find((query) => query.isError)?.error;

  useUnauthorizedSessionGuard(accountsQuery.error, setupsQuery.error);

  if (isLoading) {
    return <TradeFormSkeleton />;
  }

  if ((accountsQuery.data ?? []).length === 0) {
    return (
      <PageShell size="wide">
        <EmptyState
          icon={Landmark}
          title="Add your first account before logging a trade"
          description="Trades need an account so IZLedger can track currency, performance, and analytics correctly."
          action={(
            <Button onClick={() => navigate("/accounts")}>
              Add Account
            </Button>
          )}
        />
      </PageShell>
    );
  }

  if (hasError) {
    const errorState = getPageErrorState(pageError, {
      unavailableTitle: "Trade form unavailable",
      unavailableDescription: "The new trade form is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      timeoutTitle: "Trade form request timed out",
      timeoutDescription: "Loading the new trade form took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => {
          void Promise.all([accountsQuery.refetch(), setupsQuery.refetch()]);
        } : undefined}
        isRetrying={accountsQuery.isFetching || setupsQuery.isFetching}
      />
    );
  }

  return (
    <TradeFormPage
      onSave={async (payload) => {
        const result = await saveTradeMutation.mutateAsync(payload);
        return result.trade;
      }}
      onCancel={() => navigate("/trades")}
      onComplete={() => navigate("/trades")}
      accounts={accountsQuery.data ?? []}
      setups={setupsQuery.data ?? []}
      isSaving={saveTradeMutation.isPending}
      onScreenshotsChange={(trade) => {
        void syncTradeScreenshotQueryData(queryClient, user.id, trade);
      }}
    />
  );
}
