"use client";

import Link from "next/link";
import { useState } from "react";
import { Box, FileText, ExternalLink, Film, GitBranch, MousePointerClick, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Episode, StoryNode } from "@/types/worldBuilder";

type PanelTab = "assets" | "outline";

export function GraphOutline() {
  const { episodes, nodes, selectedEpisodeId, selectEpisode, selectNode, setupDraft } = useWorldBuilderStore();
  const [tab, setTab] = useState<PanelTab>("outline");
  const [scriptOpen, setScriptOpen] = useState(false);

  return (
    <aside className="hidden min-h-0 border-r border-slate-200 bg-white xl:flex xl:w-[278px] xl:flex-col">
      <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
        <button
          onClick={() => setTab("assets")}
          className={cn("py-4 font-semibold", tab === "assets" ? "border-b-2 border-ink text-ink" : "text-slate-400")}
        >
          素材
        </button>
        <button
          onClick={() => setTab("outline")}
          className={cn("py-4 font-semibold", tab === "outline" ? "border-b-2 border-ink text-ink" : "text-slate-400")}
        >
          大纲
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        {tab === "outline" ? (
          <div className="space-y-1 px-2">
            {episodes.map((episode) => (
              <EpisodeOutline
                key={episode.id}
                episode={episode}
                nodes={nodes.filter((node) => node.data.episodeId === episode.id)}
                active={episode.id === selectedEpisodeId}
                onSelectEpisode={() => selectEpisode(episode.id)}
                onSelectNode={(id) => {
                  selectEpisode(episode.id);
                  selectNode(id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2 px-3">
            <AssetOutlineItem icon={Film} title="视频节点" detail={`${nodes.filter((node) => node.kind === "scene").length} 个视频`} />
            <AssetOutlineItem icon={MousePointerClick} title="互动节点" detail={`${nodes.filter((node) => node.kind === "interaction").length} 个互动`} />
            <AssetOutlineItem icon={GitBranch} title="分支连接" detail="点击 / 滑动 / 长按 / 选择" />
            <AssetOutlineItem icon={UsersRound} title="团队协作" detail="编剧 -> 交互 -> 视频 -> 发布" />
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 p-4">
        <p className="text-xs font-semibold">剧本</p>
        <button onClick={() => setScriptOpen(true)} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          <FileText size={15} /> 查看完整剧本
        </button>
        <p className="mt-5 text-xs font-semibold">协作工作流</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          多人无限画布：编剧定分支，交互连节点，视频制作补素材，导演发布检查。
        </p>
        <p className="mt-5 text-xs font-semibold">世界资产</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">管理角色、地点和世界规则。</p>
        <Link
          href="/world-builder"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
        >
          返回世界构建器 <ExternalLink size={14} />
        </Link>
      </div>
      {scriptOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">剧本</p>
                <h2 className="mt-2 text-xl font-semibold">完整剧本</h2>
              </div>
              <button onClick={() => setScriptOpen(false)} className="grid size-9 place-items-center rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <textarea
              className="mt-5 h-[520px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6"
              readOnly
              value={setupDraft.script}
            />
          </div>
        </div>
      )}
    </aside>
  );
}

function EpisodeOutline({
  episode,
  nodes,
  active,
  onSelectEpisode,
  onSelectNode,
}: {
  episode: Episode;
  nodes: StoryNode[];
  active: boolean;
  onSelectEpisode: () => void;
  onSelectNode: (id: string) => void;
}) {
  return (
    <div className={cn("rounded-xl border border-transparent", active && "border-orange-100 bg-orange-50/70")}>
      <button
        onClick={onSelectEpisode}
        className={cn(
          "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs",
          active ? "text-ink" : "text-slate-700 hover:bg-slate-50",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("grid h-5 min-w-5 shrink-0 place-items-center rounded-md px-1 text-[11px] font-semibold", active ? "bg-white text-accent" : "bg-slate-100 text-slate-500")}>
            {(episode.label ?? String(episode.index)).toUpperCase()}
          </span>
          <span className="truncate font-semibold">{episode.title}</span>
        </span>
        <span className="shrink-0 pl-2 text-[11px] text-slate-400">{nodes.length} 节点</span>
      </button>
      {active && (
        <div className="pb-2 pl-8 pr-2">
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-500 hover:bg-white hover:text-ink"
            >
              {node.kind === "scene" && <Film size={12} />}
              {node.kind === "interaction" && <MousePointerClick size={12} />}
              {node.kind === "ending" && <GitBranch size={12} />}
              <span className="truncate">{node.data.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssetOutlineItem({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Box;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg bg-white text-accent">
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}
