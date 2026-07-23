"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Folder,
  Loader2,
  PanelLeft,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { analyzeScript } from "@/lib/scriptAnalysis";
import {
  episodeDisplayLabel,
  episodeLabelGroupKey,
  partitionEpisodesByConnection,
  sortEpisodesByBranch,
} from "@/lib/episodeBranchLabels";
import { setDramaAssetDragData } from "@/lib/dramaAssetDrag";
import { statusLabels } from "@/lib/worldBuilderLabels";
import { cn } from "@/lib/utils";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/modalTheme";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Episode } from "@/types/worldBuilder";

type PanelTab = "assets" | "outline";
type FolderKey = "characters" | "locations" | "scenes" | "interactions";

type GraphOutlineProps = {
  className?: string;
  readOnly?: boolean;
};

export function GraphOutline({ className, readOnly = false }: GraphOutlineProps) {
  const {
    episodes,
    nodes,
    edges,
    selectedEpisodeId,
    selectedNodeId,
    setupDraft,
    updateSetupDraft,
    deleteEpisode,
    characters,
    locations,
    activeProjectId,
    requestCanvasFocus,
  } = useWorldBuilderStore();
  const { connected, unconnected } = partitionEpisodesByConnection(episodes, nodes, edges);
  const outlineMain = sortEpisodesByBranch(connected, nodes, edges);
  const [tab, setTab] = useState<PanelTab>("assets");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<FolderKey, boolean>>({
    characters: true,
    locations: true,
    scenes: true,
    interactions: true,
  });
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

  const assetsLibraryHref = activeProjectId
    ? `/world-builder/stories/${activeProjectId}?tab=characters`
    : "/world-builder/worlds";
  const scenes = nodes.filter((n) => n.kind === "scene");
  const interactions = nodes.filter((n) => n.kind === "interaction");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const match = (title: string) => !q || title.toLowerCase().includes(q);
    return {
      characters: characters.filter((c) => match(c.name || "未命名")),
      locations: locations.filter((l) => match(l.name || "未命名")),
      scenes: scenes.filter((s) => match(s.data.title || "未命名视频")),
      interactions: interactions.filter((n) => match(n.data.title || "未命名交互")),
    };
  }, [characters, locations, scenes, interactions, q]);

  const toggleFolder = (key: FolderKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openLibrary = () => {
    setLibraryOpen(true);
    setTab("assets");
  };

  if (!libraryOpen) {
    return (
      <div
        className={cn(
          "relative z-20 flex h-full w-0 shrink-0 items-stretch",
          className,
        )}
      >
        <button
          type="button"
          onClick={openLibrary}
          title="打开素材库"
          className="btn-press absolute left-3 top-3 z-20 inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/[0.06] bg-[#121214]/95 px-2.5 text-xs font-medium text-white/85 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur transition-[border-color,background-color,transform] duration-press ease-de-out hover:border-white/15 hover:bg-[#1a1a1c]"
        >
          <PanelLeft size={14} />
          素材库
        </button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-72 min-w-72 flex-col border-r border-white/[0.04] bg-[#0a0a0a] text-white/90",
        "transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        className,
      )}
    >
      {/* Header — 图1 */}
      <div className="flex items-center gap-1 px-2.5 pb-2 pt-3">
        <button
          type="button"
          onClick={() => setLibraryOpen(false)}
          className="btn-press grid size-8 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/[0.06] hover:text-white"
          title="关闭素材库"
          aria-label="关闭素材库"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-white">
          素材库
        </h2>
        <Link
          href={assetsLibraryHref}
          className="btn-press grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-white/80 hover:bg-white/[0.08] hover:text-white"
          title="前往资产库"
        >
          <Plus size={16} strokeWidth={2.25} />
        </Link>
      </div>

      {/* 素材 / 大纲 */}
      <div className="px-3">
        <div
          role="tablist"
          aria-orientation="horizontal"
          className="flex h-8 w-full items-center gap-1 rounded-lg bg-white/[0.04] p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "assets"}
            onClick={() => setTab("assets")}
            className={cn(
              "btn-press relative flex h-full flex-1 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors duration-press ease-de-out",
              tab === "assets" ? "bg-white/[0.1] text-white" : "text-white/45 hover:text-white/75",
            )}
          >
            素材
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "outline"}
            onClick={() => setTab("outline")}
            className={cn(
              "btn-press relative flex h-full flex-1 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors duration-press ease-de-out",
              tab === "outline" ? "bg-white/[0.1] text-white" : "text-white/45 hover:text-white/75",
            )}
          >
            大纲
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "assets" ? (
          <div className="flex min-h-0 flex-1 flex-col outline-none" role="tabpanel">
            {readOnly ? (
              <p className="px-4 py-3 text-xs leading-6 text-white/40">
                只读模式下素材拖放已禁用，可使用「克隆项目」复制后编辑。
              </p>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-2 pt-3">
                <label className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-white/45 focus-within:border-white/15">
                  <Search size={14} className="shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索"
                    className="min-w-0 flex-1 border-0 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
                  />
                </label>

                {/* 收藏 — 现有无收藏数据，仅保留分区壳 */}
                <div className="mt-4 flex items-center gap-2 px-0.5">
                  <Star size={13} className="text-white/40" />
                  <span className="text-xs font-medium text-white/55">收藏</span>
                </div>
                <div className="mt-2 h-px bg-white/[0.04]" />

                <p className="mb-1.5 mt-3 px-0.5 text-[11px] font-medium text-white/40">文件夹</p>
                <div className="flex flex-col gap-0.5">
                  <AssetFolder
                    title="角色"
                    open={expanded.characters}
                    onToggle={() => toggleFolder("characters")}
                    emptyText="该文件夹暂无素材"
                    isEmpty={filtered.characters.length === 0}
                  >
                    {filtered.characters.map((c) => {
                      const artifactCount =
                        (c.turnaroundImages?.filter(Boolean).length ?? 0) ||
                        (c.referenceImage || c.previewImage ? 1 : 0);
                      return (
                        <AssetListRow
                          key={c.id}
                          title={c.name || "未命名"}
                          subtitle={`${artifactCount} 个素材`}
                          thumb={c.previewImage || c.referenceImage}
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
                      );
                    })}
                  </AssetFolder>

                  <AssetFolder
                    title="地点"
                    open={expanded.locations}
                    onToggle={() => toggleFolder("locations")}
                    emptyText="该文件夹暂无素材"
                    isEmpty={filtered.locations.length === 0}
                  >
                    {filtered.locations.map((l) => {
                      const artifactCount =
                        (l.angleImages?.filter(Boolean).length ?? 0) || (l.referenceImage ? 1 : 0);
                      return (
                        <AssetListRow
                          key={l.id}
                          title={l.name || "未命名"}
                          subtitle={`${artifactCount} 个素材`}
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
                      );
                    })}
                  </AssetFolder>

                  <AssetFolder
                    title="视频"
                    open={expanded.scenes}
                    onToggle={() => toggleFolder("scenes")}
                    emptyText="该文件夹暂无素材"
                    isEmpty={filtered.scenes.length === 0}
                  >
                    {filtered.scenes.map((s) => (
                      <AssetListRow
                        key={s.id}
                        title={s.data.title || "未命名视频"}
                        subtitle={statusLabels[s.data.status] ?? s.data.status}
                        thumb={s.data.firstFrameRef}
                        onDragStart={(dt) =>
                          setDramaAssetDragData(dt, {
                            kind: "video",
                            title: s.data.title,
                            prompt: s.data.prompt,
                            videoUrl: s.data.videoUrl,
                            poster: s.data.firstFrameRef,
                            nodeId: s.id,
                          })
                        }
                      />
                    ))}
                  </AssetFolder>

                  <AssetFolder
                    title="交互"
                    open={expanded.interactions}
                    onToggle={() => toggleFolder("interactions")}
                    emptyText="该文件夹暂无素材"
                    isEmpty={filtered.interactions.length === 0}
                  >
                    {filtered.interactions.map((n) => (
                      <AssetListRow
                        key={n.id}
                        title={n.data.title || "未命名交互"}
                        subtitle={`${n.data.options.length} 个选项`}
                        onDragStart={(dt) =>
                          setDramaAssetDragData(dt, {
                            kind: "interaction",
                            title: n.data.title,
                            instruction: n.data.instruction,
                            prompt: n.data.instruction,
                            nodeId: n.id,
                          })
                        }
                      />
                    ))}
                  </AssetFolder>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col outline-none" role="tabpanel">
            <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-3">
              <ul className="flex flex-col">
                {outlineMain.map((episode, index) => {
                  const epNodes = nodes.filter((n) => n.data.episodeId === episode.id);
                  const next = outlineMain[index + 1];
                  const showDivider =
                    !next || episodeLabelGroupKey(episode) !== episodeLabelGroupKey(next);
                  return (
                    <li key={episode.id}>
                      <EpisodeOutlineRow
                        episode={episode}
                        nodeCount={epNodes.length}
                        active={episode.id === selectedEpisodeId && !selectedNodeId}
                        showDivider={showDivider}
                        onSelect={() => requestCanvasFocus("episode", episode.id)}
                        onDelete={readOnly ? undefined : () => deleteEpisode(episode.id)}
                      />
                    </li>
                  );
                })}
              </ul>

              {unconnected.length > 0 && (
                <div className="mt-3">
                  <p className="px-2 pb-1.5 text-[11px] font-semibold text-white/40">未连接</p>
                  <ul className="flex flex-col">
                    {unconnected.map((episode, index) => {
                      const epNodes = nodes.filter((n) => n.data.episodeId === episode.id);
                      const next = unconnected[index + 1];
                      const showDivider =
                        !next || episodeLabelGroupKey(episode) !== episodeLabelGroupKey(next);
                      return (
                        <li key={episode.id}>
                          <EpisodeOutlineRow
                            episode={episode}
                            nodeCount={epNodes.length}
                            active={episode.id === selectedEpisodeId && !selectedNodeId}
                            showDivider={showDivider}
                            onSelect={() => requestCanvasFocus("episode", episode.id)}
                            onDelete={readOnly ? undefined : () => deleteEpisode(episode.id)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {connected.length === 0 && unconnected.length === 0 && (
                <p className="px-2 py-3 text-[11px] text-white/35">暂无剧集</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer — 既有能力保留 */}
      <div className="flex flex-col border-t border-white/[0.04] pt-1">
        <SectionLabel>剧本</SectionLabel>
        <div className="flex flex-col gap-2 px-4 pb-3">
          <button
            type="button"
            onClick={() => {
              setScriptDraft(setupDraft.script);
              setScriptOpen(true);
            }}
            className="btn-press inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-sm font-medium text-white/85 transition-colors duration-press ease-de-out hover:bg-white/[0.08]"
          >
            <FileText size={14} />
            查看完整剧本
          </button>
        </div>

        <div className="mx-4 my-2 h-px bg-white/[0.04]" />

        <SectionLabel>世界资产</SectionLabel>
        <div className="flex flex-col gap-2 px-4 pb-3">
          <p className="text-[11px] leading-snug text-white/40">
            拖拽素材到画布；完整管理请到资产库的角色 / 地点 / 交互。
          </p>
          <Link
            href={assetsLibraryHref}
            className="btn-cta btn-press inline-flex h-8 w-full items-center justify-between gap-1.5 rounded-lg px-3 text-sm font-medium"
          >
            前往资产库
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {scriptOpen && (
        <div className={MODAL_OVERLAY}>
          <div className={cn(MODAL_PANEL, "flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl p-5")}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink-strong">剧本与拆解</h2>
              <button
                type="button"
                onClick={() => setScriptOpen(false)}
                className="rounded-lg p-1 text-ink-muted hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              value={scriptDraft}
              onChange={(e) => setScriptDraft(e.target.value)}
              className="mt-4 min-h-[220px] flex-1 rounded-2xl border border-card-border bg-panel px-4 py-3 text-sm text-ink-strong outline-none"
              placeholder="粘贴完整剧本…"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleScriptAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 rounded-xl border border-card-border px-4 py-2 text-sm text-ink-strong hover:bg-white/8"
              >
                {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                分析剧本
              </button>
              <button
                type="button"
                onClick={applyAnalysis}
                disabled={!analysisResult}
                className="btn-cta btn-press inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                <Check size={14} /> 应用到故事图
              </button>
            </div>
            {analysisResult && (
              <p className="mt-3 text-xs text-ink-muted">
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

function AssetFolder({
  title,
  open,
  onToggle,
  emptyText,
  isEmpty,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  emptyText: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl">
      <button
        type="button"
        onClick={onToggle}
        className="btn-press flex w-full items-center gap-2 rounded-xl px-1.5 py-2 text-left hover:bg-white/[0.04]"
      >
        {open ? (
          <ChevronDown size={14} className="shrink-0 text-white/40" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-white/40" />
        )}
        <Folder size={15} className="shrink-0 text-white/55" />
        <span className="truncate text-[13px] font-semibold text-white">{title}</span>
      </button>
      {open && (
        <div className="pb-1 pl-1">
          {isEmpty ? (
            <p className="px-2 py-1.5 pl-8 text-[11px] leading-relaxed text-white/35">{emptyText}</p>
          ) : (
            <ul className="flex flex-col gap-0.5 pl-6">{children}</ul>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] leading-none text-white/40">
        {children}
      </p>
    </div>
  );
}

function AssetListRow({
  title,
  subtitle,
  thumb,
  onDragStart,
}: {
  title: string;
  subtitle: string;
  thumb?: string;
  onDragStart: (dt: DataTransfer) => void;
}) {
  return (
    <li>
      <button
        type="button"
        draggable
        title={title}
        onDragStart={(e) => onDragStart(e.dataTransfer)}
        className="btn-press inline-flex h-auto w-full cursor-grab items-center justify-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-press ease-de-out hover:bg-white/[0.06] active:cursor-grabbing"
      >
        <div className="size-7 shrink-0 overflow-hidden rounded-md border border-white/[0.06] bg-white/[0.03]">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[11px] font-medium text-white/90">{title}</span>
          <span className="truncate text-[11px] tabular-nums text-white/40">{subtitle}</span>
        </div>
      </button>
    </li>
  );
}

function EpisodeOutlineRow({
  episode,
  nodeCount,
  active,
  showDivider,
  onSelect,
  onDelete,
}: {
  episode: Episode;
  nodeCount: number;
  active: boolean;
  showDivider?: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg px-2 py-2 transition-colors duration-press ease-de-out",
          active ? "bg-white/[0.1]" : "hover:bg-white/[0.05]",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title="定位到画布"
        >
          {episode.highlight && (
            <Star
              size={11}
              className={cn(
                "shrink-0",
                active ? "fill-white text-white" : "fill-white/50 text-white/50",
              )}
            />
          )}
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              active ? "bg-white/15 text-white" : "bg-white/[0.08] text-white/70",
            )}
          >
            {episodeDisplayLabel(episode)}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[12px] font-medium",
              active ? "text-white" : "text-white/85",
            )}
          >
            {episode.title || "未命名剧集"}
          </span>
          <span
            className={cn(
              "shrink-0 text-[10px] tabular-nums",
              active ? "text-white/70" : "text-white/40",
            )}
          >
            {nodeCount} 个节点
          </span>
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={cn(
              "rounded p-1 opacity-0 transition group-hover:opacity-100",
              active
                ? "text-white/70 hover:bg-white/15 hover:text-white"
                : "text-ink-muted hover:bg-white/10 hover:text-red-300",
            )}
            title="删除剧集"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      {showDivider && <div className="mx-2 my-1 h-px bg-white/[0.04]" />}
    </div>
  );
}
