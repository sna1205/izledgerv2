import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, Pencil, Plus, Sparkles, SwatchBook, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar, FilterField } from "@/components/FilterBar";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard } from "@/components/PageShell";
import { PaginationControls } from "@/components/PaginationControls";
import { StatCard } from "@/components/StatCard";
import { DataBadge } from "@/components/DataBadge";
import { SetupsSkeleton } from "@/components/skeletons/SetupsSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { createSetup, deleteSetup, listSetups, updateSetup } from "@/lib/api/setups";
import { formatNumberDisplay } from "@/lib/analytics-rendering";
import { getPageErrorState } from "@/lib/page-errors";
import { withMinimumDelay } from "@/lib/loading";
import { privateQueryKey } from "@/lib/react-query";
import type { SetupDefinition } from "@/lib/types";

const emptyForm = {
  name: "",
  description: "",
  color: "#10B981",
};
const SETUPS_PAGE_SIZE = 12;

export default function Setups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<SetupDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SetupDefinition | null>(null);
  const [form, setForm] = useState(emptyForm);
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
  });

  const setups = setupsQuery.data?.items ?? [];
  const totalSetups = setupsQuery.data?.pagination.total ?? 0;
  const totalSetupPages = setupsQuery.data?.pagination.totalPages ?? 1;
  const activeSetups = setups.filter((setup) => !setup.isArchived).length;
  const archivedSetups = setups.filter((setup) => setup.isArchived).length;
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
    mutationFn: async (payload: typeof emptyForm) => {
      const normalized = {
        name: payload.name.trim(),
        description: payload.description.trim(),
        color: payload.color.trim() || "#10B981",
      };

      if (editingSetup) {
        return updateSetup(editingSetup.id, normalized);
      }

      return createSetup(normalized);
    },
    onSuccess: async () => {
      await invalidateData();
      toast.success(editingSetup ? "Setup updated successfully." : "Setup created successfully.");
      setOpen(false);
      setEditingSetup(null);
      setForm(emptyForm);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the setup right now.";
      toast.error(message);
    },
  });

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

  const openCreateModal = () => {
    setEditingSetup(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEditModal = (setup: SetupDefinition) => {
    setEditingSetup(setup);
    setForm({
      name: setup.name,
      description: setup.description,
      color: setup.color,
    });
    setOpen(true);
  };

  if (setupsQuery.isLoading && !setupsQuery.data) {
    return <SetupsSkeleton />;
  }

  if (setupsQuery.isError) {
    const errorState = getPageErrorState(setupsQuery.error, {
      unavailableTitle: "Setups unavailable",
      unavailableDescription: "The setups service is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session is not allowed to view setups right now.",
      validationTitle: "Setups request invalid",
      validationDescription: "The setup filters in this request are invalid.",
      timeoutTitle: "Setups request timed out",
      timeoutDescription: "Loading setups took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
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
        <StatCard label="Mapped Trades" value={formatNumberDisplay(totalTradesMapped)} icon={SwatchBook} />
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
            : "Add a setup to tag trades."}
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
                        <Button variant="outline" size="icon" onClick={() => openEditModal(setup)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(setup)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-4 min-h-[72px] text-sm text-muted-foreground">
                      {setup.description || "No description."}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="surface-muted px-4 py-4">
                        <p className="text-label mb-2">Color Token</p>
                        <p className="font-mono-price text-base font-medium text-foreground">{setup.color.toUpperCase()}</p>
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

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);

          if (!nextOpen) {
            setEditingSetup(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSetup ? "Edit Setup" : "Create Setup"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-label">Setup Name</Label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label className="text-label">Description</Label>
              <Textarea rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label className="text-label">Color Token</Label>
              <Input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value.toUpperCase() }))} />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingSetup ? "Save Changes" : "Create Setup"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
