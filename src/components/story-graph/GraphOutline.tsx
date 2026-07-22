"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ExternalLink,
  Film,
  ImagePlus,
  Loader2,
  MapPin,
  Play,
  Sparkles,
  Trash2,
  UserRound,
  Check,
  X,
} from "lucide-react";
import { analyzeScript } from "@/lib/scriptAnalysis";
import { setDramaAssetDragData } from "@/lib/dramaAssetDrag";
import { cn } from "@/lib/utils";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/modalTheme";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { locationTypeLabels } from "@/lib/worldBuilderLabels";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Episode, StoryNode } from "@/types/worldBuilder";

type PanelTab = "assets" | "outline";

type GraphOutlineProps = {
  className?: string;
  readOnly?: boolean;
};

export function GraphOutline({ className, readOnly = false }: GraphOutlineProps) {
  const {
    episodes,
    nodes,
    selectedEpisodeId,
    selectedNodeId,
    selectEpisode,
    selectNode,
    setupDraft,
    updateSetupDraft,
    deleteEpisode,
    characters,
    locations,
    updateNode,
    activeProjectId,
  } = useWorldBuilderStore();
  const [tab, setTab] = useState<PanelTab>("assets");
  const [scriptOpen, setScriptOpen] = useState(false);
  const [scriptDraft, setScriptDraft] = useState(setupDraft.script);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    characters: { name: string; role: string }[];
    scenes: { title: string; prompt: string }[];
    interactions: { title: string; instruction: string }[];
    episodes: { title: string }[];
  } | null>(null);

  const handleScriptAnalyze = () => {
    setAnalyzing(true);
    const text = scriptDraft.trim();
    if (!text) {
      setAnalyzing(false);
      return;
    }
    setTimeout(() => {
      setAnalysisResult(analyzeScript(text));
      setAnalyzing(false);
    }, 300);
  };

  const applyAnalysis = () => {
    if (!analysisResult) return;
    updateSetupDraft({ script: scriptDraft });
    useWorldBuilderStore.getState().generateStoryGraphFromScript({ force: true });
    setAnalysisResult(null);
    setScriptOpen(false);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const assetsHref = activeProjectId
    ? `/world-builder/stories/${activeProjectId}?tab=assets`
    : "/world-builder/worlds";
  const storyDetailHref = activeProjectId
    ? `/world-builder/stories/${activeProjectId}`
    : "/world-builder/worlds";

  return (
    <aside
      className={cn(
        "flex min-h-0 w-[288px] shrink-0 flex-col border-r border-white/8 bg-[#0a0a0a] text-white/90",
        className,
      )}
    >
      <div className="grid grid-cols-2 border-b border-white/8 text-sm">
        <button
          onClick={() => setTab("assets")}
          className={cn(
            "py-3.5 font-semibold transition",
            tab === "assets" ? "border-b-2 border-accent text-white" : "text-white/40 hover:text-white/70",
          )}
        >
          素材
        </button>
        <button
          onClick={() => setTab("outline")}
          className={cn(
            "py-3.5 font-semibold transition",
            tab === "outline" ? "border-b-2 border-accent text-white" : "text-white/40 hover:text-white/70",
          )}
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
                nodes={nodes.filter((n) => n.data.episodeId === episode.id)}
                active={episode.id === selectedEpisodeId}
                onSelectEpisode={() => selectEpisode(episode.id)}
                onSelectNode={(id) => {
                  selectEpisode(episode.id);
                  selectNode(id);
                }}
                onDelete={readOnly ? undefined : () => deleteEpisode(episode.id)}
              />
            ))}
          </div>
        ) : readOnly ? (
          <p className="px-3 text-xs leading-6 text-white/45">只读模式下素材拖放已禁用，可使用「克隆项目」复制后编辑。</p>
        ) : (
          <div className="space-y-4 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              TapNow 式拖放 · 拖到画布生成节点
            </p>

            <AssetGroup title="视频素材" icon={<Film size={12} />}>
              {dramaPlayAssets.map((a) => (
                <DraggableAssetRow
                  key={a.id}
                  label={a.title}
                  hint={a.genre}
                  thumb={a.poster}
                  onDragStart={(dt) =>
                    setDramaAssetDragData(dt, {
                      kind: "video",
                      title: a.title,
                      prompt: a.description,
                      videoUrl: a.video,
                      poster: a.poster,
                    })
                  }
                  onApply={
                    selectedNode?.kind === "scene"
                      ? () =>
                          updateNode(selectedNode.id, {
                            videoUrl: a.video,
                            firstFrameRef: a.poster,
                            title: a.title,
                            status: "ready",
                          })
                      : undefined
                  }
                />
              ))}
            </AssetGroup>

            <AssetGroup title="角色" icon={<UserRound size={12} />}>
              {characters.length === 0 && <EmptyHint text="暂无角色，去素材库添加" href={assetsHref} />}
              {characters.map((c) => (
                <DraggableAssetRow
                  key={c.id}
                  label={c.name}
                  hint={c.role}
                  thumb={c.referenceImage}
                  onDragStart={(dt) =>
                    setDramaAssetDragData(dt, {
                      kind: "character",
                      title: c.name,
                      prompt: `${c.name} · ${c.role} · ${c.description}`,
                      characterId: c.id,
                      referenceImage: c.referenceImage,
                    })
                  }
                />
              ))}
            </AssetGroup>

            <AssetGroup title="地点" icon={<MapPin size={12} />}>
              {locations.length === 0 && <EmptyHint text="暂无地点，去素材库添加" href={assetsHref} />}
              {locations.map((l) => (
                <DraggableAssetRow
                  key={l.id}
                  label={l.name}
                  hint={locationTypeLabels[l.type]}
                  thumb={l.referenceImage}
                  onDragStart={(dt) =>
                    setDramaAssetDragData(dt, {
                      kind: "location",
                      title: l.name,
                      prompt: `${l.name} · ${l.description}`,
                      locationId: l.id,
                      referenceImage: l.referenceImage,
                    })
                  }
                />
              ))}
            </AssetGroup>

            <Link
              href={assetsHref}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-xs text-white/45 hover:border-accent/50 hover:text-accent transition"
            >
              <ImagePlus size={14} /> 打开完整素材库
            </Link>
          </div>
        )}
      </div>

      <div className="border-t border-white/8 p-4">
        <button
          type="button"
          onClick={() => {
            setScriptDraft(setupDraft.script);
            setScriptOpen(true);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 px-3 py-2.5 text-xs font-medium text-white/75 hover:bg-white/8"
        >
          <Sparkles size={13} /> 查看完整剧本
        </button>
        <Link
          href={storyDetailHref}
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-accent px-3 py-2.5 text-xs font-semibold text-white hover:bg-accent-deep"
        >
          查看故事详情
        </Link>
      </div>

      {scriptOpen && (
        <div className={MODAL_OVERLAY}>
          <div className={cn(MODAL_PANEL, "flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl p-5")}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">剧本与拆解</h2>
              <button onClick={() => setScriptOpen(false)} className="rounded-lg p-1 text-white/40 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <textarea
              value={scriptDraft}
              onChange={(e) => setScriptDraft(e.target.value)}
              className="mt-4 min-h-[220px] flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              placeholder="粘贴完整剧本…"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={handleScriptAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/8"
              >
                {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                分析剧本
              </button>
              <button
                onClick={applyAnalysis}
                disabled={!analysisResult}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Check size={14} /> 应用到故事图
              </button>
            </div>
            {analysisResult && (
              <p className="mt-3 text-xs text-white/45">
                识别到 {analysisResult.characters.length} 角色 · {analysisResult.scenes.length} 场景 ·{" "}
                {analysisResult.interactions.length} 互动
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function AssetGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {icon}
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function EmptyHint({ text, href }: { text: string; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-dashed border-white/12 px-3 py-3 text-[11px] text-white/35 hover:text-accent">
      {text}
    </Link>
  );
}

function DraggableAssetRow({
  label,
  hint,
  thumb,
  onDragStart,
  onApply,
}: {
  label: string;
  hint?: string;
  thumb?: string;
  onDragStart: (dt: DataTransfer) => void;
  onApply?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e.dataTransfer)}
      className="group flex cursor-grab items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2 active:cursor-grabbing hover:border-accent/40 hover:bg-accent/10 transition"
      title="拖到画布"
    >
      <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/5">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <Play size={12} className="text-accent" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white/90">{label}</p>
        {hint && <p className="truncate text-[10px] text-white/35">{hint}</p>}
      </div>
      {onApply && (
        <button
          type="button"
          onClick={onApply}
          className="rounded-md px-2 py-1 text-[10px] text-accent opacity-0 group-hover:opacity-100 hover:bg-accent/20"
        >
          套用
        </button>
      )}
    </div>
  );
}

function EpisodeOutline({
  episode,
  nodes,
  active,
  onSelectEpisode,
  onSelectNode,
  onDelete,
}: {
  episode: Episode;
  nodes: StoryNode[];
  active: boolean;
  onSelectEpisode: () => void;
  onSelectNode: (id: string) => void;
  onDelete?: () => void;
}) {
  return (
    <div className={cn("rounded-xl", active && "bg-white/6")}>
      <div className="flex items-center gap-1 px-2 py-2">
        <button onClick={onSelectEpisode} className="min-w-0 flex-1 text-left text-xs font-semibold text-white/85">
          第 {episode.index} 集 · {episode.title}
        </button>
        {onDelete && (
          <button onClick={onDelete} className="rounded p-1 text-white/25 hover:bg-white/10 hover:text-red-300" title="删除剧集">
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="space-y-0.5 px-1 pb-2">
        {nodes.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelectNode(node.id)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-white/50 hover:bg-white/8 hover:text-white/80"
          >
            <ExternalLink size={11} className="opacity-40" />
            <span className="truncate">{node.data.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
