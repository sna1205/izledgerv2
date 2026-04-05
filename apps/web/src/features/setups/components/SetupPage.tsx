import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { PaginationControls } from "@/components/PaginationControls";
import { SetupsSkeleton } from "@/components/skeletons/SetupsSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { PageHeader, PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { SetupList } from "@/features/setups/components/SetupList";
import { SetupToolbar } from "@/features/setups/components/SetupToolbar";
import { ApiError } from "@/services/api/client";
import { deleteSetup, listSetups, type SetupListItem } from "@/services/api/setups";
import { privateQueryKey } from "@/services/query-client";
import { getPageErrorState } from "@/utils/page-errors";
import { withMinimumDelay } from "@/utils/loading";

const SETUPS_PAGE_SIZE = 12;

export function SetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [page, setPage] = useState(1);
  const [setupPendingDelete, setSetupPendingDelete] = useState<SetupListItem | null>(null);

  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "list", {
      search,
      status: statusFilter,
      page,
      pageSize: SETUPS_PAGE_SIZE,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: async () => withMinimumDelay(() => listSetups({
      search,
      status: statusFilter,
      page,
      pageSize: SETUPS_PAGE_SIZE,
      sortBy: "createdAt",
      sortOrder: "desc",
    })),
    placeholderData: keepPreviousData,
  });

  const setups = useMemo(() => setupsQuery.data?.items ?? [], [setupsQuery.data?.items]);
  const totalSetups = setupsQuery.data?.pagination.total ?? 0;
  const totalSetupPages = setupsQuery.data?.pagination.totalPages ?? 1;
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  const invalidateData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "setups") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "trades") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "dashboard-summary") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "analytics-breakdowns") }),
    ]);
  };

  const deleteMutation = useMutation({
    mutationFn: async (setupId: string) => deleteSetup(setupId),
    onSuccess: async () => {
      await invalidateData();
      toast.success("Setup deleted.");
      setSetupPendingDelete(null);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the setup right now.";
      toast.error(message);
    },
  });

  useUnauthorizedSessionGuard(setupsQuery.error);

  if (setupsQuery.isLoading && !setupsQuery.data) {
    return <SetupsSkeleton />;
  }

  if (setupsQuery.isError) {
    const errorState = getPageErrorState(setupsQuery.error, {
      unavailableTitle: "Setups unavailable",
      unavailableDescription: "The setups service is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      validationTitle: "Setups request invalid",
      validationDescription: "The setup filters in this request are invalid.",
      timeoutTitle: "Setups request timed out",
      timeoutDescription: "Loading setups took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => void setupsQuery.refetch() : undefined}
        isRetrying={setupsQuery.isFetching}
      />
    );
  }

  return (
    <PageShell size="wide">
      <PageHeader
        title="Setups"
        description="Keep your playbook clean, searchable, and fast to update."
        actions={(
          <Button asChild>
            <Link to="/setups/new">
              <Plus className="h-4 w-4" />
              New Setup
            </Link>
          </Button>
        )}
      />

      <SetupToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        totalSetups={totalSetups}
      />

      {totalSetups === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={Layers3}
            title={hasActiveFilters ? "No setups match" : "Create your first trading rule system"}
            description={hasActiveFilters
              ? "Try a broader search."
              : "Build a setup once, then reuse it with clear rules and pre-trade discipline."}
            action={!hasActiveFilters ? (
              <Button asChild>
                <Link to="/setups/new">
                  <Plus className="h-4 w-4" />
                  New Setup
                </Link>
              </Button>
            ) : null}
          />

          {!hasActiveFilters ? (
            <section className="rounded-[30px] border border-border/70 bg-card/85 p-5 shadow-sm">
              <p className="text-label">Example Setup</p>
              <div className="mt-4 rounded-[24px] border border-border/60 bg-background/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-foreground">London Liquidity Sweep</p>
                    <p className="text-sm text-muted-foreground">Fade the initial sweep once price reclaims structure and confirms displacement.</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700">Active</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>Rules: 3</span>
                  <span>Used in 24 trades</span>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          <SetupList
            setups={setups}
            onEdit={(setup) => navigate(`/setups/${setup.id}/edit`)}
            onDelete={(setup) => setSetupPendingDelete(setup)}
          />

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <PaginationControls
              currentPage={page}
              totalPages={totalSetupPages}
              itemLabel="setup pages"
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(totalSetupPages, current + 1))}
            />
          </div>
        </div>
      )}

      <AlertDialog open={Boolean(setupPendingDelete)} onOpenChange={(open) => {
        if (!open) {
          setSetupPendingDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete setup?</AlertDialogTitle>
            <AlertDialogDescription>
              {setupPendingDelete
                ? `This will permanently remove "${setupPendingDelete.name}" unless it is still being used elsewhere.`
                : "This will permanently remove this setup."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();

                if (setupPendingDelete) {
                  deleteMutation.mutate(setupPendingDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete setup"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
