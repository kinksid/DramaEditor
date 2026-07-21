"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { WorldHero } from "@/components/world-builder/WorldHero";
import { WorldTabs } from "@/components/world-builder/WorldTabs";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type WorldSection = "characters" | "locations" | "storylines";

export function WorldDetailPage({
  worldId,
  section = "characters",
}: {
  worldId: string;
  section?: WorldSection;
}) {
  const hasHydrated = useWorldBuilderStore((state) => state.hasHydrated);
  const projects = useWorldBuilderStore((state) => state.projects);
  const ensureProjectLoaded = useWorldBuilderStore(
    (state) => state.ensureProjectLoaded,
  );
  const projectExists = projects.some((project) => project.id === worldId);

  useEffect(() => {
    if (hasHydrated) ensureProjectLoaded(worldId);
  }, [ensureProjectLoaded, hasHydrated, worldId]);

  if (hasHydrated && !projectExists) {
    return (
      <WorldBuilderLayout agentMode="none">
        <div className="grid min-h-screen place-items-center bg-stage px-6">
          <div className="max-w-md rounded-3xl border border-card-border bg-card p-8 text-center shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              World not found
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-ink-strong">
              找不到这个世界
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              该世界可能已被删除，或仅存在于另一台设备的本地工作区。
            </p>
            <Link
              href="/world-builder/worlds"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              <ArrowLeft size={16} />
              返回世界库
            </Link>
          </div>
        </div>
      </WorldBuilderLayout>
    );
  }

  return (
    <WorldBuilderLayout>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Link
          href="/world-builder/worlds"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-ink-strong"
        >
          <ArrowLeft size={16} />
          世界库
        </Link>
        <WorldHero />
        <WorldTabs worldId={worldId} activeTab={section} />
      </div>
    </WorldBuilderLayout>
  );
}
