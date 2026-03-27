import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { PageErrorState } from "@/components/PageErrorState";
import { TradesSkeleton } from "@/components/skeletons/TradesSkeleton";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { TradeFormPage } from "@/features/trades/components/TradeFormPage";
import { listAccounts } from "@/services/api/accounts";
import { ApiError } from "@/services/api/client";
import { listSetups } from "@/services/api/setups";
import { getTrade, updateTrade } from "@/services/api/trades";
import { privateQueryKey, syncTradeScreenshotQueryData, updateTradeQueryData } from "@/services/query-client";
import { withMinimumDelay } from "@/utils/loading";
import { getPageErrorState } from "@/utils/page-errors";

function invalidateTradeQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string, tradeId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "reviews") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "dashboard-summary") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-breakdowns") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-calendar") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "setups") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades", "detail", tradeId) }),
  ]);
}

export default function EditTrade() {
  const { user } = useAuth();
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tradeQuery = useQuery({
    queryKey: privateQueryKey(user.id, "trades", "detail", id),
    queryFn: async () => {
      const response = await withMinimumDelay(() => getTrade(id));
      return response.trade;
    },
    enabled: Boolean(id),
  });

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

  const updateTradeMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof updateTrade>[1]) => updateTrade(id, payload),
    onSuccess: async (result) => {
      updateTradeQueryData(queryClient, user.id, result.trade);
      await invalidateTradeQueries(queryClient, user.id, id);
      toast.success("Trade updated successfully.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update the trade right now.";
      toast.error(message);
    },
  });

  const isLoading = [tradeQuery, accountsQuery, setupsQuery].some((query) => query.isLoading && !query.data);
  const pageError = [tradeQuery, accountsQuery, setupsQuery].find((query) => query.isError)?.error;

  useUnauthorizedSessionGuard(tradeQuery.error, accountsQuery.error, setupsQuery.error);

  if (isLoading) {
    return <TradesSkeleton />;
  }

  if (!tradeQuery.data || pageError) {
    const errorState = getPageErrorState(pageError ?? new ApiError("Trade not found.", 404, "TRADE_NOT_FOUND"), {
      unavailableTitle: "Trade form unavailable",
      unavailableDescription: "This trade could not be loaded right now. Please try again in a moment.",
      unauthorizedTitle: "Trade access denied",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      notFoundTitle: "Trade not found",
      notFoundDescription: "This trade does not exist or may have been deleted.",
      validationTitle: "Invalid trade link",
      validationDescription: "This trade link is invalid.",
      timeoutTitle: "Trade request timed out",
      timeoutDescription: "Loading this trade took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => {
          void Promise.all([
            tradeQuery.refetch(),
            accountsQuery.refetch(),
            setupsQuery.refetch(),
          ]);
        } : undefined}
        isRetrying={tradeQuery.isFetching || accountsQuery.isFetching || setupsQuery.isFetching}
        secondaryAction={{
          label: "Back to Trade",
          onClick: () => navigate(id ? `/trades/${id}` : "/trades"),
        }}
      />
    );
  }

  const trade = tradeQuery.data;

  return (
    <TradeFormPage
      editTrade={trade}
      onSave={async (payload) => {
        const result = await updateTradeMutation.mutateAsync(payload);
        return result.trade;
      }}
      onCancel={() => navigate(`/trades/${trade.id}`)}
      onComplete={(updatedTrade) => navigate(`/trades/${updatedTrade?.id ?? trade.id}`)}
      accounts={accountsQuery.data ?? []}
      setups={setupsQuery.data ?? []}
      isSaving={updateTradeMutation.isPending}
      onScreenshotsChange={(updatedTrade) => {
        void syncTradeScreenshotQueryData(queryClient, user.id, updatedTrade);
      }}
    />
  );
}
