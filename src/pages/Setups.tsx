import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { addSetup, deleteSetup, getSetups, updateSetup } from "@/lib/setups";
import { getTrades } from "@/lib/trades";
import { SetupDefinition } from "@/lib/types";

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
  const [setups, setSetups] = useState<SetupDefinition[]>(() => getSetups());
  const [open, setOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<SetupDefinition | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const trades = useMemo(() => getTrades(), []);
  const setupUsage = useMemo(() => {
    return trades.reduce<Record<string, number>>((acc, trade) => {
      if (!trade.setup) return acc;
      acc[trade.setup] = (acc[trade.setup] || 0) + 1;
      return acc;
    }, {});
  }, [trades]);

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

  const handleSave = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
    };

    if (!payload.name) {
      toast.error("Setup name is required.");
      return;
    }

    const duplicateExists = setups.some(
      (setup) =>
        setup.name.toLowerCase() === payload.name.toLowerCase() &&
        setup.id !== editingSetup?.id,
    );

    if (duplicateExists) {
      toast.error("Setup names must be unique.");
      return;
    }

    if (editingSetup) {
      const updated: SetupDefinition = {
        ...editingSetup,
        ...payload,
      };

      updateSetup(updated);
      setSetups((current) => current.map((setup) => (setup.id === updated.id ? updated : setup)));
      toast.success("Setup updated successfully.");
    } else {
      const next = addSetup(payload);
      setSetups((current) => [...current, next]);
      toast.success("Setup created successfully.");
    }

    setOpen(false);
    setEditingSetup(null);
    setForm(emptyForm);
  };

  const handleDelete = () => {
    if (!deleteId) return;

    deleteSetup(deleteId);
    setSetups((current) => current.filter((setup) => setup.id !== deleteId));
    setDeleteId(null);
    toast.success("Setup deleted. Existing trade history was preserved.");
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Setups</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage your trading setups</p>
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
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: setup.color, color: contrastColor }}
                    >
                      {setup.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="rounded-md p-2 transition-colors hover:bg-accent"
                      onClick={() => openEditModal(setup)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      className="rounded-md p-2 transition-colors hover:bg-destructive/10"
                      onClick={() => setDeleteId(setup.id)}
                    >
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSetup ? "Edit Setup" : "Create Setup"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Setup Name</Label>
              <Input
                placeholder="Liquidity Sweep"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea
                rows={4}
                placeholder="Describe the entry conditions, confirmation, and risk rules."
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
                <Input
                  value={form.color}
                  onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingSetup ? "Save Changes" : "Save Setup"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setup</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the setup from future trade selection only. Existing trade history will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
