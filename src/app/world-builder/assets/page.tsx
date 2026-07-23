"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

export default function AssetsPage() {
  const router = useRouter();
  const activeProjectId = useWorldBuilderStore((state) => state.activeProjectId);

  useEffect(() => {
    if (activeProjectId) {
      router.replace(`/world-builder/stories/${activeProjectId}?tab=characters`);
      return;
    }
    router.replace("/world-builder/worlds");
  }, [activeProjectId, router]);

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="grid min-h-[40vh] place-items-center text-sm text-ink-muted">正在跳转到故事工作台…</div>
    </WorldBuilderLayout>
  );
}
