"use client";

import { useEffect } from "react";
import { AccountModalHost } from "@/components/world-builder/AccountManagement";
import { TopBar, TOP_BAR_OFFSET_CLASS } from "@/components/world-builder/TopBar";
import { WorldAgentPanel } from "@/components/world-builder/WorldAgentPanel";
import { useProjectSync } from "@/hooks/useProjectSync";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import { useProviderSettingsStore } from "@/stores/providerSettingsStore";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  agentMode?: "world" | "setup" | "graph" | "none";
};

export function WorldBuilderLayout({ children, agentMode = "world" }: Props) {
  useProjectSync();
  const pendingGenerationTasks = useWorldBuilderStore((state) => state.pendingGenerationTasks);
  const pollGenerationTasks = useWorldBuilderStore((state) => state.pollGenerationTasks);
  const hasHydrated = useWorldBuilderStore((state) => state.hasHydrated);
  const resetStaleGenerationStates = useWorldBuilderStore((state) => state.resetStaleGenerationStates);

  useEffect(() => {
    void useProviderSettingsStore.getState().loadFromServer();
  }, []);

  useEffect(() => {
    if (hasHydrated) {
      resetStaleGenerationStates();
    }
  }, [hasHydrated, resetStaleGenerationStates]);

  useEffect(() => {
    if (pendingGenerationTasks.length === 0) return;
    void pollGenerationTasks();
    const timer = setInterval(() => {
      void pollGenerationTasks();
    }, 2000);
    return () => clearInterval(timer);
  }, [pendingGenerationTasks.length, pollGenerationTasks]);

  return (
    <div className={cn("flex min-h-screen bg-stage text-ink", TOP_BAR_OFFSET_CLASS)}>
      <TopBar />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      {agentMode !== "none" && <WorldAgentPanel mode={agentMode} />}
      <AccountModalHost />
    </div>
  );
}
