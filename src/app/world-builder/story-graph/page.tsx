"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GraphToolbar } from "@/components/story-graph/GraphToolbar";
import { GraphOutline } from "@/components/story-graph/GraphOutline";
import { InspectorPanel } from "@/components/story-graph/InspectorPanel";
import { NodeEditModal } from "@/components/story-graph/NodeEditModal";
import { PreviewModal } from "@/components/story-graph/PreviewModal";
import { StoryGraphCanvas } from "@/components/story-graph/StoryGraphCanvas";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

export default function StoryGraphPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">加载故事图...</div>}>
      <StoryGraphBootstrap />
    </Suspense>
  );
}

function StoryGraphBootstrap() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") ?? undefined;
  const {
    ensureProjectLoaded,
    generateStoryGraphFromScript,
    episodes,
    setupDraft,
    world,
    activeProjectId,
    nodes,
    selectNode,
  } = useWorldBuilderStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    ensureProjectLoaded(projectId);
  }, [projectId, ensureProjectLoaded]);

  useEffect(() => {
    if (episodes.length === 0 && setupDraft.script.trim()) {
      generateStoryGraphFromScript();
    }
  }, [activeProjectId, episodes.length, setupDraft.script, generateStoryGraphFromScript]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        selectNode(detail.id);
        setEditorOpen(true);
      }
    };
    window.addEventListener("scene-node-edit", handler);
    return () => window.removeEventListener("scene-node-edit", handler);
  }, [selectNode]);

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="grid h-screen grid-rows-[auto_auto_1fr] gap-3 bg-[#0c0a0f] p-4 text-white">
        <div className="rounded-2xl border border-white/8 bg-[#16141c] px-4 py-2 text-sm text-white/50">
          当前画布：<span className="font-semibold text-white">{world.title}</span>
          <span className="ml-3 text-xs text-white/35">
            {episodes.length} 集 · {nodes.length} 节点 · TapNow 式素材拖放
          </span>
        </div>
        <GraphToolbar onPreview={() => setPreviewOpen(true)} />
        <div className="grid min-h-0 overflow-hidden rounded-2xl border border-white/8 bg-[#121016] xl:grid-cols-[288px_1fr_360px]">
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
