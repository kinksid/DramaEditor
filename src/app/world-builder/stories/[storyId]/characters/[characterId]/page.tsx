"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { CharacterStudio } from "@/components/world-builder/CharacterStudio";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";

function CharacterStudioContent() {
  const params = useParams<{ storyId: string; characterId: string }>();
  return (
    <CharacterStudio storyId={params.storyId} characterId={params.characterId} />
  );
}

export default function CharacterStudioPage() {
  return (
    <WorldBuilderLayout agentMode="none">
      <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm text-white/45">加载中…</div>}>
        <CharacterStudioContent />
      </Suspense>
    </WorldBuilderLayout>
  );
}
