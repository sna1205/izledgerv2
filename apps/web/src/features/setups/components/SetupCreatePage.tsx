import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DataBadge } from "@/components/DataBadge";
import { PageErrorState } from "@/components/PageErrorState";
import { SetupWorkspaceSkeleton } from "@/components/skeletons/SetupWorkspaceSkeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { PageHeader, PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { SetupForm } from "@/features/setups/components/SetupForm";
import { SetupPreTradeSection } from "@/features/setups/components/SetupPreTradeSection";
import {
  buildStrategyForm,
  buildUniqueFormColor,
  resolveDisplayColor,
  toStrategyPayload,
  type SetupStrategyPayload,
  type StrategyFormState,
} from "@/features/setups/components/setup-form-state";
import { ApiError } from "@/services/api/client";
import { createSetup, listSetups, updateSetup } from "@/services/api/setups";
import { privateQueryKey } from "@/services/query-client";
import { getPageErrorState } from "@/utils/page-errors";
import { withMinimumDelay } from "@/utils/loading";
import { normalizeSetupColor, type SetupDefinition } from "@/types";

type WorkspaceTab = "strategy" | "pre-trade";

export function SetupCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("strategy");
  const [currentSetup, setCurrentSetup] = useState<SetupDefinition | null>(null);
  const [form, setForm] = useState<StrategyFormState>({
    name: "",
    description: "",
    entryLogic: "",
    confirmationLogic: "",
    invalidationLogic: "",
    notes: "",
    color: "#10B981",
    isArchived: false,
  });

  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "workspace-options"),
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

  useUnauthorizedSessionGuard(setupsQuery.error);

  const setups = useMemo(() => setupsQuery.data ?? [], [setupsQuery.data]);

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
      payload: SetupStrategyPayload;
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

  useEffect(() => {
    if (setupsQuery.data && !currentSetup) {
      setForm((current) => ({
        ...current,
        color: buildUniqueFormColor(setups, currentSetup?.id),
      }));
    }
  }, [currentSetup, setups, setupsQuery.data]);

  const previewColor = resolveDisplayColor(form.color);
  const formColorLabel = normalizeSetupColor(form.color) ?? previewColor;
  const strategyPayload = useMemo(() => toStrategyPayload(form), [form]);

  const handleSaveStrategy = async () => {
    const response = await saveMutation.mutateAsync({
      setupId: currentSetup?.id ?? null,
      payload: strategyPayload,
    });

    const savedSetup = response.setup;

    setCurrentSetup(savedSetup);
    setForm(buildStrategyForm(savedSetup, currentSetup ? setups : [...setups, savedSetup]));
    await invalidateData();

    if (!currentSetup) {
      setActiveTab("pre-trade");
      toast.success("Strategy saved. You can add setup-specific pre-trade items now.");
      return;
    }

    toast.success("Strategy updated.");
  };

  if (setupsQuery.isLoading && !setupsQuery.data) {
    return <SetupWorkspaceSkeleton />;
  }

  if (setupsQuery.isError) {
    const errorState = getPageErrorState(setupsQuery.error, {
      unavailableTitle: "Setup workspace unavailable",
      unavailableDescription: "The setup builder is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      validationTitle: "Setup request invalid",
      validationDescription: "The setup workspace request is invalid.",
      timeoutTitle: "Setup workspace timed out",
      timeoutDescription: "Loading the setup builder took too long. Please try again.",
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
        title={currentSetup ? currentSetup.name : "New Setup"}
        actions={(
          <>
            <Button asChild variant="outline">
              <Link to="/setups">
                <ArrowLeft className="h-4 w-4" />
                Back to Setups
              </Link>
            </Button>
            {activeTab === "strategy" ? (
              <Button onClick={() => void handleSaveStrategy()} disabled={saveMutation.isPending}>
                <Plus className="h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : currentSetup ? "Save" : "Create"}
              </Button>
            ) : null}
          </>
        )}
      />

      <div className="rounded-[32px] border border-border bg-card/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <DataBadge tone={form.isArchived ? "warning" : "primary"}>
                {form.isArchived ? "Archived" : "Active"}
              </DataBadge>
              {currentSetup ? <DataBadge tone="neutral">Saved</DataBadge> : <DataBadge tone="neutral">Draft</DataBadge>}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="w-full lg:w-auto">
            <TabsList className="grid h-auto w-full grid-cols-2 lg:w-[280px]">
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
              <TabsTrigger value="pre-trade">Pre-Trade</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="space-y-6">
        <TabsContent value="strategy" className="space-y-6">
          <SetupForm
            form={form}
            onFormChange={(updater) => setForm((current) => updater(current))}
            previewColor={previewColor}
            formColorLabel={formColorLabel}
            onRegenerateColor={() => setForm((current) => ({
              ...current,
              color: buildUniqueFormColor(setups, currentSetup?.id),
            }))}
          />
        </TabsContent>

        <TabsContent value="pre-trade">
          <SetupPreTradeSection setup={currentSetup} isOpen={activeTab === "pre-trade"} />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 z-10 -mt-2 flex justify-end">
        <div className="rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => navigate("/setups")}>
              Cancel
            </Button>
            {activeTab === "strategy" ? (
              <Button onClick={() => void handleSaveStrategy()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : currentSetup ? "Save" : "Create"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
