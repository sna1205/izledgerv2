import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/client";
import { createSetup, deleteSetup, listSetups, updateSetup } from "@/lib/api/setups";
import { listTrades } from "@/lib/api/trades";
import type { SetupDefinition } from "@/lib/types";

const emptyForm = {
  name: "",
  description: "",
  color: "#10b981",
};

function getContrastColor(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 155 ? "#0f172a" : "#ffffff";
}

export default function Setups() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<SetupDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SetupDefinition | null>(null);
  const [form, setForm] = useState(emptyForm);

  const setupsQuery = useQuery({
    queryKey: ["setups"],
    queryFn: async () => {
      const response = await listSetups();
      return response.items;
    },
  });
  const tradesQuery = useQuery({
    queryKey: ["trades", "usage"],
    queryFn: () => listTrades({ page: 1, pageSize: 100 }),
  });

  const setupUsage = useMemo(() => {
    return (tradesQuery.data?.items ?? []).reduce<Record<string, number>>((acc, trade) => {
      if (!trade.setup) {
        return acc;
      }

      acc[trade.setup] = (acc[trade.setup] || 0) + 1;
      return acc;
    }, {});
  }, [tradesQuery.data?.items]);

  const invalidateData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["setups"] }),
      queryClient.invalidateQueries({ queryKey: ["trades"] }),
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

  const setups = setupsQuery.data ?? [];

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
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading setups...</div>;
  }

  if (setupsQuery.isError) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground">Setups unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">We could not load your setups right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
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

        {setups.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-14 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">No setups created yet.</p>
            <Button size="sm" className="mt-4" onClick={openCreateModal}>
              <Plus className="mr-1 h-4 w-4" />
              Create your first setup
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {setups.map((setup) => {
              const tradeCount = setupUsage[setup.name] || 0;
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
