"use client";

import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { WorldHero } from "@/components/world-builder/WorldHero";
import { WorldTabs } from "@/components/world-builder/WorldTabs";

export default function WorldBuilderPage() {
  return (
    <WorldBuilderLayout>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <WorldHero />
        <WorldTabs />
      </div>
    </WorldBuilderLayout>
  );
}
