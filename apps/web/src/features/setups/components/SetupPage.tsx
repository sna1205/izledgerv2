import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, Plus } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { PaginationControls } from "@/components/PaginationControls";
import { SetupsSkeleton } from "@/components/skeletons/SetupsSkeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { PageHeader, PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { SetupList } from "@/features/setups/components/SetupList";
import { SetupToolbar } from "@/features/setups/components/SetupToolbar";
import { SetupWorkspaceDialog, type WorkspaceTab } from "@/features/setups/components/SetupWorkspaceDialog";
import { ApiError } from "@/services/api/client";
import { deleteSetup, listSetups, updateSetup, type SetupListItem } from "@/services/api/setups";
import { privateQueryKey } from "@/services/query-client";
import { getPageErrorState } from "@/utils/page-errors";
import { withMinimumDelay } from "@/utils/loading";
import type { SetupDefinition } from "@/types";

const SETUPS_PAGE_SIZE = 12;

export function SetupPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<SetupDefinition | null>(null);
  const [initialDialogTab, setInitialDialogTab] = useState<WorkspaceTab>("strategy");
  const [deleteTarget, setDeleteTarget] = useState<SetupListItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "name">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "list", {
      search,
      status: statusFilter,
      page,
      pageSize: SETUPS_PAGE_SIZE,
      sortBy,
      sortOrder,
    }),
    queryFn: async () => withMinimumDelay(() => listSetups({
      search,
      status: statusFilter,
      page,
      pageSize: SETUPS_PAGE_SIZE,
      sortBy,
      sortOrder,
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

  const saveMutation = useMutation({
    mutationFn: async ({ setupId, payload }: {
      setupId: string | null;
      payload: {
        name: string;
        description: string;
        entryLogic: string | null;
        confirmationLogic: string | null;
        invalidationLogic: string | null;
        notes: string | null;
        color: string;
        isArchived: boolean;
      };
    }) => updateSetup(setupId as string, payload),
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the setup right now.";
      toast.error(message);
    },
  });

  const handleSaveStrategy = async (
    setupId: string | null,
    payload: {
      name: string;
      description: string;
      entryLogic: string | null;
      confirmationLogic: string | null;
      invalidationLogic: string | null;
      notes: string | null;
      color: string;
      isArchived: boolean;
    },
  ) => {
    const response = await saveMutation.mutateAsync({
      setupId,
      payload,
    });

    await invalidateData();
    return response.setup;
  };

  const deleteMutation = useMutation({
    mutationFn: async (setupId: string) => deleteSetup(setupId),
    onSuccess: async () => {
      await invalidateData();
      toast.success("Setup deleted. Existing trade history was preserved.");
      setDeleteError("");
      setDeleteTarget(null);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the setup right now.";
      setDeleteError(message);
      toast.error(message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (setupId: string) => updateSetup(setupId, { isArchived: true }),
    onSuccess: async (result) => {
      await invalidateData();
      toast.success("Setup archived.");
      setDeleteError("");

      if (deleteTarget?.id === result.setup.id) {
        setDeleteTarget(null);
      }
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not archive the setup right now.";
      toast.error(message);
    },
  });

  useUnauthorizedSessionGuard(setupsQuery.error);

  const openEditModal = (setup: SetupDefinition, tab: WorkspaceTab = "strategy") => {
    setEditingSetup(setup);
    setInitialDialogTab(tab);
    setOpen(true);
  };

  const openDeleteDialog = (setup: SetupListItem) => {
    setDeleteTarget(setup);
    setDeleteError("");
  };

  useEffect(() => {
    if (setupsQuery.isLoading || setups.length === 0) {
      return;
    }

    const setupId = searchParams.get("setup");

    if (!setupId) {
      return;
    }

    const targetSetup = setups.find((item) => item.id === setupId);

    if (!targetSetup) {
      setSearchParams({}, { replace: true });
      return;
    }

    const requestedTab = searchParams.get("tab") === "pre-trade" ? "pre-trade" : "strategy";
    setEditingSetup(targetSetup);
    setInitialDialogTab(requestedTab);
    setOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, setups, setupsQuery.isLoading]);

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
        sortBy={sortBy}
        onSortByChange={(value) => {
          setSortBy(value);
          setPage(1);
        }}
        sortOrder={sortOrder}
        onSortOrderChange={(value) => {
          setSortOrder(value);
          setPage(1);
        }}
        totalSetups={totalSetups}
      />

      {totalSetups === 0 ? (
        <EmptyState
          icon={Layers3}
          title={hasActiveFilters ? "No setups match" : "No setups yet"}
          description={hasActiveFilters
            ? "Try a broader search."
            : "Create a setup to tag trades and checklist items."}
          action={!hasActiveFilters ? (
            <Button asChild>
              <Link to="/setups/new">
                <Plus className="h-4 w-4" />
                New Setup
              </Link>
            </Button>
          ) : null}
        />
      ) : (
        <div className="space-y-6">
          <SetupList
            setups={setups}
            onEdit={(setup) => openEditModal(setup)}
            onDelete={openDeleteDialog}
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

      <SetupWorkspaceDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);

          if (!nextOpen) {
            setEditingSetup(null);
            setInitialDialogTab("strategy");
          }
        }}
        setup={editingSetup}
        setups={setups}
        initialTab={initialDialogTab}
        isSavingStrategy={saveMutation.isPending}
        onSaveStrategy={handleSaveStrategy}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(openState) => {
          if (!openState) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setup</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete "${deleteTarget.name}" only if no checklist rules still use it. Existing trades keep their historical setup label and color snapshot, so archive is the safer choice when you want to retire a setup without breaking history.`
                : "Delete this setup only if no checklist rules still use it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending || archiveMutation.isPending}>Cancel</AlertDialogCancel>
            {!deleteTarget?.isArchived ? (
              <Button
                variant="outline"
                onClick={() => deleteTarget && archiveMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending || archiveMutation.isPending}
              >
                {archiveMutation.isPending ? "Archiving..." : "Archive Instead"}
              </Button>
            ) : null}
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }

                setDeleteError("");
                deleteMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteMutation.isPending || archiveMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
