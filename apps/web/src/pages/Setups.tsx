import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, Pencil, Plus, Sparkles, SwatchBook, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar, FilterField } from "@/components/FilterBar";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard } from "@/layouts/PageShell";
import { PaginationControls } from "@/components/PaginationControls";
import { StatCard } from "@/components/StatCard";
import { DataBadge } from "@/components/DataBadge";
import { SetupsSkeleton } from "@/components/skeletons/SetupsSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { SetupWorkspaceDialog, type WorkspaceTab } from "@/features/setups/components/SetupWorkspaceDialog";
import { ApiError } from "@/services/api/client";
import { createSetup, deleteSetup, listSetups, updateSetup } from "@/services/api/setups";
import { formatNumberDisplay } from "@/utils/analytics-rendering";
import { getPageErrorState } from "@/utils/page-errors";
import { withMinimumDelay } from "@/utils/loading";
import { privateQueryKey } from "@/services/query-client";
import { normalizeSetupColor, type SetupDefinition } from "@/types";

const SETUPS_PAGE_SIZE = 12;
const FALLBACK_SETUP_COLOR = "#10B981";

function resolveDisplayColor(color: string) {
  return normalizeSetupColor(color) ?? FALLBACK_SETUP_COLOR;
}

export default function Setups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<SetupDefinition | null>(null);
  const [initialDialogTab, setInitialDialogTab] = useState<WorkspaceTab>("strategy");
  const [deleteTarget, setDeleteTarget] = useState<SetupDefinition | null>(null);
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
  const activeSetups = setups.filter((setup) => !setup.isArchived).length;
  const totalTradesMapped = setups.reduce((sum, setup) => sum + (setup.tradeCount ?? 0), 0);
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
    }) => {
      if (setupId) {
        return updateSetup(setupId, payload);
      }

      return createSetup(payload);
    },
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

    if (!setupId) {
      setEditingSetup(response.setup);
    }

    await invalidateData();
    return response.setup;
  };

  const deleteMutation = useMutation({
    mutationFn: async (setupId: string) => deleteSetup(setupId),
    onSuccess: async () => {
      await invalidateData();
      toast.success("Setup deleted. Existing trade history was preserved.");
      setDeleteTarget(null);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the setup right now.";
      toast.error(message);
    },
  });

  useUnauthorizedSessionGuard(setupsQuery.error);

  const openCreateModal = () => {
    setEditingSetup(null);
    setInitialDialogTab("strategy");
    setOpen(true);
  };

  const openEditModal = (setup: SetupDefinition, tab: WorkspaceTab = "strategy") => {
    setEditingSetup(setup);
    setInitialDialogTab(tab);
    setOpen(true);
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
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Setup
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard label="Total Setups" value={String(totalSetups)} icon={Layers3} />
        <StatCard label="Active" value={String(activeSetups)} icon={Sparkles} />
        <StatCard label="Trades" value={formatNumberDisplay(totalTradesMapped)} icon={SwatchBook} />
      </div>

      <FilterBar meta={<><span className="font-medium text-foreground">{totalSetups}</span>&nbsp;setups in view</>}>
        <FilterField label="Search">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search setups..."
          />
        </FilterField>

        <FilterField label="Status">
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value as typeof statusFilter);
            setPage(1);
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Setups</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Sort By">
          <Select value={sortBy} onValueChange={(value) => {
            setSortBy(value as typeof sortBy);
            setPage(1);
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Created At</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Order">
          <Select value={sortOrder} onValueChange={(value) => {
            setSortOrder(value as typeof sortOrder);
            setPage(1);
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>

      {totalSetups === 0 ? (
        <EmptyState
          icon={SwatchBook}
          title={hasActiveFilters ? "No setups match these filters" : "Create your first setup"}
          description={hasActiveFilters
            ? "Adjust filters and try again."
            : "Save a setup to tag trades."}
          action={!hasActiveFilters ? (
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Create your first setup
            </Button>
          ) : null}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {setups.map((setup) => {
              const tradeCount = setup.tradeCount ?? 0;

              return (
                <SectionCard
                  key={setup.id}
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-medium text-foreground">{setup.name}</h2>
                          <DataBadge tone={setup.isArchived ? "warning" : "primary"}>
                            {setup.isArchived ? "Archived" : "Active"}
                          </DataBadge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Created {new Date(setup.createdAt).toLocaleDateString("en-US")}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" aria-label={`Edit ${setup.name}`} onClick={() => openEditModal(setup)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" aria-label={`Delete ${setup.name}`} className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(setup)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-4 min-h-[72px] text-sm text-muted-foreground">
                      {setup.description || "No description."}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="surface-muted px-4 py-4">
                        <p className="text-label mb-2">Color</p>
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="h-4 w-4 rounded-full border border-black/5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:ring-white/10"
                            style={{ backgroundColor: resolveDisplayColor(setup.color) }}
                          />
                          <p className="font-mono-price text-base font-medium text-foreground">{resolveDisplayColor(setup.color)}</p>
                        </div>
                      </div>
                      <div className="surface-muted px-4 py-4">
                        <p className="text-label mb-2">Trades</p>
                        <p className="text-2xl font-semibold text-foreground">{formatNumberDisplay(tradeCount)}</p>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              );
            })}
          </div>

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

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(openState) => !openState && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setup</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Existing trades keep their historical setup label.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
