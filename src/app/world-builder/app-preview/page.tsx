"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  Film,
  GitBranch,
  Play,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { actionTypeLabels, statusLabels } from "@/lib/worldBuilderLabels";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { StoryNode } from "@/types/worldBuilder";

export default function AppPreviewPage() {
  const { world, episodes, nodes, edges, exportAppJson, generateAllMockVideos } = useWorldBuilderStore();
  const [episodeId, setEpisodeId] = useState(episodes[0]?.id ?? "");
  const episodeNodes = useMemo(
    () => nodes.filter((node) => node.data.episodeId === episodeId),
    [episodeId, nodes],
  );
  const firstPlayable = episodeNodes.find((node) => node.kind === "scene") ?? episodeNodes[0];
  const [activeNodeId, setActiveNodeId] = useState(firstPlayable?.id ?? "");
  const activeNode = nodes.find((node) => node.id === activeNodeId && node.data.episodeId === episodeId) ?? firstPlayable;
  const currentEpisode = episodes.find((episode) => episode.id === episodeId) ?? episodes[0];

  useEffect(() => {
    if (!episodeId && episodes[0]) {
      setEpisodeId(episodes[0].id);
    }
  }, [episodeId, episodes]);

  useEffect(() => {
    if (!activeNode && firstPlayable) {
      setActiveNodeId(firstPlayable.id);
    }
  }, [activeNode, firstPlayable]);

  const downloadAppJson = () => {
    const blob = new Blob([exportAppJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drama-play-app-story.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const jumpToEpisode = (nextEpisodeId: string) => {
    setEpisodeId(nextEpisodeId);
    const nextNode = nodes.find((node) => node.data.episodeId === nextEpisodeId && node.kind === "scene");
    setActiveNodeId(nextNode?.id ?? "");
  };

  const chooseTarget = (targetNodeId?: string) => {
    if (!targetNodeId) return;
    const target = nodes.find((node) => node.id === targetNodeId);
    if (!target) return;
    setEpisodeId(target.data.episodeId);
    setActiveNodeId(target.id);
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <main className="grid min-h-screen gap-5 bg-stage p-5 xl:grid-cols-[1fr_410px]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Link href="/world-builder/stories/the-memory-thief" className="hover:text-ink-strong">
                  记忆盗贼
                </Link>
                <span>/</span>
                <span>App 预览</span>
              </div>
              <h1 className="mt-2 text-3xl font-semibold">iOS 互动播放验收</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={generateAllMockVideos}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <Film size={16} /> 生成模拟视频
              </button>
              <button
                onClick={downloadAppJson}
                className="inline-flex items-center gap-2 rounded-xl bg-ink-strong px-4 py-2 text-sm font-semibold text-white"
              >
                <Download size={16} /> 导出 App 数据
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500">剧集列表</h2>
              {episodes.map((episode) => {
                const readyCount = nodes.filter(
                  (node) => node.data.episodeId === episode.id && node.kind === "scene" && node.data.status === "ready",
                ).length;
                const totalScenes = nodes.filter((node) => node.data.episodeId === episode.id && node.kind === "scene").length;
                return (
                  <button
                    key={episode.id}
                    onClick={() => jumpToEpisode(episode.id)}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left",
                      episode.id === episodeId
                        ? "border-orange-200 bg-orange-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      第 {(episode.label ?? String(episode.index)).toUpperCase()} 集
                    </p>
                    <h3 className="mt-1 text-sm font-semibold">{episode.title}</h3>
                    <p className="mt-2 text-xs text-slate-500">{readyCount}/{totalScenes} 视频就绪</p>
                  </button>
                );
              })}
            </aside>

            <section className="grid place-items-center rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top,#fff7ed,#eef2f7_42%,#d8dee9)] p-6">
              <div className="relative w-full max-w-[393px] rounded-[3rem] border-[12px] border-[#17181c] bg-[#17181c] shadow-2xl">
                <div className="absolute left-1/2 top-2 z-20 h-7 w-32 -translate-x-1/2 rounded-full bg-[#17181c]" />
                <div className="absolute inset-x-16 top-0 z-30 h-1 rounded-b-full bg-white/12" />
                <div className="aspect-[393/852] overflow-hidden rounded-[2.2rem] bg-black text-white">
                  <PhoneScreen node={activeNode} worldTitle={world.title} onChoose={chooseTarget} />
                </div>
                <div className="absolute inset-x-24 bottom-2 z-20 h-1 rounded-full bg-white/35" />
              </div>
            </section>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold tracking-[0.16em] text-accent">播放路径</p>
            <h2 className="mt-2 text-xl font-semibold">{currentEpisode?.title ?? "未选择剧集"}</h2>
            <div className="mt-4 space-y-2">
              {episodeNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setActiveNodeId(node.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm",
                    node.id === activeNode?.id
                      ? "border-orange-200 bg-orange-50 text-accent"
                      : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{node.data.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{nodeKindLabel(node)}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold tracking-[0.16em] text-accent">应用数据</p>
            <h2 className="mt-2 text-xl font-semibold">分支连接</h2>
            <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">
              {edges.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">还没有连接线。</p>
              ) : (
                edges.map((edge) => {
                  const source = nodes.find((node) => node.id === edge.source);
                  const target = nodes.find((node) => node.id === edge.target);
                  return (
                    <div key={edge.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <GitBranch size={14} />
                        <span>{edge.actionType ? actionTypeLabels[edge.actionType as keyof typeof actionTypeLabels] ?? "结局" : "继续"}</span>
                      </div>
                      <p className="mt-2 leading-6">
                        {source?.data.title ?? edge.source} → {target?.data.title ?? edge.target}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </main>
    </WorldBuilderLayout>
  );
}

function PhoneScreen({
  node,
  worldTitle,
  onChoose,
}: {
  node?: StoryNode;
  worldTitle: string;
  onChoose: (targetNodeId?: string) => void;
}) {
  if (!node) {
    return (
      <div className="grid h-full place-items-center px-8 text-center">
        <div>
          <Smartphone className="mx-auto text-white/45" size={36} />
          <h2 className="mt-4 text-lg font-semibold">空剧集</h2>
          <p className="mt-2 text-sm leading-6 text-white/50">添加视频节点后即可预览 App 播放效果。</p>
        </div>
      </div>
    );
  }

  if (node.kind === "interaction") {
    return (
      <div className="relative flex h-full flex-col justify-between bg-[linear-gradient(160deg,#090d16,#283244_48%,#f27d3d)] p-5">
        {node.data.loopVideoUrl && (
          <video src={node.data.loopVideoUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-55" />
        )}
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">{worldTitle}</p>
          <h2 className="mt-3 text-2xl font-semibold">{node.data.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/68">{node.data.instruction}</p>
        </div>
        <div className="relative z-10 space-y-2">
          {node.data.options.map((option) => (
            <button
              key={option.id}
              onClick={() => onChoose(option.targetNodeId)}
              className="flex w-full items-center justify-between rounded-2xl bg-white/92 px-4 py-3 text-left text-sm font-semibold text-ink-strong"
            >
              <span>
                {option.label}
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {actionTypeLabels[option.actionType]} {option.actionValue}
                </span>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (node.kind === "ending") {
    return (
      <div className="flex h-full flex-col justify-between bg-[linear-gradient(160deg,#1f1111,#3a1720_48%,#ef4444)] p-5">
        <div className="flex justify-between text-xs text-white/55">
          <span>{worldTitle}</span>
          <span>{node.data.endingType}</span>
        </div>
        <div>
          <CheckCircle2 size={34} className="text-white/75" />
          <h2 className="mt-4 text-3xl font-semibold">{node.data.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">{node.data.description}</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink-strong">
          <RotateCcw size={16} /> 重新开始
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col justify-between bg-[linear-gradient(160deg,#090d16,#151b29_45%,#f27d3d)] p-5">
      {node.data.videoUrl && !node.data.videoUrl.startsWith("mock://") && (
        <video src={node.data.videoUrl} autoPlay muted loop playsInline controls className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/70" />
      <div className="relative z-10 flex items-center justify-between text-xs text-white/75">
        <span>{worldTitle}</span>
        <span>{statusLabels[node.data.status]}</span>
      </div>
      <div className="relative z-10 rounded-3xl border border-white/12 bg-black/40 p-5 backdrop-blur">
        <div className="mb-4 flex items-center gap-2 text-white/75">
          <Play size={18} />
          <span className="text-sm font-semibold">{node.data.videoUrl?.startsWith("mock://") ? "模拟视频" : "本地视频"}</span>
        </div>
        <h2 className="text-2xl font-semibold">{node.data.title}</h2>
        <p className="mt-3 line-clamp-6 text-sm leading-6 text-white/65">{node.data.prompt}</p>
      </div>
      <div className="relative z-10 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/72 backdrop-blur">
        <span>向后继续播放</span>
        <ArrowLeft size={16} className="rotate-180" />
      </div>
    </div>
  );
}

function nodeKindLabel(node: StoryNode) {
  if (node.kind === "scene") return `视频节点 · ${statusLabels[node.data.status]}`;
  if (node.kind === "interaction") return `${node.data.options.length} 个互动选项`;
  return `${node.data.endingType} 结局`;
}
