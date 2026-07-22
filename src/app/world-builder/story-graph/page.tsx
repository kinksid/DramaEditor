"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { GraphToolbar } from "@/components/story-graph/GraphToolbar";
import { GraphOutline } from "@/components/story-graph/GraphOutline";
import { NodeEditModal } from "@/components/story-graph/NodeEditModal";
import { PreviewModal } from "@/components/story-graph/PreviewModal";
import { StoryGraphAgentFab, StoryGraphAgentPanel } from "@/components/story-graph/StoryGraphAgentPanel";
import { StoryGraphCanvas } from "@/components/story-graph/StoryGraphCanvas";
import { StoryGraphShell } from "@/components/story-graph/StoryGraphShell";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

export default function StoryGraphPage() {
  return (
    <Suspense fallback={<div className="grid h-screen place-items-center bg-black text-sm text-white/50">加载故事图…</div>}>
      <StoryGraphBootstrap />
    </Suspense>
  );
}

function StoryGraphBootstrap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") ?? undefined;
  const readOnly = searchParams.get("readonly") === "1";
  const fromAppPreview = searchParams.get("from") === "app-preview";
  const {
    ensureProjectLoaded,
    generateStoryGraphFromScript,
    addEpisode,
    episodes,
    setupDraft,
    activeProjectId,
    nodes,
    selectNode,
    cloneProject,
  } = useWorldBuilderStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [agentMinimized, setAgentMinimized] = useState(false);
  const [agentFloatingOpen, setAgentFloatingOpen] = useState(false);
  const scaffoldedRef = useRef<string | null>(null);

  useEffect(() => {
    ensureProjectLoaded(projectId);
  }, [projectId, ensureProjectLoaded]);

  useEffect(() => {
    if (!activeProjectId || scaffoldedRef.current === activeProjectId) return;
    if (episodes.length === 0) {
      addEpisode({ title: "未命名剧集", label: "1" });
      scaffoldedRef.current = activeProjectId;
    }
  }, [activeProjectId, episodes.length, addEpisode]);

  useEffect(() => {
    if (episodes.length === 0 && setupDraft.script.trim()) {
      generateStoryGraphFromScript();
    }
  }, [activeProjectId, episodes.length, setupDraft.script, generateStoryGraphFromScript]);

  useEffect(() => {
    const handler = (e: Event) => {
      if (readOnly) return;
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        selectNode(detail.id);
        setEditorOpen(true);
      }
    };
    window.addEventListener("scene-node-edit", handler);
    return () => window.removeEventListener("scene-node-edit", handler);
  }, [selectNode, readOnly]);

  const handleCloneProject = () => {
    const sourceId = projectId ?? activeProjectId;
    const clonedId = cloneProject(sourceId);
    if (!clonedId) return;
    router.push(`/world-builder/story-graph?project=${clonedId}`);
  };

  return (
    <StoryGraphShell>
      <div className="flex h-full flex-col">
        <GraphToolbar
          variant="studio"
          readOnly={readOnly}
          returnHref={fromAppPreview ? "/world-builder/app-preview" : undefined}
          onPreview={() => setPreviewOpen(true)}
          onCloneProject={handleCloneProject}
        />
        <div className="flex min-h-0 flex-1">
          <GraphOutline readOnly={readOnly} />
          <div className="relative min-w-0 flex-1 bg-[#050505]">
            {nodes.length === 0 && episodes.length <= 1 && !readOnly && (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                <p className="rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm text-white/45 backdrop-blur">
                  双击画布自由编排，或从左侧拖入素材
                </p>
              </div>
            )}
            {readOnly && nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                <p className="rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm text-white/45 backdrop-blur">
                  该项目暂无故事图节点
                </p>
              </div>
            )}
            <StoryGraphCanvas
              readOnly={readOnly}
              agentPanelInset={!readOnly && agentMinimized && agentFloatingOpen}
              onOpenNode={() => {
                if (!readOnly) setEditorOpen(true);
              }}
            />
            {!readOnly && agentMinimized && (
              <StoryGraphAgentFab onClick={() => setAgentFloatingOpen(true)} />
            )}
          </div>
          {!readOnly && !agentMinimized && (
            <StoryGraphAgentPanel onMinimize={() => setAgentMinimized(true)} />
          )}
        </div>
      </div>
      {!readOnly && agentMinimized && agentFloatingOpen && (
        <>
          <button
            type="button"
            aria-label="关闭 AI 助手"
            className="fixed inset-0 top-14 z-40 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setAgentFloatingOpen(false)}
          />
          <StoryGraphAgentPanel
            mode="floating"
            animateEntry
            onClose={() => setAgentFloatingOpen(false)}
          />
        </>
      )}
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
      {!readOnly && <NodeEditModal open={editorOpen} onClose={() => setEditorOpen(false)} />}
    </StoryGraphShell>
  );
}
