"use client";

import { useState } from "react";
import { GraphToolbar } from "@/components/story-graph/GraphToolbar";
import { GraphOutline } from "@/components/story-graph/GraphOutline";
import { InspectorPanel } from "@/components/story-graph/InspectorPanel";
import { NodeEditModal } from "@/components/story-graph/NodeEditModal";
import { PreviewModal } from "@/components/story-graph/PreviewModal";
import { StoryGraphCanvas } from "@/components/story-graph/StoryGraphCanvas";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";

export default function StoryGraphPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="grid h-screen grid-rows-[auto_1fr] gap-4 p-5">
        <GraphToolbar onPreview={() => setPreviewOpen(true)} />
        <div className="grid min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white xl:grid-cols-[278px_1fr_360px]">
          <GraphOutline />
          <StoryGraphCanvas onOpenNode={() => setEditorOpen(true)} />
          <InspectorPanel />
        </div>
      </div>
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <NodeEditModal open={editorOpen} onClose={() => setEditorOpen(false)} />
    </WorldBuilderLayout>
  );
}
