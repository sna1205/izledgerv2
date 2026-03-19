import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageErrorState } from "@/components/PageErrorState";
import { SetupsSkeleton } from "@/components/skeletons/SetupsSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/PaginationControls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { createSetup, deleteSetup, listSetups, updateSetup } from "@/lib/api/setups";
import { getPageErrorState } from "@/lib/page-errors";
import { withMinimumDelay } from "@/lib/loading";
import { privateQueryKey } from "@/lib/react-query";
import type { SetupDefinition } from "@/lib/types";

const emptyForm = {
  name: "",
  description: "",
  color: "#10b981",
};
const SETUPS_PAGE_SIZE = 12;

function getContrastColor(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 155 ? "#0f172a" : "#ffffff";
}

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
    queryFn: async () => {
      return withMinimumDelay(() => listSetups({
        search,
        status: statusFilter,
        page,
        pageSize: SETUPS_PAGE_SIZE,
        sortBy,
        sortOrder,
      }));
    },
  });
  const setups = setupsQuery.data?.items ?? [];
  const totalSetups = setupsQuery.data?.pagination.total ?? 0;
  const totalSetupPages = setupsQuery.data?.pagination.totalPages ?? 1;

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
        color: payload.color,
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

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

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
    <div className="page-enter p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Setups</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create and manage your trading setups.</p>
          </div>

          <Button size="sm" onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" />
            Add Setup
          </Button>
        </div>

        <div className="mb-6 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Search</p>
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search setups..."
                  className="h-10 rounded-xl border-border/70 bg-background/80"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value as typeof statusFilter);
                  setPage(1);
                }}>
                  <SelectTrigger className="h-10 rounded-xl border-border/70 bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Setups</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Sort By</p>
                <Select value={sortBy} onValueChange={(value) => {
                  setSortBy(value as typeof sortBy);
                  setPage(1);
                }}>
                  <SelectTrigger className="h-10 rounded-xl border-border/70 bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created At</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Order</p>
                <Select value={sortOrder} onValueChange={(value) => {
                  setSortOrder(value as typeof sortOrder);
                  setPage(1);
                }}>
                  <SelectTrigger className="h-10 rounded-xl border-border/70 bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{totalSetups}</span> {totalSetups === 1 ? "setup" : "setups"}
            </div>
          </div>
        </div>

        {totalSetups === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-14 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? "No setups match this search." : "No setups created yet."}
            </p>
            {!hasActiveFilters ? (
              <Button size="sm" className="mt-4" onClick={openCreateModal}>
                <Plus className="mr-1 h-4 w-4" />
                Create your first setup
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {setups.map((setup) => {
                const tradeCount = setup.tradeCount ?? 0;
                const contrastColor = getContrastColor(setup.color);

                return (
                  <article key={setup.id} className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex items-start gap-3">
                        <span
                          className="inline-flex max-w-full truncate rounded-full px-3 py-1 text-xs font-semibold"
                          style={{ backgroundColor: setup.color, color: contrastColor }}
                        >
                          {setup.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button className="rounded-md p-2 transition-colors hover:bg-accent" onClick={() => openEditModal(setup)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button className="rounded-md p-2 transition-colors hover:bg-destructive/10" onClick={() => setDeleteTarget(setup)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </div>

                    <p className="min-h-[3rem] text-sm leading-relaxed text-muted-foreground">
                      {setup.description || "No description added yet."}
                    </p>

                    <div className="mt-5 flex items-center justify-between rounded-lg border bg-background/70 px-3 py-2">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Color</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{setup.color.toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Trades</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{tradeCount}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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
          <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingSetup ? "Edit Setup" : "Create Setup"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Setup Name</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Color</Label>
                <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                    className="h-10 w-12 rounded border-0 bg-transparent p-0"
                  />
                  <Input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingSetup ? "Save Changes" : "Save Setup"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(openState) => !openState && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Setup</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the setup from future trade selection only. Existing trade history will remain unchanged.
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
      </div>
    </div>
  );
}
