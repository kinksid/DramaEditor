"use client";

import { useState } from "react";
import { Bot, CheckCircle2, Clock3, Loader2, Plus, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { suggestNodeChainApi } from "@/lib/generationClient";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type Props = {
  mode: "world" | "setup" | "graph";
  step?: number;
};

const copy = {
  world: [
    ["世界封面", "已生成", "done"],
    ["角色与地点", "可继续编辑", "done"],
    ["故事线", "已准备节点草稿", "done"],
  ],
  setup: [
    ["世界设定", "已完成", "done"],
    ["角色地点识别", "进行中", "active"],
    ["剧本确认", "等待确认", "waiting"],
  ],
  graph: [
    ["故事板", "监听当前项目", "done"],
    ["节点检查器", "正在监听选择", "active"],
    ["预览播放器", "可以打开", "done"],
  ],
} as const;

export function WorldAgentPanel({ mode }: Props) {
  const {
    episodes,
    nodes,
    setupDraft,
    selectedEpisodeId,
    generateAllMockVideos,
    createSuggestedNodes,
  } = useWorldBuilderStore();
  const [loading, setLoading] = useState(false);
  const [agentMessage, setAgentMessage] = useState<string | null>(null);

  const sceneCount = nodes.filter((node) => node.kind === "scene").length;
  const readySceneCount = nodes.filter((node) => node.kind === "scene" && node.data.status === "ready").length;
  const interactionCount = nodes.filter((node) => node.kind === "interaction").length;
  const currentEpisode = episodes.find((item) => item.id === selectedEpisodeId);

  const handleSuggestChain = async () => {
    if (!setupDraft.script.trim()) {
      setAgentMessage("请先在 Setup 中填写剧本，再请求建链建议。");
      return;
    }
    setLoading(true);
    try {
      const result = await suggestNodeChainApi({
        script: setupDraft.script,
        episodeTitle: currentEpisode?.title,
      });
      createSuggestedNodes(result.nodes);
      setAgentMessage(result.summary);
    } catch (error) {
      setAgentMessage(error instanceof Error ? error.message : "建链建议失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="hidden h-screen w-[310px] shrink-0 border-l border-slate-200 bg-white p-5 xl:block">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-ink text-white">
          <Bot size={20} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Canvas 助手</h2>
          <p className="text-xs text-slate-500">只建节点，不自动跑生成</p>
        </div>
      </div>
      <div className="space-y-3">
        {copy[mode].map(([title, status, state]) => {
          const Icon = state === "done" ? CheckCircle2 : state === "active" ? Loader2 : Clock3;
          return (
            <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-2">
                <Icon
                  size={16}
                  className={cn(
                    state === "done" && "text-emerald-500",
                    state === "active" && "animate-spin text-accent",
                    state === "waiting" && "text-slate-400",
                  )}
                />
                <span className="text-sm font-medium">{title}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{status}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-2xl bg-accent-soft p-4">
        <p className="text-sm leading-6 text-slate-700">
          根据剧本建议 scene / interaction 节点链，手动触发生成视频。
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSuggestChain}
            disabled={loading}
            className="rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "分析中..." : "建链建议"}
          </button>
          <button
            onClick={generateAllMockVideos}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
          >
            批量生成
          </button>
        </div>
        {agentMessage && <p className="mt-3 text-xs leading-5 text-slate-600">{agentMessage}</p>}
      </div>
      <div className="mt-4 space-y-2 text-sm">
        {[
          `已构建剧集 · ${episodes.length} 项`,
          `已构建节点 · ${nodes.length} 项`,
          `互动节点 · ${interactionCount} 项`,
          `已生成视频 · ${readySceneCount}/${sceneCount} 项`,
        ].map((item) => (
          <button
            key={item}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={14} className="text-slate-500" />
              {item}
            </span>
            <span className="text-slate-400">›</span>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 p-3">
        <p className="text-sm text-slate-500">Canvas Assistant</p>
        <div className="mt-4 flex items-center justify-between">
          <button className="grid size-8 place-items-center rounded-lg hover:bg-slate-100">
            <Plus size={16} />
          </button>
          <button
            onClick={handleSuggestChain}
            disabled={loading}
            className="grid size-8 place-items-center rounded-lg bg-ink text-white disabled:opacity-60"
          >
            <SendHorizontal size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
