"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { LocationStudio } from "@/components/world-builder/LocationStudio";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";

function LocationStudioContent() {
  const params = useParams<{ storyId: string; locationId: string }>();
  return <LocationStudio storyId={params.storyId} locationId={params.locationId} />;
}

export default function LocationStudioPage() {
  return (
    <WorldBuilderLayout agentMode="none">
      <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm text-white/45">加载中…</div>}>
        <LocationStudioContent />
      </Suspense>
    </WorldBuilderLayout>
  );
}
