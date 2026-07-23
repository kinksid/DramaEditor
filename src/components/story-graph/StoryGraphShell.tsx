"use client";

import { useEffect } from "react";
import { AccountModalHost } from "@/components/world-builder/AccountManagement";
import { useProjectSync } from "@/hooks/useProjectSync";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import { useProviderSettingsStore } from "@/stores/providerSettingsStore";

type Props = {
  children: React.ReactNode;
};

export function StoryGraphShell({ children }: Props) {
  useProjectSync();
  const pendingGenerationTasks = useWorldBuilderStore((state) => state.pendingGenerationTasks);
  const pollGenerationTasks = useWorldBuilderStore((state) => state.pollGenerationTasks);
  const hasHydrated = useWorldBuilderStore((state) => state.hasHydrated);
  const resetStaleGenerationStates = useWorldBuilderStore((state) => state.resetStaleGenerationStates);
  const activeProjectId = useWorldBuilderStore((state) => state.activeProjectId);
  const markProjectOpened = useWorldBuilderStore((state) => state.markProjectOpened);

  useEffect(() => {
    void useProviderSettingsStore.getState().loadFromServer();
  }, []);

  // 进入 / 退出故事图时刷新 lastOpenedAt，工作空间「最近的项目」按最后退出排序
  useEffect(() => {
    if (!activeProjectId) return;
    markProjectOpened(activeProjectId);
    return () => {
      markProjectOpened(activeProjectId);
    };
  }, [activeProjectId, markProjectOpened]);

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
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white">
      {children}
      <AccountModalHost />
    </div>
  );
}
